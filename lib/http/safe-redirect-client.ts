"use client";

// Client-side counterpart to lib/http/safe-redirect.ts's origin-comparison
// approach (see that file's comment for why string-prefix checks alone
// aren't enough — e.g. `\evil.example` gets treated as a path by some
// parsers). Used wherever a `?next=` query param feeds a client-side
// router.push (server-side redirects should use safe-redirect.ts instead).
export function safeNextPath(next: string | null, fallback: string): string {
  if (!next) return fallback;
  try {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
