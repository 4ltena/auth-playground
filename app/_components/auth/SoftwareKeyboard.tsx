"use client";

import { useMemo } from "react";

const BASE_ROWS = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

// On-screen keyboard for password entry — a keylogger countermeasure. Key
// layout is shuffled each time it mounts so a keylogger recording physical
// keystrokes gains nothing (this only helps against physical/OS-level
// keyloggers; a screen recorder still defeats it).
export function SoftwareKeyboard({
  onKey,
  onBackspace,
}: {
  onKey: (char: string) => void;
  onBackspace: () => void;
}) {
  const rows = useMemo(() => BASE_ROWS.map((row) => shuffle(row.split(""))), []);

  return (
    <div className="mt-2 flex flex-col gap-1 border rounded p-2 bg-white/50" role="group" aria-label="ソフトウェアキーボード">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1 justify-center">
          {row.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => onKey(char)}
              className="w-7 h-8 text-sm border rounded bg-white hover:bg-gray-100"
            >
              {char}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center mt-1">
        <button type="button" onClick={onBackspace} className="btn-sm px-4">
          削除
        </button>
      </div>
    </div>
  );
}
