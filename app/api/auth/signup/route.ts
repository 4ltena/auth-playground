import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { createUser, findUserByEmail } from "@/lib/data/user";
import { setSecurityQuestion } from "@/lib/data/securityQuestion";
import { isSecurityQuestionKey } from "@/lib/auth/securityQuestions";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { isSameOriginRequest } from "@/lib/http/origin-check";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : "";
  const captchaAnswer = typeof body?.captchaAnswer === "string" ? body.captchaAnswer : "";
  const securityQuestionKey = body?.securityQuestionKey;
  const securityAnswer = typeof body?.securityAnswer === "string" ? body.securityAnswer : "";

  if (!(await verifyCaptcha(captchaToken, captchaAnswer))) {
    return NextResponse.json({ error: "captcha_failed" }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "password_mismatch" }, { status: 400 });
  }
  if (!isSecurityQuestionKey(securityQuestionKey) || securityAnswer.trim().length === 0) {
    return NextResponse.json({ error: "security_question_required" }, { status: 400 });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, passwordHash });

  const answerHash = await hashPassword(securityAnswer.trim().toLowerCase());
  await setSecurityQuestion({ userId: user.id, questionKey: securityQuestionKey, answerHash });

  return NextResponse.json({ ok: true }, { status: 201 });
}
