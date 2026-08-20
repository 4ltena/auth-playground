// SameSite=Lax cookies already block cross-site form/simple-request POSTs
// in modern browsers, but Lax still allows top-level cross-site navigations
// (and had a ~2 minute grace window in Chrome for a while) and doesn't cover
// same-site-but-cross-subdomain requests. This is the second half of the
// CSRF defense: reject any state-changing request whose Origin doesn't match
// the request's own host.
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  // No Origin header at all (e.g. same-origin navigations in some older
  // browsers, or non-browser API clients) — don't reject those; Origin is
  // reliably sent by browsers for the cross-site requests we're defending
  // against, so its absence isn't itself a signal of an attack here.
  if (!origin) return true;

  const host = request.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
