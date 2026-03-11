import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import {
  successResponse,
  paginatedResponse,
  errorResponse,
} from "@/lib/api-response";
import { createAppointmentSchema } from "@/lib/validations";
import { parsePagination, generateCode } from "@/lib/utils";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/appointments — List appointments
export const GET = withAuth(async (request: NextRequest, _payload: JwtPayload) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const where: Record<string, unknown> = {};
    const status = searchParams.get("status");
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");

    if (status) where.status = status;
    if (doctorId) where.doctorId = doctorId;
    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      where.scheduledAt = { gte: dayStart, lt: dayEnd };
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
        include: {
          patient: { select: { id: true, patientCode: true, firstName: true, lastName: true } },
          doctor: { select: { id: true, firstName: true, lastName: true } },
          department: { select: { name: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return paginatedResponse(appointments, total, page, limit);
  } catch (error) {
    console.error("List appointments error:", error);
    return errorResponse("Internal server error", 500);
  }
});

// POST /api/v1/appointments — Create appointment
export const POST = withAuth(
  async (request: NextRequest, _payload: JwtPayload) => {
    try {
      const body = await request.json();
      const parsed = createAppointmentSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      // Generate appointment code
      const lastAppointment = await prisma.appointment.findFirst({
        orderBy: { createdAt: "desc" },
        select: { appointmentCode: true },
      });
      const sequence = lastAppointment
        ? parseInt(lastAppointment.appointmentCode.split("-")[1], 10) + 1
        : 1;

      const appointment = await prisma.appointment.create({
        data: {
          ...parsed.data,
          scheduledAt: new Date(parsed.data.scheduledAt),
          appointmentCode: generateCode("APT", sequence),
        },
        include: {
          patient: { select: { id: true, patientCode: true, firstName: true, lastName: true } },
          doctor: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return successResponse(appointment, 201);
    } catch (error) {
      console.error("Create appointment error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin", "doctor", "director"],
);
