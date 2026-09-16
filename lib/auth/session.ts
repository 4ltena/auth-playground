import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/data/client";
import type { Prisma } from "@prisma/client";

export const REFRESH_TOKEN_COOKIE = "refresh_token";
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function refreshTokenMaxAge(rememberMe: boolean): number {
  return (rememberMe ? 30 : 1) * 24 * 60 * 60;
}
export async function issueRefreshToken(input: {
  userId: string; rememberMe: boolean; userAgent?: string | null; ipAddress?: string | null;
}) {
  const token = randomBytes(32).toString("hex");
  const maxAgeSeconds = refreshTokenMaxAge(input.rememberMe);
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  const session = await prisma.session.create({ data: {
    ...input, expiresAt,
    refreshTokens: { create: { tokenHash: hashToken(token), expiresAt } },
  } });
  return { token, maxAgeSeconds, sessionId: session.id };
}

// The conditional consume and successor creation commit together. Session expiry
// is absolute: repeated refreshes cannot extend a stolen session indefinitely.
export async function rotateRefreshToken(token: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const record = await tx.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) }, include: { session: { include: { user: true } } },
    });
    if (!record || record.consumedAt || record.expiresAt <= now ||
        record.session.revokedAt || record.session.expiresAt <= now || record.session.user.status !== "ACTIVE") return null;
    // Serialize against session revocation before consuming a token.
    const active = await tx.session.updateMany({
      where: { id: record.sessionId, revokedAt: null, expiresAt: { gt: now } },
      data: { lastUsedAt: now },
    });
    if (!active.count) return null;
    const consumed = await tx.refreshToken.updateMany({
      where: { id: record.id, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now },
    });
    if (!consumed.count) return null;
    const next = randomBytes(32).toString("hex");
    await tx.refreshToken.create({ data: {
      sessionId: record.sessionId, tokenHash: hashToken(next), expiresAt: record.session.expiresAt,
    } });
    return { userId: record.session.userId, sessionId: record.sessionId, token: next,
      maxAgeSeconds: Math.max(0, Math.floor((record.session.expiresAt.getTime() - Date.now()) / 1000)) };
  });
}

export async function revokeRefreshToken(token: string) {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (record) await prisma.session.updateMany({
    where: { id: record.sessionId, revokedAt: null }, data: { revokedAt: new Date() },
  });
}

export async function revokeAllRefreshTokensForUser(userId: string, exceptToken?: string) {
  const record = exceptToken ? await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(exceptToken) } }) : null;
  await revokeUserSessions(prisma, userId, record?.sessionId);
}

export async function revokeUserSessions(tx: Prisma.TransactionClient, userId: string, exceptSessionId?: string) {
  await tx.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
}

export async function changePasswordAndRevoke(userId: string, passwordHash: string, exceptSessionId?: string) {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await revokeUserSessions(tx, userId, exceptSessionId);
  });
}

export async function listActiveSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastUsedAt: "desc" },
  });
}
export async function revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
  const { count } = await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() },
  });
  return count > 0;
}
