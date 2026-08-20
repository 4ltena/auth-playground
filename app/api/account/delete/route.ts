import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findUserById, deleteUser } from "@/lib/data/user";
import { verifyPassword } from "@/lib/auth/password";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/jwt";
import { REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/http/origin-check";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const user = await findUserById(currentUser.sub);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "password_incorrect" }, { status: 400 });
  }

  // Cascades to RefreshToken/LoginHistory/SecurityQuestion via schema.prisma onDelete: Cascade.
  await deleteUser(user.id);

  const jar = await cookies();
  jar.delete(ACCESS_TOKEN_COOKIE);
  jar.delete(REFRESH_TOKEN_COOKIE);

  return NextResponse.json({ ok: true });
}
