import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { updateAppointmentSchema } from "@/lib/validations";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/appointments/:id — Get appointment details
export const GET = withAuth(
  async (
    request: NextRequest,
    _payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              gender: true,
              phone: true,
              bloodGroup: true,
              allergies: true,
            },
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: { select: { id: true, name: true } },
            },
          },
          department: { select: { id: true, name: true } },
        },
      });

      if (!appointment) {
        return notFoundResponse("Appointment");
      }

      return successResponse(appointment);
    } catch (error) {
      console.error("Get appointment error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
);

// PUT /api/v1/appointments/:id — Update/reschedule appointment
export const PUT = withAuth(
  async (
    request: NextRequest,
    _payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;

      const existing = await prisma.appointment.findUnique({ where: { id } });
      if (!existing) {
        return notFoundResponse("Appointment");
      }

      // Only scheduled or confirmed appointments can be rescheduled
      if (!["scheduled", "confirmed"].includes(existing.status)) {
        return errorResponse(
          `Cannot update appointment with status '${existing.status}'. Only scheduled or confirmed appointments can be updated.`,
          400,
        );
      }

      const body = await request.json();
      const parsed = updateAppointmentSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const updateData: Record<string, unknown> = {};

      if (parsed.data.scheduledAt) {
        const newScheduledAt = new Date(parsed.data.scheduledAt);

        // Prevent rescheduling to a past date
        if (newScheduledAt < new Date()) {
          return errorResponse("Cannot reschedule to a past date", 400);
        }

        const duration = parsed.data.duration ?? existing.duration;
        const appointmentEnd = new Date(newScheduledAt.getTime() + duration * 60000);

        // Check for conflicts at the new time
        const conflict = await prisma.appointment.findFirst({
          where: {
            id: { not: id },
            doctorId: existing.doctorId,
            status: { notIn: ["cancelled", "no_show"] },
            scheduledAt: { lt: appointmentEnd },
            AND: {
              scheduledAt: {
                gte: new Date(newScheduledAt.getTime() - duration * 60000),
              },
            },
          },
        });

        if (conflict) {
          const conflictEnd = new Date(conflict.scheduledAt.getTime() + conflict.duration * 60000);
          if (newScheduledAt < conflictEnd && appointmentEnd > conflict.scheduledAt) {
            return errorResponse(
              "Time slot is not available. Doctor already has an appointment at this time.",
              409,
            );
          }
        }

        updateData.scheduledAt = newScheduledAt;
      }

      if (parsed.data.duration !== undefined) updateData.duration = parsed.data.duration;
      if (parsed.data.departmentId !== undefined)
        updateData.departmentId = parsed.data.departmentId;
      if (parsed.data.chiefComplaint !== undefined)
        updateData.chiefComplaint = parsed.data.chiefComplaint;
      if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

      const appointment = await prisma.appointment.update({
        where: { id },
        data: updateData,
        include: {
          patient: { select: { id: true, patientCode: true, firstName: true, lastName: true } },
          doctor: { select: { id: true, firstName: true, lastName: true } },
          department: { select: { id: true, name: true } },
        },
      });

      return successResponse(appointment);
    } catch (error) {
      console.error("Update appointment error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
