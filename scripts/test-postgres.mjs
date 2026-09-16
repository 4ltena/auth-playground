import { spawnSync } from "node:child_process";
const value = process.env.TEST_DATABASE_URL;
if (!value) throw new Error("Set TEST_DATABASE_URL to a disposable PostgreSQL database named auth_playground_test.");
const url = new URL(value);
if (!["postgres:", "postgresql:"].includes(url.protocol) || url.pathname !== "/auth_playground_test" ||
    !process.env.TEST_DATABASE_HOST || url.hostname !== process.env.TEST_DATABASE_HOST) {
  throw new Error("Refusing tests: require database auth_playground_test and an explicit matching TEST_DATABASE_HOST.");
}
const env = { ...process.env, DATABASE_URL: value, DATABASE_URL_UNPOOLED: value, AUTH_TEST_POSTGRES: "1",
  JWT_SECRET: "test-only-secret-not-for-deployment-00000000", CHECKPOINT_DISABLE: "1" };
const mode = process.argv[2];
for (const args of [
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  mode === "e2e" ? ["node_modules/@playwright/test/cli.js", "test"] : ["node_modules/vitest/vitest.mjs", "run"],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
