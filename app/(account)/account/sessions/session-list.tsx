"use client";

import { useEffect, useState } from "react";

type Session = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  rememberMe: boolean;
  createdAt: string;
  lastUsedAt: string;
};

export function SessionList() {
  const [sessions, setSessions] = useState<Session[] | null>(null);

  async function load() {
    const res = await fetch("/api/account/sessions");
    const data = await res.json();
    setSessions(data.sessions);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRevoke(id: string) {
    await fetch(`/api/account/sessions/${id}`, { method: "DELETE" });
    load();
  }

  if (!sessions) return <p>読み込み中…</p>;
  if (sessions.length === 0) return <p>アクティブなセッションはありません。</p>;

  return (
    <ul className="flex flex-col gap-3">
      {sessions.map((s) => (
        <li key={s.id} className="card flex justify-between items-center gap-4">
          <div>
            <p className="text-[0.9rem]">{s.userAgent ?? "不明な端末"}</p>
            <p className="text-[0.8rem] text-ink-soft">
              IP: {s.ipAddress ?? "不明"} / 最終利用: {new Date(s.lastUsedAt).toLocaleString("ja-JP")}
              {s.rememberMe ? "（ログイン状態を保持）" : ""}
            </p>
          </div>
          <button onClick={() => handleRevoke(s.id)} className="btn-ghost btn-sm">
            ログアウト
          </button>
        </li>
      ))}
    </ul>
  );
}
