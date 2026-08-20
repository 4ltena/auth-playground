import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { UserTable } from "./user-table";

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?next=/admin/users");
  if (currentUser.role !== "ADMIN") redirect("/account");

  return (
    <main className="shell-narrow mx-auto py-20">
      <h1 className="font-bold tracking-tight text-3xl mb-8">ユーザー管理</h1>
      <UserTable />
    </main>
  );
}
