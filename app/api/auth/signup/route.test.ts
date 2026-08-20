import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/data/client";
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
  return new Request("http://localhost:3000/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost:3000", host: "localhost:3000", ...headers },
    body: JSON.stringify(body),
  });
}

afterEach(async () => {
  await prisma.securityQuestion.deleteMany();
  await prisma.user.deleteMany();
});

describe("POST /api/auth/signup", () => {
  it("creates a user with matching passwords and a valid CAPTCHA", async () => {
    const captcha = await solvedCaptcha();
    const res = await POST(
      req({
        email: "a@example.com",
        password: "password123",
        confirmPassword: "password123",
        securityQuestionKey: "first_pet",
        securityAnswer: "fido",
        ...captcha,
      }),
    );
    expect(res.status).toBe(201);
    const created = await prisma.user.findUnique({ where: { email: "a@example.com" } });
    expect(created).not.toBeNull();
    const question = await prisma.securityQuestion.findUnique({ where: { userId: created!.id } });
    expect(question?.questionKey).toBe("first_pet");
  });

  it("rejects a wrong CAPTCHA answer before checking anything else", async () => {
    const { captchaToken } = await solvedCaptcha();
    const res = await POST(
      req({
        email: "b@example.com",
        password: "password123",
        confirmPassword: "password123",
        securityQuestionKey: "first_pet",
        securityAnswer: "fido",
        captchaToken,
        captchaAnswer: "WRONG",
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("captcha_failed");
  });

  it("rejects a cross-origin request", async () => {
    const captcha = await solvedCaptcha();
    const res = await POST(
      req(
        { email: "c@example.com", password: "password123", confirmPassword: "password123", ...captcha },
        { origin: "https://evil.example" },
      ),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("invalid_origin");
  });

  it("rejects mismatched passwords", async () => {
    const captcha = await solvedCaptcha();
    const res = await POST(
      req({
        email: "d@example.com",
        password: "password123",
        confirmPassword: "different",
        securityQuestionKey: "first_pet",
        securityAnswer: "fido",
        ...captcha,
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("password_mismatch");
  });

  it("rejects a duplicate email", async () => {
    const first = await solvedCaptcha();
    await POST(
      req({
        email: "e@example.com",
        password: "password123",
        confirmPassword: "password123",
        securityQuestionKey: "first_pet",
        securityAnswer: "fido",
        ...first,
      }),
    );

    const second = await solvedCaptcha();
    const res = await POST(
      req({
        email: "e@example.com",
        password: "password123",
        confirmPassword: "password123",
        securityQuestionKey: "first_pet",
        securityAnswer: "fido",
        ...second,
      }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("email_taken");
  });

  it("rejects a password shorter than 8 characters", async () => {
    const captcha = await solvedCaptcha();
    const res = await POST(
      req({
        email: "f@example.com",
        password: "short",
        confirmPassword: "short",
        securityQuestionKey: "first_pet",
        securityAnswer: "fido",
        ...captcha,
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("weak_password");
  });

  it("rejects a missing/invalid security question", async () => {
    const captcha = await solvedCaptcha();
    const res = await POST(
      req({
        email: "g@example.com",
        password: "password123",
        confirmPassword: "password123",
        securityQuestionKey: "not_a_real_question",
        securityAnswer: "fido",
        ...captcha,
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("security_question_required");
  });
});
