import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { updateStatusSchema } from "@/lib/validations";
import type { JwtPayload } from "@/lib/auth";

// Valid status transitions per BR-3.3
const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

// Which roles can transition to which statuses
const ROLE_STATUS_PERMISSIONS: Record<string, string[]> = {
  receptionist: ["confirmed", "checked_in", "cancelled", "no_show"],
  admin: ["confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"],
  doctor: ["in_progress", "completed"],
  nurse: ["checked_in"],
};

// PATCH /api/v1/appointments/:id/status — Change appointment status
export const PATCH = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      // Extract appointment ID from URL: /api/v1/appointments/:id/status
      const segments = request.nextUrl.pathname.split("/");
      const statusIdx = segments.lastIndexOf("status");
      const id = segments[statusIdx - 1];

      const existing = await prisma.appointment.findUnique({ where: { id } });
      if (!existing) {
        return notFoundResponse("Appointment");
      }

      const body = await request.json();
      const parsed = updateStatusSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const { status: newStatus, cancelReason, notes } = parsed.data;

      // Validate status transition
      const allowedTransitions = VALID_TRANSITIONS[existing.status];
      if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
        return errorResponse(
          `Invalid status transition from '${existing.status}' to '${newStatus}'`,
          400,
        );
      }

      // Validate role permission for this status change
      const allowedStatuses = ROLE_STATUS_PERMISSIONS[payload.role];
      if (!allowedStatuses || !allowedStatuses.includes(newStatus)) {
        return errorResponse(
          `Your role '${payload.role}' is not allowed to set status to '${newStatus}'`,
          403,
        );
      }

      // Doctor can only change status on their own appointments
      if (payload.role === "doctor" && existing.doctorId !== payload.userId) {
        return errorResponse("Doctors can only update their own appointments", 403);
      }

      // Cancel reason is required when cancelling
      if (newStatus === "cancelled" && !cancelReason) {
        return errorResponse("Cancel reason is required when cancelling an appointment", 400);
      }

      const updateData: Record<string, unknown> = { status: newStatus };
      if (cancelReason) updateData.cancelReason = cancelReason;
      if (notes) updateData.notes = notes;

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
      console.error("Update appointment status error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin", "doctor", "nurse"],
);
