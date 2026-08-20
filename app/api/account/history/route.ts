import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { listLoginHistory } from "@/lib/data/loginHistory";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUserFromRequest(request);
  if (!currentUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const history = await listLoginHistory(currentUser.sub);
  return NextResponse.json({ history });
}
