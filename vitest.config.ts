import { defineConfig } from "vitest/config";

const postgres = process.env.AUTH_TEST_POSTGRES === "1";
if (postgres) {
  const url = new URL(process.env.DATABASE_URL ?? "invalid");
  if (url.pathname !== "/auth_playground_test" || url.hostname !== process.env.TEST_DATABASE_HOST) {
    throw new Error("Refusing to run destructive tests outside the explicitly named test database.");
  }
}

export default defineConfig({
  test: {
    // Also matches root-level test files (e.g. proxy.test.ts).
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "*.test.ts"],
    env: {
      JWT_SECRET: "test-secret-at-least-32-bytes-long-000000",
      // Always the isolated generated test client and local test database.
      DATABASE_URL: postgres ? process.env.DATABASE_URL! : `file:${new URL("./node_modules/.auth-playground-test/unit.db", import.meta.url).pathname}`,
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
      ...(postgres ? {} : { "@prisma/client": new URL("./node_modules/.auth-playground-test/client/index.js", import.meta.url).pathname }),
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
