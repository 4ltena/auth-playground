import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auth Playground",
  description: "認証・認可機能の学習用アプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
