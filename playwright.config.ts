import { defineConfig } from "@playwright/test";

/*
 * 画面を通して一本踏む（設計 11 節）。
 *
 * 単体試験と DB 試験が触れないのは、Server Action の配線、cookie の受け渡し、
 * リダイレクト、プロキシの認証、画面の分岐である。そこは今まったくの空白なので、
 * 壊れても気づくのは利用者が最初になる。
 *
 * 直列で走らせる。作品と共有リンクを実際に作り、監査連鎖に積むので、
 * 並行に走らせると互いの記録を踏む。速さより、読める失敗のほうがいる。
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    // localhost で揃える。127.0.0.1 と混ぜると、ログイン用リンクの往復で
    // host が変わり、PKCE の検証子 cookie が届かず交換に失敗する。
    // supabase/config.toml の additional_redirect_urls も localhost を許している。
    baseURL: "http://localhost:3000",
    // 落ちたときに何が起きていたかを残す。画面の試験は再現が面倒なので
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // ログインは一度だけ。毎回入り直すとメールの送信上限に当たる
    { name: "setup", testMatch: /auth\.setup\.ts/, use: { browserName: "chromium" } },
    {
      name: "chromium",
      use: { browserName: "chromium", storageState: "e2e/.auth/author.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
