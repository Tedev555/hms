import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { updateInvoiceStatusSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// Valid status transitions per BR-4.2
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["issued", "cancelled"],
  issued: ["partially_paid", "overdue", "cancelled"],
  partially_paid: ["paid", "overdue"],
  overdue: ["partially_paid", "paid"],
  paid: [],
  cancelled: [],
};

// PATCH /api/v1/invoices/:id/status — Change invoice status
export const PATCH = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      const segments = request.nextUrl.pathname.split("/");
      const statusIdx = segments.lastIndexOf("status");
      const id = segments[statusIdx - 1];

      const existing = await prisma.invoice.findUnique({ where: { id } });
      if (!existing) {
        return notFoundResponse("Invoice");
      }

      const body = await request.json();
      const parsed = updateInvoiceStatusSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const { status: newStatus, notes } = parsed.data;

      // Validate status transition
      const allowedTransitions = VALID_TRANSITIONS[existing.status];
      if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
        return errorResponse(
          `Invalid status transition from '${existing.status}' to '${newStatus}'`,
          400,
        );
      }

      // Only admin can cancel invoices
      if (newStatus === "cancelled" && payload.role !== "admin") {
        return errorResponse("Only admin can cancel invoices", 403);
      }

      const updateData: Record<string, unknown> = { status: newStatus };
      if (notes) updateData.notes = notes;

      // When issuing, set the issue date
      if (newStatus === "issued") {
        updateData.issueDate = new Date();
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              firstName: true,
              lastName: true,
            },
          },
          items: true,
        },
      });

      await createAuditLog({
        userId: payload.userId,
        action: "STATUS_CHANGE",
        entity: "Invoice",
        entityId: invoice.id,
        oldData: { status: existing.status },
        newData: { status: newStatus },
      });

      return successResponse(invoice);
    } catch (error) {
      console.error("Update invoice status error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
