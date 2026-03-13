import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/api-response";
import { createPatientDocumentSchema } from "@/lib/validations";
import { parsePagination } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/patients/:id/documents — List patient documents
export const GET = withAuth(
  async (
    request: NextRequest,
    _payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;
      const patient = await prisma.patient.findUnique({ where: { id } });
      if (!patient) {
        return notFoundResponse("Patient");
      }

      const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

      const [documents, total] = await Promise.all([
        prisma.patientDocument.findMany({
          where: { patientId: id },
          skip,
          take: limit,
          orderBy: { uploadedAt: "desc" },
        }),
        prisma.patientDocument.count({ where: { patientId: id } }),
      ]);

      return paginatedResponse(documents, total, page, limit);
    } catch (error) {
      console.error("List patient documents error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
);

// POST /api/v1/patients/:id/documents — Upload document metadata
export const POST = withAuth(
  async (
    request: NextRequest,
    payload: JwtPayload,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;
      const patient = await prisma.patient.findUnique({ where: { id } });
      if (!patient) {
        return notFoundResponse("Patient");
      }

      const body = await request.json();
      const parsed = createPatientDocumentSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const document = await prisma.patientDocument.create({
        data: {
          ...parsed.data,
          patientId: id,
        },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "CREATE",
        entity: "PatientDocument",
        entityId: document.id,
        newData: document,
      });

      return successResponse(document, 201);
    } catch (error) {
      console.error("Create patient document error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
