import { register } from "node:module";
import { pathToFileURL } from "node:url";

/*
 * npm run db:terms は plain node で .ts を直接実行する（node --experimental-strip-types）。
 *
 * このコードベースはバンドラ前提で書かれている
 * （拡張子を省いた相対 import、tsconfig の "@/*" エイリアス）。
 * plain node の ESM 解決はどちらもやらないので、node --import でこのファイルを先に
 * 読み込ませ、解決フックだけをここで肩代わりする。ソース側は一切変えない。
 */
register("./ts-node-resolve-hooks.mjs", pathToFileURL(`${import.meta.dirname}/`));
