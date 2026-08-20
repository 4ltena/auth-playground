"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/app/_components/auth/PasswordInput";
import { CaptchaWidget } from "@/app/_components/auth/CaptchaWidget";

export default function PasswordResetPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "answer">("email");
  const [email, setEmail] = useState("");
  const [questionLabel, setQuestionLabel] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/password-reset/verify-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      setError("該当するアカウントが見つかりません。");
      return;
    }
    const data = await res.json();
    setQuestionLabel(data.questionLabel);
    setStep("answer");
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/password-reset/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, securityAnswer, newPassword, captchaToken, captchaAnswer }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.requireCaptcha) setRequireCaptcha(true);
      setError(
        data.error === "answer_mismatch"
          ? "答えが正しくありません。"
          : data.error === "locked"
            ? "試行回数が上限に達しました。しばらくしてから再度お試しください。"
            : data.error === "captcha_failed"
              ? "画像の文字が正しくありません。"
              : "パスワードの再設定に失敗しました。",
      );
      return;
    }
    router.push("/login?resetDone=1");
  }

  return (
    <main className="shell-narrow mx-auto py-20">
      <h1 className="font-bold tracking-tight text-3xl mb-8">パスワードの再設定</h1>

      {step === "email" ? (
        <form onSubmit={handleLookup} className="flex flex-col gap-4 max-w-sm" noValidate>
          <label className="flex flex-col gap-1">
            <span className="field-label">メールアドレス</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </label>
          {error ? (
            <p role="alert" className="text-[0.85rem] text-stop">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn mt-2">
            次へ
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-4 max-w-sm" noValidate>
          <p className="field-label">{questionLabel}</p>
          <input
            type="text"
            required
            value={securityAnswer}
            onChange={(e) => setSecurityAnswer(e.target.value)}
            className="field"
          />
          <PasswordInput
            label="新しいパスワード"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            showStrength
          />
          {requireCaptcha ? (
            <CaptchaWidget answer={captchaAnswer} onAnswerChange={setCaptchaAnswer} onTokenChange={setCaptchaToken} />
          ) : null}
          {error ? (
            <p role="alert" className="text-[0.85rem] text-stop">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn mt-2">
            パスワードを再設定する
          </button>
        </form>
      )}
    </main>
  );
}
