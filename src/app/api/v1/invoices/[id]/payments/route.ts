import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/api-response";
import { recordPaymentSchema } from "@/lib/validations";
import { parsePagination } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/invoices/:id/payments — List payments for invoice
export const GET = withAuth(
  async (request: NextRequest, _payload: JwtPayload) => {
    try {
      const segments = request.nextUrl.pathname.split("/");
      const paymentsIdx = segments.lastIndexOf("payments");
      const invoiceId = segments[paymentsIdx - 1];

      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        return notFoundResponse("Invoice");
      }

      const searchParams = request.nextUrl.searchParams;
      const { page, limit, skip } = parsePagination(searchParams);

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where: { invoiceId },
          skip,
          take: limit,
          orderBy: { paidAt: "desc" },
        }),
        prisma.payment.count({ where: { invoiceId } }),
      ]);

      return paginatedResponse(payments, total, page, limit);
    } catch (error) {
      console.error("List payments error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin", "director"],
);

// POST /api/v1/invoices/:id/payments — Record payment
export const POST = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      const segments = request.nextUrl.pathname.split("/");
      const paymentsIdx = segments.lastIndexOf("payments");
      const invoiceId = segments[paymentsIdx - 1];

      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        return notFoundResponse("Invoice");
      }

      // Can only record payments on issued or partially_paid invoices
      if (!["issued", "partially_paid", "overdue"].includes(invoice.status)) {
        return errorResponse(
          `Cannot record payment on invoice with status '${invoice.status}'. Invoice must be issued, partially paid, or overdue.`,
          400,
        );
      }

      const body = await request.json();
      const parsed = recordPaymentSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const { amount, paymentMethod, reference } = parsed.data;

      // Check for overpayment
      const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);
      if (amount > Math.round(outstanding * 100) / 100) {
        return errorResponse(
          `Payment amount (${amount}) exceeds outstanding balance (${outstanding.toFixed(2)})`,
          400,
        );
      }

      // Require reference for non-cash payments
      if (paymentMethod !== "cash" && paymentMethod !== "mixed" && !reference) {
        return errorResponse(`Payment reference is required for ${paymentMethod} payments`, 400);
      }

      const newPaidAmount = Math.round((Number(invoice.paidAmount) + amount) * 100) / 100;
      const totalAmount = Number(invoice.totalAmount);

      // Determine new invoice status
      let newStatus = invoice.status;
      if (newPaidAmount >= totalAmount) {
        newStatus = "paid";
      } else if (newPaidAmount > 0) {
        newStatus = "partially_paid";
      }

      // Create payment and update invoice in a transaction
      const [payment] = await prisma.$transaction([
        prisma.payment.create({
          data: {
            invoiceId,
            amount,
            paymentMethod,
            reference,
          },
        }),
        prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
            paymentMethod,
          },
        }),
      ]);

      await createAuditLog({
        userId: payload.userId,
        action: "PAYMENT",
        entity: "Invoice",
        entityId: invoiceId,
        newData: { paymentId: payment.id, amount, paymentMethod },
      });

      return successResponse(payment, 201);
    } catch (error) {
      console.error("Record payment error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
