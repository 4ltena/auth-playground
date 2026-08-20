import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_MAX_AGE } from "@/lib/auth/jwt";
import { issueRefreshToken, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/data/user";
import { recordLoginHistory } from "@/lib/data/loginHistory";
import { checkLoginAttempt, recordLoginFailure, resetLoginAttempts } from "@/lib/auth/rateLimit";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { clientIpFromRequest } from "@/lib/http/client-ip";
import { isSameOriginRequest } from "@/lib/http/origin-check";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const rememberMe = body?.rememberMe === true;
  const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : "";
  const captchaAnswer = typeof body?.captchaAnswer === "string" ? body.captchaAnswer : "";

  const ip = clientIpFromRequest(request);
  const userAgent = request.headers.get("user-agent");

  const { locked, requireCaptcha } = await checkLoginAttempt(email);
  if (locked) {
    return NextResponse.json({ error: "locked" }, { status: 429 });
  }
  if (requireCaptcha && !(await verifyCaptcha(captchaToken, captchaAnswer))) {
    return NextResponse.json({ error: "captcha_failed", requireCaptcha: true }, { status: 400 });
  }

  const user = email ? await findUserByEmail(email) : null;
  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordOk) {
    await recordLoginFailure(email);
    if (user) {
      await recordLoginHistory({ userId: user.id, success: false, ipAddress: ip, userAgent });
    }
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // Suspension is checked separately from the credential check, and does NOT
  // count against the rate limiter — the password was correct, so counting
  // it as a "failure" would let an admin's suspend action lock the account
  // owner out of their own rate-limit bucket (a real account-holder with the
  // right password shouldn't be treated the same as a guesser).
  if (user.status === "SUSPENDED") {
    await recordLoginHistory({ userId: user.id, success: false, ipAddress: ip, userAgent });
    return NextResponse.json({ error: "account_suspended" }, { status: 401 });
  }

  await resetLoginAttempts(email);
  await recordLoginHistory({ userId: user.id, success: true, ipAddress: ip, userAgent });

  const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const { token: refreshToken, maxAgeSeconds } = await issueRefreshToken({
    userId: user.id,
    rememberMe,
    userAgent,
    ipAddress: ip,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });

  return response;
}
