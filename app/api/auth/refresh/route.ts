import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signAccessToken, ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_MAX_AGE } from "@/lib/auth/jwt";
import { rotateRefreshToken, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";
import { findUserById } from "@/lib/data/user";

// Silent refresh endpoint: exchanges a valid refresh token cookie for a new
// access token, rotating the refresh token in the same call.
export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "no_refresh_token" }, { status: 401 });
  }

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) {
    jar.delete(ACCESS_TOKEN_COOKIE);
    jar.delete(REFRESH_TOKEN_COOKIE);
    return NextResponse.json({ error: "invalid_refresh_token" }, { status: 401 });
  }

  const user = await findUserById(rotated.userId);
  if (!user || user.status === "SUSPENDED") {
    jar.delete(ACCESS_TOKEN_COOKIE);
    jar.delete(REFRESH_TOKEN_COOKIE);
    return NextResponse.json({ error: "account_unavailable" }, { status: 401 });
  }

  const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role });

  jar.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  jar.set(REFRESH_TOKEN_COOKIE, rotated.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: rotated.maxAgeSeconds,
  });

  return NextResponse.json({ ok: true });
}
