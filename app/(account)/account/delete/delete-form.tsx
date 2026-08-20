"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/app/_components/auth/PasswordInput";

export function DeleteAccountForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("パスワードが正しくありません。");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <p className="text-[0.9rem] text-stop">アカウントを削除すると元に戻せません。</p>
      <PasswordInput label="パスワード（確認）" value={password} onChange={setPassword} autoComplete="current-password" />
      {error ? (
        <p role="alert" className="text-[0.85rem] text-stop">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn-stop self-start">
        アカウントを削除する
      </button>
    </form>
  );
}
