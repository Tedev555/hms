import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { addInvoiceItemSchema } from "@/lib/validations";
import type { JwtPayload } from "@/lib/auth";

// POST /api/v1/invoices/:id/items — Add line item to draft invoice
export const POST = withAuth(
  async (request: NextRequest, _payload: JwtPayload) => {
    try {
      // Extract invoice ID: /api/v1/invoices/:id/items
      const segments = request.nextUrl.pathname.split("/");
      const itemsIdx = segments.lastIndexOf("items");
      const invoiceId = segments[itemsIdx - 1];

      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        return notFoundResponse("Invoice");
      }

      if (invoice.status !== "draft") {
        return errorResponse("Line items can only be added to draft invoices", 400);
      }

      const body = await request.json();
      const parsed = addInvoiceItemSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const { description, quantity, unitPrice } = parsed.data;
      const totalPrice = Math.round(quantity * unitPrice * 100) / 100;

      const item = await prisma.invoiceItem.create({
        data: {
          invoiceId,
          description,
          quantity,
          unitPrice,
          totalPrice,
        },
      });

      // Recalculate invoice totals
      const allItems = await prisma.invoiceItem.findMany({ where: { invoiceId } });
      const subtotal = allItems.reduce((sum, i) => sum + Number(i.totalPrice), 0);
      const roundedSubtotal = Math.round(subtotal * 100) / 100;
      const totalAmount =
        Math.round(
          (roundedSubtotal - Number(invoice.discountAmount) + Number(invoice.taxAmount)) * 100,
        ) / 100;

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { subtotal: roundedSubtotal, totalAmount },
      });

      return successResponse(item, 201);
    } catch (error) {
      console.error("Add invoice item error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
