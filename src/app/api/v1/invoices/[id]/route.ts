import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/api-response";
import { updateInvoiceSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/invoices/:id — Get invoice details with items and payments
export const GET = withAuth(
  async (request: NextRequest, _payload: JwtPayload) => {
    try {
      const id = request.nextUrl.pathname.split("/").pop()!;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              address: true,
            },
          },
          appointment: {
            select: {
              id: true,
              appointmentCode: true,
              scheduledAt: true,
              type: true,
            },
          },
          items: true,
          payments: { orderBy: { paidAt: "desc" } },
        },
      });

      if (!invoice) {
        return notFoundResponse("Invoice");
      }

      return successResponse(invoice);
    } catch (error) {
      console.error("Get invoice error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
);

// PUT /api/v1/invoices/:id — Update draft invoice
export const PUT = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      const id = request.nextUrl.pathname.split("/").pop()!;

      const existing = await prisma.invoice.findUnique({ where: { id } });
      if (!existing) {
        return notFoundResponse("Invoice");
      }

      if (existing.status !== "draft") {
        return errorResponse(
          "Only draft invoices can be updated. Use credit notes for issued invoices.",
          400,
        );
      }

      const body = await request.json();
      const parsed = updateInvoiceSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const updateData: Record<string, unknown> = {};

      if (parsed.data.dueDate !== undefined) {
        updateData.dueDate = new Date(parsed.data.dueDate);
      }
      if (parsed.data.notes !== undefined) {
        updateData.notes = parsed.data.notes;
      }

      // Handle discount and tax updates — recalculate total
      if (parsed.data.discountAmount !== undefined || parsed.data.taxAmount !== undefined) {
        const discountAmount = parsed.data.discountAmount ?? Number(existing.discountAmount);
        const taxAmount = parsed.data.taxAmount ?? Number(existing.taxAmount);
        const subtotal = Number(existing.subtotal);

        if (discountAmount > subtotal) {
          return errorResponse("Discount amount cannot exceed subtotal", 400);
        }

        const totalAmount = Math.round((subtotal - discountAmount + taxAmount) * 100) / 100;

        updateData.discountAmount = discountAmount;
        updateData.taxAmount = taxAmount;
        updateData.totalAmount = totalAmount;
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
        action: "UPDATE",
        entity: "Invoice",
        entityId: invoice.id,
        oldData: existing,
        newData: invoice,
      });

      return successResponse(invoice);
    } catch (error) {
      console.error("Update invoice error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
