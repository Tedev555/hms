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
import { Prisma } from "@prisma/client";

// GET /api/v1/appointments — List appointments with filters
export const GET = withAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const where: Prisma.AppointmentWhereInput = {};

    // Filter params
    const status = searchParams.get("status");
    const doctorId = searchParams.get("doctorId");
    const patientId = searchParams.get("patientId");
    const departmentId = searchParams.get("departmentId");
    const type = searchParams.get("type");
    const date = searchParams.get("date");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (status) where.status = status as Prisma.AppointmentWhereInput["status"];
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (departmentId) where.departmentId = departmentId;
    if (type) where.type = type as Prisma.AppointmentWhereInput["type"];

    // Date filtering
    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      where.scheduledAt = { gte: dayStart, lt: dayEnd };
    } else if (dateFrom || dateTo) {
      const scheduledAt: Prisma.DateTimeFilter = {};
      if (dateFrom) scheduledAt.gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        scheduledAt.lt = endDate;
      }
      where.scheduledAt = scheduledAt;
    }

    // Role-based visibility: doctors and nurses see only their department
    if (payload.role === "doctor") {
      where.OR = [
        { doctorId: payload.userId },
        ...(payload.departmentId ? [{ departmentId: payload.departmentId }] : []),
      ];
    } else if (payload.role === "nurse") {
      if (payload.departmentId) {
        where.departmentId = payload.departmentId;
      }
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
          department: { select: { id: true, name: true } },
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

      const { patientId, doctorId, scheduledAt: scheduledAtStr, duration, type, ...rest } = parsed.data;

      const scheduledAt = new Date(scheduledAtStr);

      // Prevent booking in the past (except emergency)
      if (type !== "emergency" && scheduledAt < new Date()) {
        return errorResponse("Cannot book appointments in the past", 400);
      }

      // Verify patient exists
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) {
        return errorResponse("Patient not found", 404);
      }

      // Verify doctor exists and is a doctor
      const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
      if (!doctor || doctor.role !== "doctor") {
        return errorResponse("Doctor not found", 404);
      }

      // Verify doctor is active
      if (!doctor.isActive) {
        return errorResponse("Doctor is currently unavailable", 400);
      }

      // Conflict prevention: check for overlapping appointments
      const appointmentEnd = new Date(scheduledAt.getTime() + (duration ?? 15) * 60000);
      const conflict = await prisma.appointment.findFirst({
        where: {
          doctorId,
          status: { notIn: ["cancelled", "no_show"] },
          AND: [
            {
              scheduledAt: { lt: appointmentEnd },
            },
            {
              scheduledAt: {
                gte: new Date(scheduledAt.getTime() - (duration ?? 15) * 60000),
              },
            },
          ],
        },
      });

      if (conflict) {
        // More precise overlap check using duration
        const conflictEnd = new Date(conflict.scheduledAt.getTime() + conflict.duration * 60000);
        if (scheduledAt < conflictEnd && appointmentEnd > conflict.scheduledAt) {
          return errorResponse("Time slot is not available. Doctor already has an appointment at this time.", 409);
        }
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
          ...rest,
          patientId,
          doctorId,
          scheduledAt,
          duration: duration ?? 15,
          type,
          appointmentCode: generateCode("APT", sequence),
        },
        include: {
          patient: { select: { id: true, patientCode: true, firstName: true, lastName: true } },
          doctor: { select: { id: true, firstName: true, lastName: true } },
          department: { select: { id: true, name: true } },
        },
      });

      return successResponse(appointment, 201);
    } catch (error) {
      console.error("Create appointment error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
