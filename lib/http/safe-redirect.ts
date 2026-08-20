import "server-only";

import { headers } from "next/headers";

/*
 * redirect 先が同一オリジンかどうかの判定。この形の脆弱性はこのリポジトリに
 * 三度出た。
 *
 *   1. app/auth/callback/route.ts — 文字列の形（先頭が / で // でない）で
 *      弾く実装が入り、レビューで見つかった。
 *   2. 同じ場所を「解決結果の origin を比べる」形へ直した。/\evil.example の
 *      ようにバックスラッシュがスラッシュ扱いされる経路は、文字列側では
 *      網羅できないと分かったため。
 *   3. app/works/actions.ts の confirmAge が、その教訓を知らないまま
 *      redirect(next) を検証なしで書いて再発した。
 *
 * 三度目が起きたのは、直した場所が呼び出し側 (route handler) に
 * 留まっていたから。次に redirect を書く人が同じ検査を思い出す必要が
 * 無いよう、判定そのものをここへ一本化する。redirect 先を利用者の入力
 * (next クエリ・フォーム値) から決める処理は、必ずこの関数を経由すること。
 */

/**
 * next を解決し、同一オリジンでなければ fallbackPath へ落とす。
 * 文字列の形では判定しない。絶対 URL・プロトコル相対・バックスラッシュ混じりの
 * いずれであっても、URL として解決した結果の origin を比較する。
 */
export function resolveSameOriginTarget(
  next: string | null,
  origin: string,
  fallbackPath: string,
): URL {
  const fallback = new URL(fallbackPath, origin);
  if (!next) return fallback;

  const candidate = new URL(next, origin);
  return candidate.origin === origin ? candidate : fallback;
}

/**
 * Server Action から呼ぶための薄い包み。Server Action は Route Handler と
 * 違って request.url を持たないので、現在のリクエストの origin を headers()
 * から組み立てる。x-forwarded-proto が無ければ（このプロセスの前段に
 * プロトコルを教えてくれるプロキシが無ければ）NODE_ENV から推測する。
 */
export async function resolveSameOriginTargetFromHeaders(
  next: string | null,
  fallbackPath: string,
): Promise<URL> {
  const list = await headers();
  const host = list.get("host") ?? "";
  const proto =
    list.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return resolveSameOriginTarget(next, `${proto}://${host}`, fallbackPath);
}
