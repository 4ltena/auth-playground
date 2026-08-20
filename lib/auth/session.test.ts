import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/data/client";
import {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  listActiveSessions,
  revokeSessionById,
  refreshTokenMaxAge,
} from "./session";

async function createTestUser(email: string) {
  return prisma.user.create({ data: { email, passwordHash: "hash" } });
}

afterEach(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

describe("refreshTokenMaxAge", () => {
  it("returns 30 days for rememberMe", () => {
    expect(refreshTokenMaxAge(true)).toBe(30 * 24 * 60 * 60);
  });

  it("returns 1 day otherwise", () => {
    expect(refreshTokenMaxAge(false)).toBe(24 * 60 * 60);
  });
});

describe("issueRefreshToken", () => {
  it("creates a DB record with a hashed token, not the raw token", async () => {
    const user = await createTestUser("a@example.com");
    const { token } = await issueRefreshToken({ userId: user.id, rememberMe: false });

    const records = await prisma.refreshToken.findMany({ where: { userId: user.id } });
    expect(records).toHaveLength(1);
    expect(records[0]?.tokenHash).not.toBe(token);
    expect(records[0]?.revokedAt).toBeNull();
  });
});

describe("rotateRefreshToken", () => {
  it("issues a new token and revokes the old one", async () => {
    const user = await createTestUser("b@example.com");
    const { token } = await issueRefreshToken({ userId: user.id, rememberMe: false });

    const rotated = await rotateRefreshToken(token);

    expect(rotated).not.toBeNull();
    expect(rotated?.token).not.toBe(token);

    const records = await prisma.refreshToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    expect(records).toHaveLength(2);
    expect(records[0]?.revokedAt).not.toBeNull(); // old one revoked
    expect(records[1]?.revokedAt).toBeNull(); // new one active
  });

  it("returns null for an unknown token", async () => {
    await expect(rotateRefreshToken("not-a-real-token")).resolves.toBeNull();
  });

  it("returns null for an already-revoked token", async () => {
    const user = await createTestUser("c@example.com");
    const { token } = await issueRefreshToken({ userId: user.id, rememberMe: false });
    await revokeRefreshToken(token);

    await expect(rotateRefreshToken(token)).resolves.toBeNull();
  });

  it("returns null for an expired token", async () => {
    const user = await createTestUser("d@example.com");
    const { token } = await issueRefreshToken({ userId: user.id, rememberMe: false });
    // Back-date expiresAt directly, simulating a token past its TTL.
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(rotateRefreshToken(token)).resolves.toBeNull();
  });

  it("only lets one of two concurrent rotations win (no double-issue)", async () => {
    const user = await createTestUser("e@example.com");
    const { token } = await issueRefreshToken({ userId: user.id, rememberMe: false });

    const [first, second] = await Promise.all([rotateRefreshToken(token), rotateRefreshToken(token)]);

    const results = [first, second];
    const winners = results.filter((r) => r !== null);
    const losers = results.filter((r) => r === null);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);

    // Exactly one new active token exists (the original is revoked by both
    // attempts hitting the same row, but only one issues a successor).
    const activeCount = await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } });
    expect(activeCount).toBe(1);
  });
});

describe("revokeAllRefreshTokensForUser", () => {
  it("revokes every active token for the user", async () => {
    const user = await createTestUser("f@example.com");
    await issueRefreshToken({ userId: user.id, rememberMe: false });
    await issueRefreshToken({ userId: user.id, rememberMe: true });

    await revokeAllRefreshTokensForUser(user.id);

    const activeCount = await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } });
    expect(activeCount).toBe(0);
  });

  it("excludes exceptToken from revocation", async () => {
    const user = await createTestUser("g@example.com");
    const { token: keep } = await issueRefreshToken({ userId: user.id, rememberMe: false });
    await issueRefreshToken({ userId: user.id, rememberMe: false });

    await revokeAllRefreshTokensForUser(user.id, keep);

    const active = await prisma.refreshToken.findMany({ where: { userId: user.id, revokedAt: null } });
    expect(active).toHaveLength(1);

    // The surviving one really is the caller's own session, not just any one.
    const rotated = await rotateRefreshToken(keep);
    expect(rotated).not.toBeNull();
  });

  it("does not affect other users' tokens", async () => {
    const userA = await createTestUser("h@example.com");
    const userB = await createTestUser("i@example.com");
    await issueRefreshToken({ userId: userA.id, rememberMe: false });
    await issueRefreshToken({ userId: userB.id, rememberMe: false });

    await revokeAllRefreshTokensForUser(userA.id);

    const bActive = await prisma.refreshToken.count({ where: { userId: userB.id, revokedAt: null } });
    expect(bActive).toBe(1);
  });
});

describe("listActiveSessions", () => {
  it("excludes revoked and expired sessions, keeps the active one", async () => {
    const user = await createTestUser("j@example.com");

    const { token: toRevoke } = await issueRefreshToken({ userId: user.id, rememberMe: false });
    await revokeRefreshToken(toRevoke);

    await issueRefreshToken({ userId: user.id, rememberMe: false });
    const expiredRecord = await prisma.refreshToken.findFirst({
      where: { userId: user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    await prisma.refreshToken.update({
      where: { id: expiredRecord!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await issueRefreshToken({ userId: user.id, rememberMe: false });

    const sessions = await listActiveSessions(user.id);
    expect(sessions).toHaveLength(1);
  });
});

describe("revokeSessionById", () => {
  it("returns true and revokes when the session belongs to the user", async () => {
    const user = await createTestUser("k@example.com");
    await issueRefreshToken({ userId: user.id, rememberMe: false });
    const [session] = await prisma.refreshToken.findMany({ where: { userId: user.id } });
    if (!session) throw new Error("expected a session to have been created");

    await expect(revokeSessionById(user.id, session.id)).resolves.toBe(true);
    const reloaded = await prisma.refreshToken.findUnique({ where: { id: session.id } });
    expect(reloaded?.revokedAt).not.toBeNull();
  });

  it("returns false for another user's session (no cross-account revoke)", async () => {
    const owner = await createTestUser("l@example.com");
    const attacker = await createTestUser("m@example.com");
    await issueRefreshToken({ userId: owner.id, rememberMe: false });
    const [session] = await prisma.refreshToken.findMany({ where: { userId: owner.id } });
    if (!session) throw new Error("expected a session to have been created");

    await expect(revokeSessionById(attacker.id, session.id)).resolves.toBe(false);
    const reloaded = await prisma.refreshToken.findUnique({ where: { id: session.id } });
    expect(reloaded?.revokedAt).toBeNull();
  });

  it("returns false for a nonexistent session id", async () => {
    const user = await createTestUser("n@example.com");
    await expect(revokeSessionById(user.id, "nonexistent-id")).resolves.toBe(false);
  });
});
