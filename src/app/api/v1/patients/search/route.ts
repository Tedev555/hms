import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/middleware/auth";
import { paginatedResponse, errorResponse } from "@/lib/api-response";
import { searchPatientSchema } from "@/lib/validations";
import type { JwtPayload } from "@/lib/auth";

// GET /api/v1/patients/search — Search patients
export const GET = withAuth(async (request: NextRequest, _payload: JwtPayload) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = searchPatientSchema.safeParse({
      q: searchParams.get("q"),
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    });

    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const { q, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    // Build OR conditions for search
    const where = {
      OR: [
        { patientCode: { equals: q, mode: "insensitive" as const } },
        { nationalId: { equals: q, mode: "insensitive" as const } },
        { phone: { contains: q } },
        { firstName: { contains: q, mode: "insensitive" as const } },
        { lastName: { contains: q, mode: "insensitive" as const } },
      ],
    };

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          patientCode: true,
          firstName: true,
          lastName: true,
          phone: true,
          gender: true,
          dateOfBirth: true,
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return paginatedResponse(patients, total, page, limit);
  } catch (error) {
    console.error("Search patients error:", error);
    return errorResponse("Internal server error", 500);
  }
});
