import "server-only";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, verifyAccessToken, type AccessTokenPayload } from "./jwt";

import { prisma } from "@/lib/data/client";

async function resolveCurrentUser(token: string | undefined): Promise<AccessTokenPayload | null> {
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  const session = await prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
  if (!session || session.userId !== payload.sub || session.revokedAt ||
      session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
  // Role changes take effect immediately, even while an old JWT is valid.
  return { sub: session.userId, sid: session.id, email: session.user.email, role: session.user.role };
}

// For Server Components / Server Actions, where next/headers' cookies() is
// the only way to read the incoming request's cookies.
export async function getCurrentUser(): Promise<AccessTokenPayload | null> {
  const jar = await cookies();
  return resolveCurrentUser(jar.get(ACCESS_TOKEN_COOKIE)?.value);
}

// For Route Handlers. Reads the cookie straight off the NextRequest instead
// of going through next/headers' cookies(), which throws when called outside
// an active Next.js request-render context (e.g. a Route Handler's POST
// invoked directly from a unit test, with no server actually running) —
// this version works in both.
export async function getCurrentUserFromRequest(request: NextRequest): Promise<AccessTokenPayload | null> {
  return resolveCurrentUser(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
}
