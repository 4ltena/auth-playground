import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LogoutButton } from "./logout-button";
import { ChangePasswordForm } from "./change-password-form";

export default async function AccountPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?next=/account");

  return (
    <main className="shell-narrow mx-auto py-20 flex flex-col gap-10">
      <div>
        <h1 className="font-bold tracking-tight text-3xl mb-4">アカウント</h1>
        <p className="mb-6">{currentUser.email} としてログインしています。</p>
        <div className="flex gap-4 text-[0.9rem]">
          <Link href="/account/sessions" className="underline">
            ログイン中のセッション一覧
          </Link>
          <Link href="/account/history" className="underline">
            ログイン履歴
          </Link>
          <Link href="/account/delete" className="underline">
            退会
          </Link>
          {currentUser.role === "ADMIN" ? (
            <Link href="/admin/users" className="underline">
              管理者メニュー
            </Link>
          ) : null}
        </div>
      </div>

      <ChangePasswordForm />

      <LogoutButton />
    </main>
  );
}
