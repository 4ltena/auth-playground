import { defineConfig } from "@playwright/test";

// Runs the full auth flow through a real browser: signup, login, cookie
// handling, proxy.ts redirects, and screen transitions — none of which
// unit tests or DB tests touch.
if (process.env.AUTH_TEST_POSTGRES !== "1") throw new Error("Use npm run test:e2e with the isolated test database.");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3107",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "npm run dev -- --port 3107",
    url: "http://localhost:3107",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
