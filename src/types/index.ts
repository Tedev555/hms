import type { UserRole } from "@prisma/client";

// Auth
export type AuthUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

// API
export type ApiResponse<T> = {
  data: T;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type ApiError = {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
};
