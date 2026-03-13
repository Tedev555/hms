import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { updateEmergencyContactSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// PUT /api/v1/patients/:id/emergency-contacts/:contactId — Update emergency contact
export const PUT = withAuth(
  async (
    request: NextRequest,
    payload: JwtPayload,
    { params }: { params: { id: string; contactId: string } },
  ) => {
    try {
      const { id, contactId } = await params;
      const existing = await prisma.emergencyContact.findFirst({
        where: { id: contactId, patientId: id },
      });
      if (!existing) {
        return notFoundResponse("Emergency contact");
      }

      const body = await request.json();
      const parsed = updateEmergencyContactSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const contact = await prisma.emergencyContact.update({
        where: { id: contactId },
        data: parsed.data,
      });

      await createAuditLog({
        userId: payload.userId,
        action: "UPDATE",
        entity: "EmergencyContact",
        entityId: contactId,
        oldData: existing,
        newData: contact,
      });

      return successResponse(contact);
    } catch (error) {
      console.error("Update emergency contact error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);

// DELETE /api/v1/patients/:id/emergency-contacts/:contactId — Remove emergency contact
export const DELETE = withAuth(
  async (
    _request: NextRequest,
    payload: JwtPayload,
    { params }: { params: { id: string; contactId: string } },
  ) => {
    try {
      const { id, contactId } = await params;
      const existing = await prisma.emergencyContact.findFirst({
        where: { id: contactId, patientId: id },
      });
      if (!existing) {
        return notFoundResponse("Emergency contact");
      }

      await prisma.emergencyContact.delete({
        where: { id: contactId },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "DELETE",
        entity: "EmergencyContact",
        entityId: contactId,
        oldData: existing,
      });

      return successResponse({ message: "Emergency contact removed" });
    } catch (error) {
      console.error("Delete emergency contact error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
