import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, paginatedResponse, errorResponse } from "@/lib/api-response";
import { createPatientSchema } from "@/lib/validations";
import { parsePagination, generateCode } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/patients — List patients with pagination
export const GET = withAuth(async (request: NextRequest, _payload: JwtPayload) => {
  try {
    const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          patientCode: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          phone: true,
          createdAt: true,
        },
      }),
      prisma.patient.count(),
    ]);

    return paginatedResponse(patients, total, page, limit);
  } catch (error) {
    console.error("List patients error:", error);
    return errorResponse("Internal server error", 500);
  }
});

// POST /api/v1/patients — Register new patient
export const POST = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      const body = await request.json();
      const parsed = createPatientSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      // Generate patient code
      const lastPatient = await prisma.patient.findFirst({
        orderBy: { createdAt: "desc" },
        select: { patientCode: true },
      });
      const sequence = lastPatient ? parseInt(lastPatient.patientCode.split("-")[1], 10) + 1 : 1;

      // Check for duplicate nationalId
      if (parsed.data.nationalId) {
        const duplicate = await prisma.patient.findUnique({
          where: { nationalId: parsed.data.nationalId },
        });
        if (duplicate) {
          return errorResponse("National ID already exists", 409);
        }
      }

      const patient = await prisma.patient.create({
        data: {
          ...parsed.data,
          dateOfBirth: new Date(parsed.data.dateOfBirth),
          patientCode: generateCode("PAT", sequence),
          createdById: payload.userId,
        },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "CREATE",
        entity: "Patient",
        entityId: patient.id,
        newData: patient,
      });

      return successResponse(patient, 201);
    } catch (error) {
      console.error("Create patient error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin", "director"],
);
