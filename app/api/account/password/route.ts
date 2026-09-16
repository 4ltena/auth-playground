import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { findUserById } from "@/lib/data/user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordAndRevoke } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/http/origin-check";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const currentUser = await getCurrentUserFromRequest(request);
  if (!currentUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  const user = await findUserById(currentUser.sub);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "current_password_incorrect" }, { status: 400 });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  await changePasswordAndRevoke(user.id, await hashPassword(newPassword), currentUser.sid);

  return NextResponse.json({ ok: true });
}
