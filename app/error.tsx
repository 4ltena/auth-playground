"use client";

import { useEffect } from "react";

/*
 * 想定していない例外の受け皿。
 *
 * このバージョンの Next.js では、この特殊ファイルが受け取る再試行用の関数は
 * retry という名前である（reset も残ってはいるが、ドキュメントは retry を使う
 * よう案内している）。名前だけで reset だと思い込むと型エラーで気づける。
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center px-6 sm:px-10">
      <div className="shell-narrow">
        <p className="label mb-6">エラー</p>
        <h1 className="font-bold tracking-tight text-3xl leading-relaxed tracking-wide">
          問題が起きました
        </h1>
        <p className="mt-6 text-ink-soft">
          時間をおいて、もう一度お試しください。繰り返し起きる場合は、そのときの操作の内容をお控えください。
        </p>
        <button type="button" onClick={() => retry()} className="btn mt-10">
          もう一度試す
        </button>
      </div>
    </div>
  );
}
