import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, paginatedResponse, errorResponse } from "@/lib/api-response";
import { createPrescriptionSchema } from "@/lib/validations";
import { parsePagination } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

// GET /api/v1/prescriptions — List prescriptions with filters
export const GET = withAuth(
  async (request: NextRequest, _payload: JwtPayload) => {
    try {
      const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
      const patientId = request.nextUrl.searchParams.get("patientId");
      const doctorId = request.nextUrl.searchParams.get("doctorId");
      const status = request.nextUrl.searchParams.get("status"); // pending, dispensed, all

      const where: Prisma.PrescriptionWhereInput = {};

      if (patientId) where.patientId = patientId;
      if (doctorId) where.doctorId = doctorId;

      if (status === "pending") {
        where.items = { some: { isDispensed: false } };
      } else if (status === "dispensed") {
        where.items = { every: { isDispensed: true } };
      }

      const [prescriptions, total] = await Promise.all([
        prisma.prescription.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            patient: {
              select: { id: true, firstName: true, lastName: true, patientCode: true },
            },
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
        prisma.prescription.count({ where }),
      ]);

      return paginatedResponse(prescriptions, total, page, limit);
    } catch (error) {
      console.error("List prescriptions error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["doctor", "pharmacist", "nurse"],
);

// POST /api/v1/prescriptions — Create a prescription
export const POST = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      const body = await request.json();
      const parsed = createPrescriptionSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      // Verify patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: parsed.data.patientId },
        select: { id: true },
      });
      if (!patient) {
        return errorResponse("Patient not found", 404);
      }

      // Verify all drugs exist and are active
      const drugIds = parsed.data.items.map((item) => item.drugId);
      const drugs = await prisma.drug.findMany({
        where: { id: { in: drugIds }, isActive: true },
        select: { id: true },
      });
      if (drugs.length !== drugIds.length) {
        return errorResponse("One or more drugs not found or inactive", 400);
      }

      const prescription = await prisma.prescription.create({
        data: {
          patientId: parsed.data.patientId,
          doctorId: payload.userId,
          diagnosis: parsed.data.diagnosis,
          notes: parsed.data.notes,
          items: {
            create: parsed.data.items.map((item) => ({
              drugId: item.drugId,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              quantity: item.quantity,
              instructions: item.instructions,
            })),
          },
        },
        include: {
          items: {
            include: {
              drug: { select: { id: true, genericName: true, brandName: true } },
            },
          },
        },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "CREATE",
        entity: "Prescription",
        entityId: prescription.id,
        newData: prescription,
      });

      return successResponse(prescription, 201);
    } catch (error) {
      console.error("Create prescription error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["doctor"],
);
