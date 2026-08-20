import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findUserById, updatePassword } from "@/lib/data/user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revokeAllRefreshTokensForUser } from "@/lib/auth/session";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
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

  await updatePassword(user.id, await hashPassword(newPassword));
  // Changing the password revokes every other session (security best practice).
  await revokeAllRefreshTokensForUser(user.id);

  return NextResponse.json({ ok: true });
}
