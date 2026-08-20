import { NextResponse } from "next/server";
import { findUserByEmail, updatePassword } from "@/lib/data/user";
import { findSecurityQuestionByUserId } from "@/lib/data/securityQuestion";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revokeAllRefreshTokensForUser } from "@/lib/auth/session";
import { checkLoginAttempt, recordLoginFailure, resetLoginAttempts } from "@/lib/auth/rateLimit";
import { verifyCaptcha } from "@/lib/auth/captcha";

const MIN_PASSWORD_LENGTH = 8;

// Guessing the security answer is a credential-reset path, not a read — it
// gets the same brute-force protection as login (shared rate-limit bucket,
// keyed on email) so an attacker can't bypass password guessing by
// switching to the security-question flow instead.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const securityAnswer = typeof body?.securityAnswer === "string" ? body.securityAnswer : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : "";
  const captchaAnswer = typeof body?.captchaAnswer === "string" ? body.captchaAnswer : "";

  const { locked, requireCaptcha } = await checkLoginAttempt(email);
  if (locked) {
    return NextResponse.json({ error: "locked" }, { status: 429 });
  }
  if (requireCaptcha && !(await verifyCaptcha(captchaToken, captchaAnswer))) {
    return NextResponse.json({ error: "captcha_failed", requireCaptcha: true }, { status: 400 });
  }

  const user = email ? await findUserByEmail(email) : null;
  const question = user ? await findSecurityQuestionByUserId(user.id) : null;

  if (!user || !question) {
    await recordLoginFailure(email);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const answerOk = await verifyPassword(securityAnswer.trim().toLowerCase(), question.answerHash);
  if (!answerOk) {
    await recordLoginFailure(email);
    return NextResponse.json({ error: "answer_mismatch" }, { status: 401 });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  await resetLoginAttempts(email);
  await updatePassword(user.id, await hashPassword(newPassword));
  await revokeAllRefreshTokensForUser(user.id);

  return NextResponse.json({ ok: true });
}
