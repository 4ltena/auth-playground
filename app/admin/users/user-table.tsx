"use client";

import { useEffect, useState } from "react";
import { fetchWithSilentRefresh } from "@/lib/auth/silent-refresh";

type AdminUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
};

export function UserTable() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetchWithSilentRefresh("/api/admin/users");
    if (!res.ok) {
      setError("読み込みに失敗しました。管理者としてログインし直してください。");
      return;
    }
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "suspend" | "activate" | "unlock") {
    await fetchWithSilentRefresh(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  }

  if (error) return <p role="alert">{error}</p>;
  if (!users) return <p>読み込み中…</p>;

  return (
    <table className="spec-table w-full text-left">
      <thead>
        <tr>
          <th>メールアドレス</th>
          <th>権限</th>
          <th>状態</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td>{u.email}</td>
            <td>{u.role}</td>
            <td>{u.status}</td>
            <td className="flex gap-2">
              {u.status === "ACTIVE" ? (
                <button onClick={() => act(u.id, "suspend")} className="btn-ghost btn-sm">
                  停止
                </button>
              ) : (
                <button onClick={() => act(u.id, "activate")} className="btn-ghost btn-sm">
                  解除
                </button>
              )}
              <button onClick={() => act(u.id, "unlock")} className="btn-ghost btn-sm">
                ロック解除
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
