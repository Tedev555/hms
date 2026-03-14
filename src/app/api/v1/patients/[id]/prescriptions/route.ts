import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { paginatedResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { parsePagination } from "@/lib/utils";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/patients/:id/prescriptions — Patient prescription history
export const GET = withAuth(
  async (
    request: NextRequest,
    _payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;
      const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

      const patient = await prisma.patient.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!patient) {
        return notFoundResponse("Patient");
      }

      const [prescriptions, total] = await Promise.all([
        prisma.prescription.findMany({
          where: { patientId: id },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            doctor: {
              select: { id: true, firstName: true, lastName: true },
            },
            items: {
              include: {
                drug: {
                  select: { id: true, genericName: true, brandName: true },
                },
              },
            },
          },
        }),
        prisma.prescription.count({ where: { patientId: id } }),
      ]);

      return paginatedResponse(prescriptions, total, page, limit);
    } catch (error) {
      console.error("Patient prescriptions error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["doctor", "pharmacist", "nurse"],
);
