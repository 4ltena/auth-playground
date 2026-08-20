import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center px-6 sm:px-10">
      <div className="shell-narrow">
        <p className="label mb-6">404</p>
        <h1 className="font-bold tracking-tight text-3xl leading-relaxed tracking-wide">ページが見つかりません</h1>
        <p className="mt-6 text-ink-soft">URLが間違っている可能性があります。</p>
        <Link href="/" className="btn mt-10">
          トップページへ
        </Link>
      </div>
    </div>
  );
}
