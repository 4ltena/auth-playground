import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/data/user";

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!email) return NextResponse.json({ taken: false });
  const existing = await findUserByEmail(email);
  return NextResponse.json({ taken: !!existing });
}
