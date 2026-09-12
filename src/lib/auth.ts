import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { AUTH_COOKIE } from "@/lib/constants";
import { env, getJwtSecret } from "@/config/env";
import { AppError } from "@/lib/errors";
import { AUTH_ERRORS, ERROR_CODES } from "@/constants/error-messages";
import { AuthUser } from "@/constants/types/auth.types";

const COOKIE_MAX_AGE_THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "30d",
  });
}

export function verifyToken(token: string): AuthUser {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthUser;
  } catch {
    throw new AppError(AUTH_ERRORS.TOKEN_EXPIRED, 401, ERROR_CODES.UNAUTHORIZED);
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_THIRTY_DAYS,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function getAuthPayload(): Promise<AuthUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) {
    throw new AppError(AUTH_ERRORS.AUTH_REQUIRED, 401, ERROR_CODES.UNAUTHORIZED);
  }

  return verifyToken(token);
}
