import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/data/client";

export const REFRESH_TOKEN_COOKIE = "refresh_token";
const REFRESH_TOKEN_TTL_REMEMBER_SECONDS = 30 * 24 * 60 * 60; // 30 days
const REFRESH_TOKEN_TTL_DEFAULT_SECONDS = 24 * 60 * 60; // 1 day

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshTokenMaxAge(rememberMe: boolean): number {
  return rememberMe ? REFRESH_TOKEN_TTL_REMEMBER_SECONDS : REFRESH_TOKEN_TTL_DEFAULT_SECONDS;
}

export async function issueRefreshToken(input: {
  userId: string;
  rememberMe: boolean;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const token = randomBytes(32).toString("hex");
  const maxAgeSeconds = refreshTokenMaxAge(input.rememberMe);
  await prisma.refreshToken.create({
    data: {
      userId: input.userId,
      tokenHash: hashToken(token),
      rememberMe: input.rememberMe,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      expiresAt: new Date(Date.now() + maxAgeSeconds * 1000),
    },
  });
  return { token, maxAgeSeconds };
}

// Verifies a refresh token and rotates it (old one revoked, new one issued).
// Returns null if the token is missing, expired, or already revoked.
export async function rotateRefreshToken(token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!record || record.revokedAt || record.expiresAt < new Date()) return null;

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const next = await issueRefreshToken({
    userId: record.userId,
    rememberMe: record.rememberMe,
    userAgent: record.userAgent,
    ipAddress: record.ipAddress,
  });

  return { userId: record.userId, ...next };
}

export async function revokeRefreshToken(token: string) {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllRefreshTokensForUser(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function listActiveSessions(userId: string) {
  return prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
  });
}

export async function revokeSessionById(userId: string, sessionId: string) {
  await prisma.refreshToken.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
