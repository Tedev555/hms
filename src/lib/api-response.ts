import { NextResponse } from "next/server";

export type ApiErrorBody = {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
};

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return NextResponse.json({
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export function errorResponse(message: string, status = 400, errors?: Record<string, string[]>) {
  const body: ApiErrorBody = { statusCode: status, message };
  if (errors) body.errors = errors;
  return NextResponse.json(body, { status });
}

export function notFoundResponse(resource = "Resource") {
  return errorResponse(`${resource} not found`, 404);
}

export function unauthorizedResponse(message = "Unauthorized") {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = "Forbidden") {
  return errorResponse(message, 403);
}
