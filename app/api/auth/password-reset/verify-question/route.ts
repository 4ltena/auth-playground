import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/data/user";
import { findSecurityQuestionByUserId } from "@/lib/data/securityQuestion";
import { securityQuestionLabel } from "@/lib/auth/securityQuestions";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  const user = email ? await findUserByEmail(email) : null;
  const question = user ? await findSecurityQuestionByUserId(user.id) : null;

  if (!user || !question) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ questionLabel: securityQuestionLabel(question.questionKey) });
}
