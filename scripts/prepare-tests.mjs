// Offline unit tests use a separate generated client and disposable local SQLite.
// Neither the developer's .env.local nor a production DB URL is read here.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
const directory = resolve("node_modules/.auth-playground-test");
mkdirSync(directory, { recursive: true });
const schema = readFileSync("prisma/schema.prisma", "utf8")
  .replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "./client"')
  .replace('provider = "postgresql"', 'provider = "sqlite"')
  .replace(/\s*directUrl\s*=.*\n/, "\n")
  .replace(/ @db\.Timestamptz\(3\)/g, "");
const path = `${directory}/schema.prisma`;
writeFileSync(path, schema);
new DatabaseSync(`${directory}/unit.db`).close();
const env = { ...process.env, CHECKPOINT_DISABLE: "1", DATABASE_URL: `file:${directory}/unit.db` };
for (const args of [["generate", "--schema", path], ["db", "push", "--schema", path, "--skip-generate"]]) {
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", ...args], { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
