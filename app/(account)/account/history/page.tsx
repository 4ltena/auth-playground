import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { HistoryList } from "./history-list";

export default async function HistoryPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?next=/account/history");

  return (
    <main className="shell-narrow mx-auto py-20">
      <h1 className="font-bold tracking-tight text-3xl mb-8">ログイン履歴</h1>
      <HistoryList />
    </main>
  );
}
