import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Also matches root-level test files (e.g. proxy.test.ts).
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "*.test.ts"],
    env: {
      JWT_SECRET: "test-secret-at-least-32-bytes-long-000000",
      // Relative to prisma/schema.prisma's directory, not the cwd — this
      // resolves to prisma/test.db, not prisma/prisma/test.db (see the same
      // gotcha noted in .env.local for DATABASE_URL).
      DATABASE_URL: "file:./test.db",
    },
    // Every DB-touching test file's afterEach does an unscoped deleteMany()
    // (simplest way to keep each test isolated within its own file). Running
    // test files in parallel against the same SQLite file lets one file's
    // cleanup wipe rows a concurrently-running file is still using —
    // observed as spurious foreign-key/unique-constraint failures. Files
    // still run in one process (no IPC overhead), just not concurrently.
    fileParallelism: false,
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
