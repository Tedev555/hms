import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { JwtPayload } from "@/lib/auth";

const DEFAULT_SLOT_DURATION = 15; // minutes
const DAY_START_HOUR = 8; // 08:00
const DAY_END_HOUR = 17; // 17:00

// GET /api/v1/appointments/slots — Get available slots for a doctor on a date
export const GET = withAuth(
  async (request: NextRequest, _payload: JwtPayload) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const doctorId = searchParams.get("doctorId");
      const date = searchParams.get("date");
      const durationParam = searchParams.get("duration");

      if (!doctorId || !date) {
        return errorResponse("doctorId and date are required query parameters", 400);
      }

      // Verify doctor exists and is active
      const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
      if (!doctor || doctor.role !== "doctor") {
        return errorResponse("Doctor not found", 404);
      }
      if (!doctor.isActive) {
        return errorResponse("Doctor is currently unavailable", 400);
      }

      const slotDuration = durationParam ? parseInt(durationParam, 10) : DEFAULT_SLOT_DURATION;
      if (isNaN(slotDuration) || slotDuration < 5 || slotDuration > 120) {
        return errorResponse("Duration must be between 5 and 120 minutes", 400);
      }

      // Get all non-cancelled appointments for this doctor on this date
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);

      const existingAppointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          scheduledAt: { gte: dayStart, lte: dayEnd },
          status: { notIn: ["cancelled", "no_show"] },
        },
        select: { scheduledAt: true, duration: true },
        orderBy: { scheduledAt: "asc" },
      });

      // Generate all possible slots for the day
      const slots: { start: string; end: string; available: boolean }[] = [];
      const baseDate = new Date(`${date}T00:00:00.000Z`);

      for (let hour = DAY_START_HOUR; hour < DAY_END_HOUR; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const slotStart = new Date(baseDate);
          slotStart.setUTCHours(hour, minute, 0, 0);

          const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

          // Don't go past end of day
          const endOfDay = new Date(baseDate);
          endOfDay.setUTCHours(DAY_END_HOUR, 0, 0, 0);
          if (slotEnd > endOfDay) break;

          // Check if this slot overlaps with any existing appointment
          const isOccupied = existingAppointments.some((apt) => {
            const aptEnd = new Date(apt.scheduledAt.getTime() + apt.duration * 60000);
            return slotStart < aptEnd && slotEnd > apt.scheduledAt;
          });

          const startStr = `${String(slotStart.getUTCHours()).padStart(2, "0")}:${String(slotStart.getUTCMinutes()).padStart(2, "0")}`;
          const endStr = `${String(slotEnd.getUTCHours()).padStart(2, "0")}:${String(slotEnd.getUTCMinutes()).padStart(2, "0")}`;

          slots.push({
            start: startStr,
            end: endStr,
            available: !isOccupied,
          });
        }
      }

      return successResponse({
        doctorId,
        date,
        slotDuration,
        slots,
      });
    } catch (error) {
      console.error("Get slots error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
