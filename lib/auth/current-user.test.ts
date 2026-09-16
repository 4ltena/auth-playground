import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/data/client";
import { signAccessToken } from "./jwt";
import { getCurrentUserFromRequest } from "./current-user";
import { issueRefreshToken, revokeSessionById, changePasswordAndRevoke, rotateRefreshToken } from "./session";
import { GET as listUsers } from "@/app/api/admin/users/route";

afterEach(() => prisma.user.deleteMany());
async function fixture() {
  const user = await prisma.user.create({ data: { email: "session@example.com", passwordHash: "old", role: "ADMIN" } });
  const session = await issueRefreshToken({ userId: user.id, rememberMe: false });
  const jwt = await signAccessToken({ sub: user.id, sid: session.sessionId, email: user.email, role: user.role });
  const request = new NextRequest("http://localhost:3000/api/admin/users", { headers: { cookie: `access_token=${jwt}` } });
  return { user, session, request };
}
describe("authorization boundary", () => {
  it("rejects a revoked session even with a valid JWT", async () => {
    const { user, session, request } = await fixture();
    expect(await getCurrentUserFromRequest(request)).not.toBeNull();
    await revokeSessionById(user.id, session.sessionId);
    expect(await getCurrentUserFromRequest(request)).toBeNull();
    expect(await rotateRefreshToken(session.token)).toBeNull();
  });
  it("rejects suspended users immediately", async () => {
    const { user, session, request } = await fixture();
    await prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    expect(await getCurrentUserFromRequest(request)).toBeNull();
    expect(await rotateRefreshToken(session.token)).toBeNull();
  });
  it("uses the current DB role instead of an old ADMIN claim", async () => {
    const { user, request } = await fixture();
    await prisma.user.update({ where: { id: user.id }, data: { role: "USER" } });
    expect((await getCurrentUserFromRequest(request))?.role).toBe("USER");
    expect((await listUsers(request)).status).toBe(403);
  });
  it("preserves session identity and absolute expiry through rotation", async () => {
    const { session, request } = await fixture();
    const before = await prisma.session.findUniqueOrThrow({ where: { id: session.sessionId } });
    const next = await rotateRefreshToken(session.token);
    expect(next?.sessionId).toBe(session.sessionId);
    expect((await getCurrentUserFromRequest(request))?.sid).toBe(session.sessionId);
    const after = await prisma.session.findUniqueOrThrow({ where: { id: session.sessionId } });
    expect(after.expiresAt).toEqual(before.expiresAt);
  });
  it("password reset updates the hash and invalidates existing access and refresh tokens", async () => {
    const { user, session, request } = await fixture();
    await changePasswordAndRevoke(user.id, "new-hash");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe("new-hash");
    expect(await getCurrentUserFromRequest(request)).toBeNull();
    expect(await rotateRefreshToken(session.token)).toBeNull();
  });
  it("password change keeps only the caller's stable session", async () => {
    const { user, session, request } = await fixture();
    const other = await issueRefreshToken({ userId: user.id, rememberMe: false });
    await changePasswordAndRevoke(user.id, "new-hash", session.sessionId);
    expect(await getCurrentUserFromRequest(request)).not.toBeNull();
    expect(await rotateRefreshToken(other.token)).toBeNull();
  });
});
