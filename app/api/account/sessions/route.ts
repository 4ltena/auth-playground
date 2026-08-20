import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listActiveSessions } from "@/lib/auth/session";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sessions = await listActiveSessions(currentUser.sub);
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      rememberMe: s.rememberMe,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      expiresAt: s.expiresAt,
    })),
  });
}
