import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import {
  successResponse,
  paginatedResponse,
  errorResponse,
} from "@/lib/api-response";
import { createInvoiceSchema } from "@/lib/validations";
import { parsePagination, generateCode } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import type { JwtPayload } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// GET /api/v1/invoices — List invoices with filters
export const GET = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const { page, limit, skip } = parsePagination(searchParams);

      const where: Prisma.InvoiceWhereInput = {};

      const status = searchParams.get("status");
      const patientId = searchParams.get("patientId");
      const dateFrom = searchParams.get("dateFrom");
      const dateTo = searchParams.get("dateTo");

      if (status) where.status = status as Prisma.InvoiceWhereInput["status"];
      if (patientId) where.patientId = patientId;

      if (dateFrom || dateTo) {
        const issueDate: Prisma.DateTimeFilter = {};
        if (dateFrom) issueDate.gte = new Date(dateFrom);
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setDate(endDate.getDate() + 1);
          issueDate.lt = endDate;
        }
        where.issueDate = issueDate;
      }

      // Role-based visibility
      if (payload.role === "doctor") {
        // Doctors see only invoices for their own patients (via appointments)
        where.appointment = { doctorId: payload.userId };
      } else if (payload.role === "receptionist") {
        // Receptionists see all invoices (no additional filter)
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            patient: {
              select: {
                id: true,
                patientCode: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: { select: { items: true, payments: true } },
          },
        }),
        prisma.invoice.count({ where }),
      ]);

      return paginatedResponse(invoices, total, page, limit);
    } catch (error) {
      console.error("List invoices error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin", "director"],
);

// POST /api/v1/invoices — Create new invoice
export const POST = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      const body = await request.json();
      const parsed = createInvoiceSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }

      const { patientId, appointmentId, admissionId, dueDate, notes, items } = parsed.data;

      // Verify patient exists
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) {
        return errorResponse("Patient not found", 404);
      }

      // Verify appointment exists and belongs to patient (if provided)
      if (appointmentId) {
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
        });
        if (!appointment) {
          return errorResponse("Appointment not found", 404);
        }
        if (appointment.patientId !== patientId) {
          return errorResponse("Appointment does not belong to this patient", 400);
        }
        // Check if invoice already exists for this appointment
        const existingInvoice = await prisma.invoice.findUnique({
          where: { appointmentId },
        });
        if (existingInvoice) {
          return errorResponse("An invoice already exists for this appointment", 409);
        }
      }

      // Verify admission exists and belongs to patient (if provided)
      if (admissionId) {
        const admission = await prisma.admission.findUnique({
          where: { id: admissionId },
        });
        if (!admission) {
          return errorResponse("Admission not found", 404);
        }
        if (admission.patientId !== patientId) {
          return errorResponse("Admission does not belong to this patient", 400);
        }
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => {
        return sum + item.quantity * item.unitPrice;
      }, 0);

      // Round to 2 decimal places
      const roundedSubtotal = Math.round(subtotal * 100) / 100;
      const totalAmount = roundedSubtotal;

      // Generate invoice number
      const lastInvoice = await prisma.invoice.findFirst({
        orderBy: { createdAt: "desc" },
        select: { invoiceNumber: true },
      });
      const sequence = lastInvoice
        ? parseInt(lastInvoice.invoiceNumber.split("-")[1], 10) + 1
        : 1;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: generateCode("INV", sequence),
          patientId,
          appointmentId,
          admissionId,
          issueDate: new Date(),
          dueDate: new Date(dueDate),
          subtotal: roundedSubtotal,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount,
          paidAmount: 0,
          status: "draft",
          notes,
          items: {
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: Math.round(item.quantity * item.unitPrice * 100) / 100,
            })),
          },
        },
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
        action: "CREATE",
        entity: "Invoice",
        entityId: invoice.id,
        newData: invoice,
      });

      return successResponse(invoice, 201);
    } catch (error) {
      console.error("Create invoice error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["receptionist", "admin"],
);
