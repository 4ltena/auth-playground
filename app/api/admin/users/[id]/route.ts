import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findUserById, setUserStatus } from "@/lib/data/user";
import { unlockAllForEmail } from "@/lib/auth/rateLimit";

const ACTIONS = ["suspend", "activate", "unlock"] as const;
type Action = (typeof ACTIONS)[number];

function isAction(value: unknown): value is Action {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (!isAction(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const target = await findUserById(id);
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "suspend") await setUserStatus(target.id, "SUSPENDED");
  if (action === "activate") await setUserStatus(target.id, "ACTIVE");
  if (action === "unlock") await unlockAllForEmail(target.email);

  return NextResponse.json({ ok: true });
}
