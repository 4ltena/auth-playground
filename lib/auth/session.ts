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
//
// The revoke step is a conditional updateMany (revokedAt: null in the WHERE,
// not just the SELECT) so two concurrent calls with the same token can't
// both win: only the request whose update actually flips a row from
// null->revoked gets to issue a new token. Without this, a find-then-update
// race lets both callers see revokedAt: null before either write lands,
// producing two live refresh tokens from one rotation (breaks the
// single-active-chain invariant and any future reuse-detection built on it).
export async function rotateRefreshToken(token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!record || record.revokedAt || record.expiresAt < new Date()) return null;

  const { count } = await prisma.refreshToken.updateMany({
    where: { id: record.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) return null; // lost the race to a concurrent rotation/revoke

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

// `exceptToken`: pass the caller's own current refresh token to exclude it
// from revocation ("log out every OTHER device" — password change and
// security-question reset both mean this, not "also log the requester out").
export async function revokeAllRefreshTokensForUser(userId: string, exceptToken?: string) {
  const exceptTokenHash = exceptToken ? hashToken(exceptToken) : undefined;
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptTokenHash ? { tokenHash: { not: exceptTokenHash } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export async function listActiveSessions(userId: string) {
  return prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
  });
}

// Returns whether a session was actually revoked, so the caller can tell
// "you logged out your own device" from "that id doesn't belong to you /
// doesn't exist" instead of reporting success either way.
export async function revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count > 0;
}
