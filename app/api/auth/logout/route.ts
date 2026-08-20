import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/jwt";
import { REFRESH_TOKEN_COOKIE, revokeRefreshToken } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/http/origin-check";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) await revokeRefreshToken(refreshToken);

  jar.delete(ACCESS_TOKEN_COOKIE);
  jar.delete(REFRESH_TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
