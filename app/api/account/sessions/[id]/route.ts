import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { revokeSessionById } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/http/origin-check";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const currentUser = await getCurrentUserFromRequest(request);
  if (!currentUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const revoked = await revokeSessionById(currentUser.sub, id);
  if (!revoked) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
