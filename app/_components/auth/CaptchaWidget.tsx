"use client";

import { useEffect, useId, useState } from "react";

export function CaptchaWidget({
  answer,
  onAnswerChange,
  onTokenChange,
}: {
  answer: string;
  onAnswerChange: (value: string) => void;
  onTokenChange: (token: string) => void;
}) {
  const id = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function reload() {
    setLoading(true);
    const res = await fetch("/api/auth/captcha");
    const data = await res.json();
    setSvg(data.svg);
    onTokenChange(data.token);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="field-label">
        画像の文字を入力してください
      </label>
      <div className="flex items-center gap-2">
        {svg ? (
          // Safe: svg is server-generated in lib/auth/captcha.ts from a fixed
          // charset (no user input is ever interpolated into the markup).
          // eslint-disable-next-line react/no-danger
          <div dangerouslySetInnerHTML={{ __html: svg }} aria-hidden="true" />
        ) : (
          <div className="w-[170px] h-[60px] bg-gray-100 flex items-center justify-center text-[0.8rem]">
            読込中…
          </div>
        )}
        <button type="button" onClick={reload} disabled={loading} className="btn-ghost btn-sm">
          再表示
        </button>
      </div>
      <input
        id={id}
        type="text"
        required
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        className="field"
        autoComplete="off"
      />
    </div>
  );
}
