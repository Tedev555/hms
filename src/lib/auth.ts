import jwt, { type SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

export type JwtPayload = {
  userId: string;
  username: string;
  role: UserRole;
  departmentId: string | null;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: "15m" };
  return jwt.sign({ ...payload }, JWT_SECRET, options);
}

export function generateRefreshToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: "7d" };
  return jwt.sign({ ...payload }, REFRESH_TOKEN_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
}
