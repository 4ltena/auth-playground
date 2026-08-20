import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { SessionList } from "./session-list";

export default async function SessionsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?next=/account/sessions");

  return (
    <main className="shell-narrow mx-auto py-20">
      <h1 className="font-bold tracking-tight text-3xl mb-8">ログイン中のセッション</h1>
      <SessionList />
    </main>
  );
}
