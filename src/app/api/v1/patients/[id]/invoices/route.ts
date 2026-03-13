import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { paginatedResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { parsePagination } from "@/lib/utils";
import type { JwtPayload } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// GET /api/v1/patients/:patientId/invoices — List invoices for a patient
export const GET = withAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    // Extract patient ID: /api/v1/patients/:id/invoices
    const segments = request.nextUrl.pathname.split("/");
    const invoicesIdx = segments.lastIndexOf("invoices");
    const patientId = segments[invoicesIdx - 1];

    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return notFoundResponse("Patient");
    }

    // Doctors can only see invoices for their own patients
    if (payload.role === "doctor") {
      const hasAppointment = await prisma.appointment.findFirst({
        where: { patientId, doctorId: payload.userId },
      });
      if (!hasAppointment) {
        return errorResponse("You can only view invoices for your own patients", 403);
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const where: Prisma.InvoiceWhereInput = { patientId };

    const status = searchParams.get("status");
    if (status) where.status = status as Prisma.InvoiceWhereInput["status"];

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { items: true, payments: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return paginatedResponse(invoices, total, page, limit);
  } catch (error) {
    console.error("List patient invoices error:", error);
    return errorResponse("Internal server error", 500);
  }
});
