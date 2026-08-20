import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/jwt";
import { REFRESH_TOKEN_COOKIE, revokeRefreshToken } from "@/lib/auth/session";

export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) await revokeRefreshToken(refreshToken);

  jar.delete(ACCESS_TOKEN_COOKIE);
  jar.delete(REFRESH_TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
