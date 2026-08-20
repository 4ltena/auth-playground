"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
};

export function HistoryList() {
  const [history, setHistory] = useState<Entry[] | null>(null);

  useEffect(() => {
    fetch("/api/account/history")
      .then((res) => res.json())
      .then((data) => setHistory(data.history));
  }, []);

  if (!history) return <p>読み込み中…</p>;
  if (history.length === 0) return <p>ログイン履歴はありません。</p>;

  return (
    <ul className="flex flex-col gap-2">
      {history.map((entry) => (
        <li key={entry.id} className="text-[0.9rem]">
          <span className={entry.success ? "" : "text-stop"}>{entry.success ? "成功" : "失敗"}</span>
          {" — "}
          {new Date(entry.createdAt).toLocaleString("ja-JP")}
          {" — "}
          {entry.ipAddress ?? "不明"} / {entry.userAgent ?? "不明"}
        </li>
      ))}
    </ul>
  );
}
