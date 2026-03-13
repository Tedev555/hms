import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { JwtPayload } from "@/lib/auth";

const AVG_CONSULTATION_MINUTES = 15;

// GET /api/v1/appointments/queue — Get current queue grouped by doctor
export const GET = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const doctorId = searchParams.get("doctorId");
      const departmentId = searchParams.get("departmentId");

      // Today's date range
      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(now);
      dayEnd.setHours(23, 59, 59, 999);

      const where: Record<string, unknown> = {
        scheduledAt: { gte: dayStart, lte: dayEnd },
        status: { in: ["checked_in", "in_progress"] },
      };

      if (doctorId) where.doctorId = doctorId;
      if (departmentId) where.departmentId = departmentId;

      // Role-based: doctors see only their own queue, nurses see department
      if (payload.role === "doctor") {
        where.doctorId = payload.userId;
      } else if (payload.role === "nurse" && payload.departmentId) {
        where.departmentId = payload.departmentId;
      }

      const queueAppointments = await prisma.appointment.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              firstName: true,
              lastName: true,
            },
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          department: { select: { id: true, name: true } },
        },
      });

      // Group by doctor
      const grouped: Record<
        string,
        {
          doctor: { id: string; firstName: string; lastName: string };
          department: { id: string; name: string } | null;
          inProgress: (typeof queueAppointments)[number] | null;
          waiting: ((typeof queueAppointments)[number] & { estimatedWaitMinutes: number })[];
          totalWaiting: number;
        }
      > = {};

      for (const apt of queueAppointments) {
        const dId = apt.doctorId;
        if (!grouped[dId]) {
          grouped[dId] = {
            doctor: apt.doctor,
            department: apt.department,
            inProgress: null,
            waiting: [],
            totalWaiting: 0,
          };
        }

        if (apt.status === "in_progress") {
          grouped[dId].inProgress = apt;
        } else {
          grouped[dId].waiting.push({
            ...apt,
            estimatedWaitMinutes: 0,
          });
          grouped[dId].totalWaiting++;
        }
      }

      // Calculate estimated wait times
      for (const group of Object.values(grouped)) {
        let waitOffset = group.inProgress ? AVG_CONSULTATION_MINUTES : 0;
        for (const waiting of group.waiting) {
          waiting.estimatedWaitMinutes = waitOffset;
          waitOffset += AVG_CONSULTATION_MINUTES;
        }
      }

      return successResponse({
        queue: Object.values(grouped),
        generatedAt: now.toISOString(),
      });
    } catch (error) {
      console.error("Get queue error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin", "doctor", "nurse"],
);
