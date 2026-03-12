import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/api-response";
import { createMedicalHistorySchema } from "@/lib/validations";
import { parsePagination } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/patients/:id/history — Get medical history
export const GET = withAuth(
  async (request: NextRequest, _payload: JwtPayload, { params }: { params: { id: string } }) => {
    try {
      const { id } = await params;
      const patient = await prisma.patient.findUnique({ where: { id } });
      if (!patient) {
        return notFoundResponse("Patient");
      }

      const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

      const [history, total] = await Promise.all([
        prisma.medicalHistory.findMany({
          where: { patientId: id },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.medicalHistory.count({ where: { patientId: id } }),
      ]);

      return paginatedResponse(history, total, page, limit);
    } catch (error) {
      console.error("Get medical history error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["doctor", "nurse", "admin"],
);

// POST /api/v1/patients/:id/history — Add medical history entry
export const POST = withAuth(
  async (request: NextRequest, payload: JwtPayload, { params }: { params: { id: string } }) => {
    try {
      const { id } = await params;
      const patient = await prisma.patient.findUnique({ where: { id } });
      if (!patient) {
        return notFoundResponse("Patient");
      }

      const body = await request.json();
      const parsed = createMedicalHistorySchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const entry = await prisma.medicalHistory.create({
        data: {
          condition: parsed.data.condition,
          description: parsed.data.description,
          isActive: parsed.data.isActive,
          diagnosedAt: parsed.data.diagnosedAt ? new Date(parsed.data.diagnosedAt) : undefined,
          patientId: id,
        },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "CREATE",
        entity: "MedicalHistory",
        entityId: entry.id,
        newData: entry,
      });

      return successResponse(entry, 201);
    } catch (error) {
      console.error("Create medical history error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["doctor"],
);
