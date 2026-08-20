import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listLoginHistory } from "@/lib/data/loginHistory";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const history = await listLoginHistory(currentUser.sub);
  return NextResponse.json({ history });
}
