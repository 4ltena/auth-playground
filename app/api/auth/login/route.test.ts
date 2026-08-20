import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/data/client";
import { hashPassword } from "@/lib/auth/password";
import { createUser, setUserStatus } from "@/lib/data/user";
import { generateCaptcha } from "@/lib/auth/captcha";
import { POST } from "./route";

function decodeAnswerFromSvg(svg: string): string {
  const chars = [...svg.matchAll(/<text[^>]*>([A-Z0-9])<\/text>/g)].map((m) => m[1]);
  return chars.join("");
}

async function solvedCaptcha() {
  const { svg, token } = await generateCaptcha();
  return { captchaToken: token, captchaAnswer: decodeAnswerFromSvg(svg) };
}

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost:3000", host: "localhost:3000", ...headers },
    body: JSON.stringify(body),
  });
}

afterEach(async () => {
  await prisma.loginHistory.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and sets access_token + refresh_token cookies", async () => {
    await createUser({ email: "a@example.com", passwordHash: await hashPassword("password123") });

    const res = await POST(req({ email: "a@example.com", password: "password123" }));

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("access_token=");
    expect(setCookie).toContain("refresh_token=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("rejects a wrong password and records a failed attempt", async () => {
    await createUser({ email: "b@example.com", passwordHash: await hashPassword("password123") });

    const res = await POST(req({ email: "b@example.com", password: "wrong" }));

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("invalid_credentials");
    const history = await prisma.loginHistory.findMany();
    expect(history).toHaveLength(1);
    expect(history[0]?.success).toBe(false);
  });

  it("rejects a cross-origin request", async () => {
    const res = await POST(
      req({ email: "nobody@example.com", password: "x" }, { origin: "https://evil.example" }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("invalid_origin");
  });

  it("rejects a suspended user's login even with the correct password, without counting it as a rate-limit failure", async () => {
    const user = await createUser({ email: "c@example.com", passwordHash: await hashPassword("password123") });
    await setUserStatus(user.id, "SUSPENDED");

    const res = await POST(req({ email: "c@example.com", password: "password123" }));

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("account_suspended");
    const attempt = await prisma.loginAttempt.findUnique({ where: { identifier: "c@example.com" } });
    expect(attempt).toBeNull(); // correct password should not touch the rate limiter
  });

  it("requires CAPTCHA after 3 failures and locks after 5", async () => {
    await createUser({ email: "d@example.com", passwordHash: await hashPassword("password123") });

    for (let i = 0; i < 3; i++) {
      const res = await POST(req({ email: "d@example.com", password: "wrong" }));
      expect(res.status).toBe(401);
    }

    // 4th failure without a CAPTCHA answer is rejected before credentials are even checked.
    const fourth = await POST(req({ email: "d@example.com", password: "wrong" }));
    expect(fourth.status).toBe(400);
    expect((await fourth.json()).error).toBe("captcha_failed");

    // Solve the CAPTCHA for attempts 4 and 5 to actually reach the credential check and lock.
    for (let i = 0; i < 2; i++) {
      const captcha = await solvedCaptcha();
      const res = await POST(req({ email: "d@example.com", password: "wrong", ...captcha }));
      expect(res.status).toBe(401);
    }

    const locked = await POST(req({ email: "d@example.com", password: "password123" }));
    expect(locked.status).toBe(429);
    expect((await locked.json()).error).toBe("locked");
  });

  it("resets the rate-limit bucket on a successful login", async () => {
    await createUser({ email: "e@example.com", passwordHash: await hashPassword("password123") });
    await POST(req({ email: "e@example.com", password: "wrong" }));
    await POST(req({ email: "e@example.com", password: "password123" }));

    const attempt = await prisma.loginAttempt.findUnique({ where: { identifier: "e@example.com" } });
    expect(attempt).toBeNull();
  });

  it("rejects an email that doesn't exist without leaking that distinction in the status code", async () => {
    const res = await POST(req({ email: "nobody@example.com", password: "password123" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("invalid_credentials");
  });
});
