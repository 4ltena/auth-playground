import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { findUserById, deleteUser } from "@/lib/data/user";
import { verifyPassword } from "@/lib/auth/password";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/jwt";
import { REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/http/origin-check";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const currentUser = await getCurrentUserFromRequest(request);
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

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);

  return response;
}
