/*
 * 2026-08-16 セキュリティ監査 R66。
 *
 * ダッシュボードには削除・公開・リンク無効化の操作があり、frame-ancestors と
 * X-Frame-Options が無いと、埋め込んだフレーム越しに作者を誤クリックさせる
 * clickjacking の入口になる。指摘は「枠に埋め込ませない」ことだけなので、
 * script-src まで含む完全な CSP（nonce の配線が要る）は意図的に範囲外にする。
 *
 * source: '/:path*' はすべての経路に一致する（node_modules/next/dist/docs の
 * headers.md 参照）。ここで返すヘッダーは経路によらず一律でよい —
 * 公開ページを埋め込ませない制約は、認証済み画面だけを守るより安全側に振れる。
 */
const isProduction = process.env.NODE_ENV === "production";

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // preload は付けない。R66 が求めたのは max-age と includeSubDomains まで。
  // preload はブラウザ同梱リストへの登録という片道の約束で、apex ドメインと
  // すべてのサブドメインを一度に縛る。ドメインが決まる前に決めることではない
  // （再レビュー、小さな指摘）。
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
