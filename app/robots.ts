import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

/*
 * Google の文書はこう定めている。
 * robots.txt で遮っただけでは索引を防げない。クローラが noindex を読めなくなるだけで、
 * 他所からリンクされていれば索引されうる。索引を止めるには noindex を読ませる必要がある。
 *
 * したがって、非公開の経路はクロールを許したうえで、各ページに noindex を出す。
 * 遮るのは、索引の対象になりようがない内部の経路だけにとどめる。
 */


export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // API と Next.js の内部経路のみ遮る。/s と /works は noindex で止める
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
