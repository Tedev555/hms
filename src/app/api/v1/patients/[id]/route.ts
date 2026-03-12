import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/api-response";
import { updatePatientSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/patients/:id — Get patient details
export const GET = withAuth(
  async (request: NextRequest, _payload: JwtPayload, { params }: { params: { id: string } }) => {
    try {
      const { id } = await params;
      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          emergencyContacts: true,
          medicalHistory: {
            orderBy: { createdAt: "desc" },
          },
          documents: {
            orderBy: { uploadedAt: "desc" },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      if (!patient) {
        return notFoundResponse("Patient");
      }

      return successResponse(patient);
    } catch (error) {
      console.error("Get patient error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
);

// PUT /api/v1/patients/:id — Update patient record
export const PUT = withAuth(
  async (request: NextRequest, payload: JwtPayload, { params }: { params: { id: string } }) => {
    try {
      const { id } = await params;
      const existing = await prisma.patient.findUnique({ where: { id } });
      if (!existing) {
        return notFoundResponse("Patient");
      }

      const body = await request.json();
      const parsed = updatePatientSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      // Check for duplicate nationalId if being updated
      if (parsed.data.nationalId && parsed.data.nationalId !== existing.nationalId) {
        const duplicate = await prisma.patient.findUnique({
          where: { nationalId: parsed.data.nationalId },
        });
        if (duplicate) {
          return errorResponse("National ID already exists", 409);
        }
      }

      const patient = await prisma.patient.update({
        where: { id },
        data: {
          ...parsed.data,
          dateOfBirth: parsed.data.dateOfBirth
            ? new Date(parsed.data.dateOfBirth)
            : undefined,
        },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "UPDATE",
        entity: "Patient",
        entityId: id,
        oldData: existing,
        newData: patient,
      });

      return successResponse(patient);
    } catch (error) {
      console.error("Update patient error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
