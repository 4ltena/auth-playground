import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_MAX_AGE } from "@/lib/auth/jwt";
import { issueRefreshToken, REFRESH_TOKEN_COOKIE } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/data/user";
import { recordLoginHistory } from "@/lib/data/loginHistory";
import { checkLoginAttempt, recordLoginFailure, resetLoginAttempts } from "@/lib/auth/rateLimit";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { clientIpFromRequest } from "@/lib/http/client-ip";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const rememberMe = body?.rememberMe === true;
  const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : "";
  const captchaAnswer = typeof body?.captchaAnswer === "string" ? body.captchaAnswer : "";

  const ip = clientIpFromRequest(request);
  const userAgent = request.headers.get("user-agent");

  const { locked, requireCaptcha } = await checkLoginAttempt(email, ip);
  if (locked) {
    return NextResponse.json({ error: "locked" }, { status: 429 });
  }
  if (requireCaptcha && !(await verifyCaptcha(captchaToken, captchaAnswer))) {
    return NextResponse.json({ error: "captcha_failed", requireCaptcha: true }, { status: 400 });
  }

  const user = email ? await findUserByEmail(email) : null;
  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordOk || user.status === "SUSPENDED") {
    await recordLoginFailure(email, ip);
    if (user) {
      await recordLoginHistory({ userId: user.id, success: false, ipAddress: ip, userAgent });
    }
    const error = user?.status === "SUSPENDED" ? "account_suspended" : "invalid_credentials";
    return NextResponse.json({ error }, { status: 401 });
  }

  await resetLoginAttempts(email, ip);
  await recordLoginHistory({ userId: user.id, success: true, ipAddress: ip, userAgent });

  const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const { token: refreshToken, maxAgeSeconds } = await issueRefreshToken({
    userId: user.id,
    rememberMe,
    userAgent,
    ipAddress: ip,
  });

  const jar = await cookies();
  jar.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  jar.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });

  return NextResponse.json({ ok: true });
}
