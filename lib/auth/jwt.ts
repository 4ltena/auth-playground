import "server-only";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: Role;
};

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export const ACCESS_TOKEN_COOKIE = "access_token";
export const ACCESS_TOKEN_MAX_AGE = ACCESS_TOKEN_TTL_SECONDS;

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.email !== "string") return null;
    if (payload.role !== "USER" && payload.role !== "ADMIN") return null;
    return { sub: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
