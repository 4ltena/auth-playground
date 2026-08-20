import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // app/ も見る。掲示物（規約・プライバシーポリシー・権利侵害の申出）は
    // app/ にあり、実装とずれても画面は普通に出るので、試験で縛る必要がある。
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    env: { KOEDAMA_HASH_PEPPER: "test-pepper" },
  },
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname,
      // Next.js handles `import "server-only"` itself at build time and never runs
      // the npm package's own code (see node_modules/next/dist/docs/01-app/02-guides/
      // data-security.md). Vitest has no such handling: plain Node/Vite module
      // resolution picks the package's "default" export condition, whose index.js
      // unconditionally throws ("cannot be imported from a Client Component").
      // That's meant for an actual client bundle, not a unit test running server
      // code directly in Node. Alias straight to the package's own no-op file
      // (the branch Next's RSC condition would pick) so lib/data's server-only
      // modules stay testable without weakening the real build-time guard.
      "server-only": new URL(
        "./node_modules/server-only/empty.js",
        import.meta.url,
      ).pathname,
    },
  },
});
