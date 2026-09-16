import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { signAccessToken, verifyAccessToken, type AccessTokenPayload } from "./jwt";

afterEach(() => vi.unstubAllEnvs());

describe("JWT access tokens", () => {
  const payload: AccessTokenPayload = { sub: "user-1", sid: "session-1", email: "a@example.com", role: "USER" };

  it("refuses example or short signing secrets in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const value of ["short", "replace-with-a-random-secret-at-least-32-characters"]) {
      vi.stubEnv("JWT_SECRET", value);
      await expect(signAccessToken(payload)).rejects.toThrow("JWT_SECRET");
    }
  });

  it("signs and verifies a valid token", async () => {
    const token = await signAccessToken(payload);
    const verified = await verifyAccessToken(token);
    expect(verified).toEqual(payload);
  });

  it("rejects a tampered token", async () => {
    const token = await signAccessToken(payload);
    const tampered = token.slice(0, -2) + "xx";
    await expect(verifyAccessToken(tampered)).resolves.toBeNull();
  });

  it("rejects garbage input", async () => {
    await expect(verifyAccessToken("not-a-jwt")).resolves.toBeNull();
  });

  it("rejects an empty string", async () => {
    await expect(verifyAccessToken("")).resolves.toBeNull();
  });

  it("rejects a token signed with the wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("a-completely-different-secret-value!!!!");
    const token = await new SignJWT({ email: payload.email, role: payload.role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setAudience("auth-playground:access")
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(wrongSecret);
    await expect(verifyAccessToken(token)).resolves.toBeNull();
  });

  it("rejects a token missing the access-token audience (e.g. a CAPTCHA token signed with the same secret)", async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const captchaShapedToken = await new SignJWT({ answer: "ABCDE" })
      .setProtectedHeader({ alg: "HS256" })
      .setAudience("auth-playground:captcha")
      .setIssuedAt()
      .setExpirationTime("2m")
      .sign(secret);
    await expect(verifyAccessToken(captchaShapedToken)).resolves.toBeNull();
  });

  it("rejects a token with no audience claim at all", async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const noAudienceToken = await new SignJWT({ email: payload.email, role: payload.role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secret);
    await expect(verifyAccessToken(noAudienceToken)).resolves.toBeNull();
  });

  it("rejects an unrecognized role", async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const badRoleToken = await new SignJWT({ email: payload.email, role: "SUPERUSER" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setAudience("auth-playground:access")
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secret);
    await expect(verifyAccessToken(badRoleToken)).resolves.toBeNull();
  });
});
