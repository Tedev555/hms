import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/prescriptions/:id — Get prescription detail
export const GET = withAuth(
  async (
    _request: NextRequest,
    _payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;
      const prescription = await prisma.prescription.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              patientCode: true,
              allergies: true,
            },
          },
          doctor: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              drug: {
                select: {
                  id: true,
                  genericName: true,
                  brandName: true,
                  formulation: true,
                  strength: true,
                  unit: true,
                  currentStock: true,
                  isControlled: true,
                },
              },
            },
          },
        },
      });

      if (!prescription) {
        return notFoundResponse("Prescription");
      }

      return successResponse(prescription);
    } catch (error) {
      console.error("Get prescription error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["doctor", "pharmacist", "nurse"],
);
