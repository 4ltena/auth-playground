import { afterEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { generateCaptcha, verifyCaptcha } from "./captcha";

import { prisma } from "@/lib/data/client";
afterEach(() => prisma.captchaChallenge.deleteMany());

function decodeAnswerFromSvg(svg: string): string {
  const chars = [...svg.matchAll(/<text[^>]*>([A-Z0-9])<\/text>/g)].map((m) => m[1]);
  return chars.join("");
}

describe("CAPTCHA", () => {
  it("verifies the correct answer (case-insensitive, trims whitespace)", async () => {
    for (const transform of [(s: string) => s, (s: string) => s.toLowerCase(), (s: string) => `  ${s}  `]) {
      const { svg, token } = await generateCaptcha();
      const answer = transform(decodeAnswerFromSvg(svg));
      await expect(verifyCaptcha(token, answer)).resolves.toBe(true);
      await expect(verifyCaptcha(token, answer)).resolves.toBe(false);
    }
  });

  it("allows only one concurrent successful verification", async () => {
    const { token, svg } = await generateCaptcha();
    const answer = decodeAnswerFromSvg(svg);
    const results = await Promise.all([verifyCaptcha(token, answer), verifyCaptcha(token, answer)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("rejects expired challenges", async () => {
    const { token, svg } = await generateCaptcha();
    await prisma.captchaChallenge.update({ where: { id: token }, data: { expiresAt: new Date(0) } });
    expect(await verifyCaptcha(token, decodeAnswerFromSvg(svg))).toBe(false);
  });

  it("rejects a wrong answer", async () => {
    const { token } = await generateCaptcha();
    await expect(verifyCaptcha(token, "WRONG")).resolves.toBe(false);
  });

  it("rejects garbage tokens", async () => {
    await expect(verifyCaptcha("not-a-jwt", "ABCDE")).resolves.toBe(false);
  });

  it("rejects an access-token-shaped token signed with the same secret (audience mismatch)", async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const accessShapedToken = await new SignJWT({ email: "a@example.com", role: "USER" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setAudience("auth-playground:access")
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secret);
    await expect(verifyCaptcha(accessShapedToken, "anything")).resolves.toBe(false);
  });

  it("produces a 5-character answer from the reduced (no ambiguous chars) charset", async () => {
    const { svg } = await generateCaptcha();
    const answer = decodeAnswerFromSvg(svg);
    expect(answer).toHaveLength(5);
    expect(answer).toMatch(/^[A-HJ-NP-Z2-9]+$/); // excludes I, O, 0, 1
  });
});
