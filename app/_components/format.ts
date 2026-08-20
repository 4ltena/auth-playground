/*
 * 画面に出す日時の書式。
 * 表示形式を変えるときはこのファイルだけを直す。
 *
 * データベースの timestamptz は UTC の ISO 8601 で届く (末尾が "Z" または
 * "+00:00")。以前はこの文字列を文字列のまま切り出していたため、見た目は
 * ローカル時刻の書式でも中身は UTC のままだった。同意日時・閲覧日時は
 * 証拠として画面に出す値なので、JST で読めて、それが JST だと分かる形に直す。
 * 表示以外の用途（DB へ渡す・比較する）には使わない — その場合は元の ISO
 * 文字列をそのまま扱うこと。
 */

const JST_OFFSET_MINUTES = 9 * 60;

function toJst(iso: string): Date {
  return new Date(new Date(iso).getTime() + JST_OFFSET_MINUTES * 60_000);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 08/14 18:42 JST。一覧や履歴のように、年が自明な場所で使う。 */
export function shortDateTime(iso: string): string {
  const d = toJst(iso);
  return `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} JST`;
}

/** 2026-08-14 18:42:31 JST。記録の表示のように、正確さが要る場所で使う。 */
export function fullDateTime(iso: string): string {
  const d = toJst(iso);
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return `${date} ${time} JST`;
}
