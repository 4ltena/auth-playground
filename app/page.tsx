import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell-narrow mx-auto py-20">
      <h1 className="font-bold tracking-tight text-3xl mb-8">Auth Playground</h1>
      <div className="flex gap-4">
        <Link href="/login" className="btn">
          ログイン
        </Link>
        <Link href="/signup" className="btn-ghost">
          新規登録
        </Link>
      </div>
    </main>
  );
}
