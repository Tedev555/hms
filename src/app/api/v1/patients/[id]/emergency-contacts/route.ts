import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/api-response";
import { createEmergencyContactSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// POST /api/v1/patients/:id/emergency-contacts — Add emergency contact
export const POST = withAuth(
  async (request: NextRequest, payload: JwtPayload, { params }: { params: { id: string } }) => {
    try {
      const { id } = await params;
      const patient = await prisma.patient.findUnique({ where: { id } });
      if (!patient) {
        return notFoundResponse("Patient");
      }

      const body = await request.json();
      const parsed = createEmergencyContactSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const contact = await prisma.emergencyContact.create({
        data: {
          ...parsed.data,
          patientId: id,
        },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "CREATE",
        entity: "EmergencyContact",
        entityId: contact.id,
        newData: contact,
      });

      return successResponse(contact, 201);
    } catch (error) {
      console.error("Create emergency contact error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
