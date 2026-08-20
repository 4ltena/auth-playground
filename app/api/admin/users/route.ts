import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listUsers } from "@/lib/data/user";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const users = await listUsers();
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
    })),
  });
}
