import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse } from "@/lib/api-response";

// GET /api/v1/locales — list all available languages (public endpoint)
export async function GET(_request: NextRequest) {
  const locales = await prisma.supportedLocale.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      nativeName: true,
      isDefault: true,
      completeness: true,
    },
  });

  return successResponse(locales);
}
