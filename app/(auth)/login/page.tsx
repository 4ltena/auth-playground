"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PasswordInput } from "@/app/_components/auth/PasswordInput";
import { CaptchaWidget } from "@/app/_components/auth/CaptchaWidget";

const REMEMBERED_EMAIL_KEY = "auth_playground_remembered_email";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

const LOGIN_ERROR_MESSAGE: Record<string, string> = {
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません。",
  account_suspended: "このアカウントは停止されています。",
  locked: "試行回数が上限に達しました。しばらくしてから再度お試しください。",
  captcha_failed: "画像の文字が正しくありません。",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [autofillId, setAutofillId] = useState(false);
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (remembered) {
      setEmail(remembered);
      setAutofillId(true);
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe, captchaToken, captchaAnswer }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (data.requireCaptcha) setRequireCaptcha(true);
      setError(LOGIN_ERROR_MESSAGE[data.error] ?? "ログインに失敗しました。");
      return;
    }

    if (autofillId) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);

    const next = searchParams.get("next") ?? "/account";
    router.push(next);
    router.refresh();
  }

  return (
    <main className="shell-narrow mx-auto py-20">
      <h1 className="font-bold tracking-tight text-3xl mb-8">ログイン</h1>
      {searchParams.get("signedUp") === "1" ? (
        <p className="mb-6 text-[0.9rem]">登録が完了しました。ログインしてください。</p>
      ) : null}
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
          />
        </label>
        <PasswordInput label="パスワード" value={password} onChange={setPassword} autoComplete="current-password" />

        <label className="flex items-center gap-2 text-[0.9rem]">
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
          ログイン状態を保持する
        </label>
        <label className="flex items-center gap-2 text-[0.9rem]">
          <input type="checkbox" checked={autofillId} onChange={(e) => setAutofillId(e.target.checked)} />
          次回からログインIDを自動入力する
        </label>

        {requireCaptcha ? (
          <CaptchaWidget answer={captchaAnswer} onAnswerChange={setCaptchaAnswer} onTokenChange={setCaptchaToken} />
        ) : null}

        {error ? (
          <p role="alert" className="text-[0.85rem] text-stop">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={submitting} className="btn mt-2">
          ログイン
        </button>
      </form>
      <p className="mt-4 text-[0.9rem]">
        <Link href="/password-reset" className="underline">
          パスワードをお忘れですか？
        </Link>
      </p>
      <p className="mt-2 text-[0.9rem]">
        アカウントをお持ちでない方は
        <Link href="/signup" className="underline">
          新規登録
        </Link>
      </p>
    </main>
  );
}
