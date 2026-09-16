import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const app = new URL(process.env.APP_URL ?? "invalid");
if (app.protocol !== "https:" || app.username || app.password || app.search || app.hash) {
  throw new Error("APP_URL must be the verified HTTPS application URL without credentials, query or fragment.");
}
const escaped = app.href.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
mkdirSync("out", { recursive: true });
writeFileSync("out/index.html", readFileSync("site/index.html", "utf8").replace("{{APP_URL}}", escaped));
writeFileSync("out/.nojekyll", "");
