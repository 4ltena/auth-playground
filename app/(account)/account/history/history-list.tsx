"use client";

import { useEffect, useState } from "react";
import { fetchWithSilentRefresh } from "@/lib/auth/silent-refresh";
import { fullDateTime } from "@/app/_components/format";

type Entry = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
};

export function HistoryList() {
  const [history, setHistory] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithSilentRefresh("/api/account/history").then(async (res) => {
      if (!res.ok) {
        setError("読み込みに失敗しました。再度ログインしてください。");
        return;
      }
      const data = await res.json();
      setHistory(data.history);
    });
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!history) return <p>読み込み中…</p>;
  if (history.length === 0) return <p>ログイン履歴はありません。</p>;

  return (
    <ul className="flex flex-col gap-2">
      {history.map((entry) => (
        <li key={entry.id} className="text-[0.9rem]">
          <span className={entry.success ? "" : "text-stop"}>{entry.success ? "成功" : "失敗"}</span>
          {" — "}
          {fullDateTime(entry.createdAt)}
          {" — "}
          {entry.ipAddress ?? "不明"} / {entry.userAgent ?? "不明"}
        </li>
      ))}
    </ul>
  );
}
