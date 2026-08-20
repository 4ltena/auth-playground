import type { MetadataRoute } from "next";

// Blocking with robots.txt alone doesn't prevent indexing — a crawler that
// can't read the page also can't read a noindex tag on it, and an
// externally-linked page can still get indexed. So disallow only routes
// that can never be meaningfully indexed (API, Next.js internals); every
// other private route (/account, /admin) carries its own noindex metadata
// instead (see app/_components/noindex.ts).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
  };
}
