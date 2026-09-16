import "server-only";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  email: string;
  role: Role;
};

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export const ACCESS_TOKEN_COOKIE = "access_token";
export const ACCESS_TOKEN_MAX_AGE = ACCESS_TOKEN_TTL_SECONDS;

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || (process.env.NODE_ENV === "production" && (secret.length < 32 || /change[-_ ]?me|example|placeholder|replace-with|test-only|test-secret/i.test(secret)))) {
    throw new Error("JWT_SECRET must be a strong server-only secret (at least 32 characters in production)");
  }
  return new TextEncoder().encode(secret);
}

const ACCESS_TOKEN_AUDIENCE = "auth-playground:access";

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role, sid: payload.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setAudience(ACCESS_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { audience: ACCESS_TOKEN_AUDIENCE, algorithms: ["HS256"] });
    if (typeof payload.sid !== "string" || !payload.sid) return null;
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.email !== "string") return null;
    if (payload.role !== "USER" && payload.role !== "ADMIN") return null;
    return { sub: payload.sub, email: payload.email, role: payload.role, sid: payload.sid };
  } catch {
    return null;
  }
}
