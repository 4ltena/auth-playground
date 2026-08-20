import { NextResponse, type NextRequest } from "next/server";
import { signAccessToken, ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_MAX_AGE } from "@/lib/auth/jwt";
import { rotateRefreshToken, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";
import { findUserById } from "@/lib/data/user";
import { isSameOriginRequest } from "@/lib/http/origin-check";

// Silent refresh endpoint: exchanges a valid refresh token cookie for a new
// access token, rotating the refresh token in the same call.
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "no_refresh_token" }, { status: 401 });
  }

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) {
    const response = NextResponse.json({ error: "invalid_refresh_token" }, { status: 401 });
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  const user = await findUserById(rotated.userId);
  if (!user || user.status === "SUSPENDED") {
    const response = NextResponse.json({ error: "account_unavailable" }, { status: 401 });
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, rotated.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: rotated.maxAgeSeconds,
  });

  return response;
}
