import { NextResponse } from "next/server";
import { findUserByEmail, updatePassword } from "@/lib/data/user";
import { findSecurityQuestionByUserId } from "@/lib/data/securityQuestion";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revokeAllRefreshTokensForUser } from "@/lib/auth/session";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const securityAnswer = typeof body?.securityAnswer === "string" ? body.securityAnswer : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  const user = email ? await findUserByEmail(email) : null;
  const question = user ? await findSecurityQuestionByUserId(user.id) : null;

  if (!user || !question) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const answerOk = await verifyPassword(securityAnswer.trim().toLowerCase(), question.answerHash);
  if (!answerOk) {
    return NextResponse.json({ error: "answer_mismatch" }, { status: 401 });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  await updatePassword(user.id, await hashPassword(newPassword));
  await revokeAllRefreshTokensForUser(user.id);

  return NextResponse.json({ ok: true });
}
