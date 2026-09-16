"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const pending = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError(false);
    setSvg(null);
    onTokenChange("");
    onAnswerChange("");
    try {
      const res = await fetch("/api/auth/captcha", { signal: controller.signal });
      if (!res.ok) throw new Error("Challenge unavailable");
      const data = await res.json();
      if (controller.signal.aborted) return;
      setSvg(data.svg);
      onTokenChange(data.token);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [onTokenChange, onAnswerChange]);

  useEffect(() => {
    void reload();
    return () => pending.current?.abort();
  }, [reload]);

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
            {error ? "読込に失敗しました" : "読込中…"}
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
        disabled={loading || error}
      />
    </div>
  );
}
