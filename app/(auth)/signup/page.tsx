"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordInput } from "@/app/_components/auth/PasswordInput";
import { CaptchaWidget } from "@/app/_components/auth/CaptchaWidget";
import { SECURITY_QUESTIONS, type SecurityQuestionKey } from "@/lib/auth/securityQuestions";

const SIGNUP_ERROR_MESSAGE = {
  invalid_email: "メールアドレスの形式が正しくありません。",
  weak_password: "パスワードは8文字以上で入力してください。",
  password_mismatch: "パスワードが一致しません。",
  email_taken: "このメールアドレスは既に登録されています。",
  captcha_failed: "画像の文字が正しくありません。",
  security_question_required: "秘密の質問と答えを入力してください。",
} as const;

type SignupErrorCode = keyof typeof SIGNUP_ERROR_MESSAGE;

function isSignupErrorCode(value: unknown): value is SignupErrorCode {
  return typeof value === "string" && value in SIGNUP_ERROR_MESSAGE;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityQuestionKey, setSecurityQuestionKey] = useState<SecurityQuestionKey>(SECURITY_QUESTIONS[0].key);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaRound, setCaptchaRound] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!email) {
      setEmailTaken(false);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setEmailTaken(!!data.taken);
    }, 400);
    return () => clearTimeout(timer);
  }, [email]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        confirmPassword,
        securityQuestionKey,
        securityAnswer,
        captchaToken,
        captchaAnswer,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const data: unknown = await response.json().catch(() => ({}));
      const code = (data as { error?: unknown })?.error;
      setCaptchaRound((round) => round + 1); // fresh challenge on any failure, spent token/answer is unusable
      setCaptchaAnswer("");
      setError(isSignupErrorCode(code) ? SIGNUP_ERROR_MESSAGE[code] : "登録に失敗しました。");
      return;
    }

    router.push("/login?signedUp=1");
  }

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  return (
    <main className="shell-narrow mx-auto py-20">
      <h1 className="font-bold tracking-tight text-3xl mb-8">アカウント作成</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm" noValidate>
        <label className="flex flex-col gap-1">
          <span className="field-label">メールアドレス</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            aria-invalid={emailTaken}
          />
          {emailTaken ? (
            <span role="alert" className="text-[0.85rem] text-stop">
              このメールアドレスは既に登録されています。
            </span>
          ) : null}
        </label>

        <PasswordInput label="パスワード" value={password} onChange={setPassword} autoComplete="new-password" showStrength />

        <div className="flex flex-col gap-1">
          <PasswordInput
            label="パスワード（確認用）"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
          {!passwordsMatch ? (
            <span role="alert" className="text-[0.85rem] text-stop">
              パスワードが一致しません。
            </span>
          ) : null}
        </div>

        <label className="flex flex-col gap-1">
          <span className="field-label">秘密の質問（パスワード再設定に使用）</span>
          <select
            value={securityQuestionKey}
            onChange={(e) => setSecurityQuestionKey(e.target.value as SecurityQuestionKey)}
            className="field"
          >
            {SECURITY_QUESTIONS.map((q) => (
              <option key={q.key} value={q.key}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">上記の質問への答え</span>
          <input
            type="text"
            required
            value={securityAnswer}
            onChange={(e) => setSecurityAnswer(e.target.value)}
            className="field"
          />
        </label>

        <CaptchaWidget answer={captchaAnswer} onAnswerChange={setCaptchaAnswer} onTokenChange={setCaptchaToken} />

        {error ? (
          <p role="alert" className="text-[0.85rem] text-stop">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={submitting} className="btn mt-2">
          登録する
        </button>
      </form>
      <p className="mt-6 text-[0.9rem]">
        アカウントをお持ちの方は
        <Link href="/login" className="underline">
          ログイン
        </Link>
      </p>
    </main>
  );
}
