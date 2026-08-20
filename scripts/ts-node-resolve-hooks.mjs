import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

/*
 * "@/lib/foo" → <project root>/lib/foo、"./bar"（拡張子なし）→ 同じディレクトリの bar。
 * どちらも解決できたら .ts、次に /index.ts の順で試す。
 * 見つからなければ元の候補のまま次のフックへ渡し、Node 本来のエラーを出させる。
 */
const root = pathToFileURL(`${process.cwd()}/`).href;

function candidatesFor(url) {
  if (/\.[a-zA-Z0-9]+$/.test(url)) return [url];
  return [`${url}.ts`, `${url}/index.ts`];
}

export async function resolve(specifier, context, nextResolve) {
  const isAlias = specifier.startsWith("@/");
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  if (!isAlias && !isRelative) return nextResolve(specifier, context);

  const base = isAlias
    ? new URL(specifier.slice(2), root).href
    : new URL(specifier, context.parentURL).href;

  for (const candidate of candidatesFor(base)) {
    if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate, context);
  }
  return nextResolve(base, context);
}
