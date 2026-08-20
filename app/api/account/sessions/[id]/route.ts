import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { revokeSessionById } from "@/lib/auth/session";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await context.params;
  await revokeSessionById(currentUser.sub, id);

  return NextResponse.json({ ok: true });
}
