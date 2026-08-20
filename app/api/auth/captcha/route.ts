import { NextResponse } from "next/server";
import { generateCaptcha } from "@/lib/auth/captcha";

export async function GET() {
  const { svg, token } = await generateCaptcha();
  return NextResponse.json({ svg, token });
}
