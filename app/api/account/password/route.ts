import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findUserById, updatePassword } from "@/lib/data/user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revokeAllRefreshTokensForUser, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/http/origin-check";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

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

  // Revoke every OTHER session, not the caller's own — a password change
  // that force-logs-out the person who just typed the current password
  // correctly would be a confusing self-inflicted lockout, not a security
  // improvement.
  const jar = await cookies();
  const currentRefreshToken = jar.get(REFRESH_TOKEN_COOKIE)?.value;
  await revokeAllRefreshTokensForUser(user.id, currentRefreshToken);

  return NextResponse.json({ ok: true });
}
