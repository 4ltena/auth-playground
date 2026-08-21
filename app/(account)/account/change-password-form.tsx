"use client";

import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/app/_components/auth/PasswordInput";
import { fetchWithSilentRefresh } from "@/lib/auth/silent-refresh";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const res = await fetchWithSilentRefresh("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(
        data.error === "current_password_incorrect" ? "現在のパスワードが正しくありません。" : "変更に失敗しました。",
      );
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setMessage("パスワードを変更しました。他のセッションはログアウトされました。");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <h2 className="font-bold text-lg">パスワードの変更</h2>
      <PasswordInput
        label="現在のパスワード"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
      />
      <PasswordInput
        label="新しいパスワード"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        showStrength
      />
      {message ? <p className="text-[0.85rem]">{message}</p> : null}
      <button type="submit" className="btn-ghost mt-2 self-start">
        変更する
      </button>
    </form>
  );
}
