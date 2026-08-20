/*
 * 非公開の経路につける指定。
 *
 * robots.txt で遮っただけでは索引を防げない。クローラが noindex を読めなくなるだけで、
 * 他所からリンクされていれば索引されうる。だからページ側で noindex を出す。
 *
 * この定数は app/dashboard/layout.tsx と app/s/layout.tsx、それに
 * app/login/page.tsx が使う。/works 配下は公開ページなのでこれを使わない。
 * 経路ごとに一度だけ宣言し、配下のページへ継承させる。ページ単位で書くと、
 * 新しいページを足した人が一行忘れた時点で共有リンクが検索に載る。
 */
import type { Metadata } from "next";

export const NOINDEX: Metadata["robots"] = { index: false, follow: false, nocache: true };
