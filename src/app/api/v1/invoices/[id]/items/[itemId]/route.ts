import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/api-response";
import { updateInvoiceItemSchema } from "@/lib/validations";
import type { JwtPayload } from "@/lib/auth";

/**
 * Recalculate invoice subtotal and total from its items.
 */
async function recalculateInvoiceTotals(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return;

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
}

/**
 * Parse invoice ID and item ID from URL path.
 * Expected format: /api/v1/invoices/:id/items/:itemId
 */
function parseIds(pathname: string) {
  const segments = pathname.split("/");
  const itemsIdx = segments.indexOf("items");
  return {
    invoiceId: segments[itemsIdx - 1],
    itemId: segments[itemsIdx + 1],
  };
}

// PUT /api/v1/invoices/:id/items/:itemId — Update line item
export const PUT = withAuth(
  async (request: NextRequest, _payload: JwtPayload) => {
    try {
      const { invoiceId, itemId } = parseIds(request.nextUrl.pathname);

      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        return notFoundResponse("Invoice");
      }

      if (invoice.status !== "draft") {
        return errorResponse("Line items can only be modified on draft invoices", 400);
      }

      const item = await prisma.invoiceItem.findFirst({
        where: { id: itemId, invoiceId },
      });
      if (!item) {
        return notFoundResponse("Invoice item");
      }

      const body = await request.json();
      const parsed = updateInvoiceItemSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const quantity = parsed.data.quantity ?? item.quantity;
      const unitPrice = parsed.data.unitPrice ?? Number(item.unitPrice);
      const totalPrice = Math.round(quantity * unitPrice * 100) / 100;

      const updateData: Record<string, unknown> = { totalPrice };
      if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
      if (parsed.data.quantity !== undefined) updateData.quantity = parsed.data.quantity;
      if (parsed.data.unitPrice !== undefined) updateData.unitPrice = parsed.data.unitPrice;

      const updated = await prisma.invoiceItem.update({
        where: { id: itemId },
        data: updateData,
      });

      await recalculateInvoiceTotals(invoiceId);

      return successResponse(updated);
    } catch (error) {
      console.error("Update invoice item error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);

// DELETE /api/v1/invoices/:id/items/:itemId — Remove line item
export const DELETE = withAuth(
  async (request: NextRequest, _payload: JwtPayload) => {
    try {
      const { invoiceId, itemId } = parseIds(request.nextUrl.pathname);

      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        return notFoundResponse("Invoice");
      }

      if (invoice.status !== "draft") {
        return errorResponse("Line items can only be removed from draft invoices", 400);
      }

      const item = await prisma.invoiceItem.findFirst({
        where: { id: itemId, invoiceId },
      });
      if (!item) {
        return notFoundResponse("Invoice item");
      }

      // Ensure at least one item remains
      const itemCount = await prisma.invoiceItem.count({ where: { invoiceId } });
      if (itemCount <= 1) {
        return errorResponse("Cannot remove the last line item. An invoice must have at least one item.", 400);
      }

      await prisma.invoiceItem.delete({ where: { id: itemId } });

      await recalculateInvoiceTotals(invoiceId);

      return successResponse({ message: "Item removed successfully" });
    } catch (error) {
      console.error("Delete invoice item error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
