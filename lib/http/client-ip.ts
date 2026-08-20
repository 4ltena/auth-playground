// Best-effort client IP for rate limiting / login history. Trusts
// x-forwarded-for as-is (no reverse-proxy hop count config) — acceptable for
// this learning app, not a hardened production setup.
export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return (forwarded.split(",")[0] ?? "unknown").trim();
  return "unknown";
}
