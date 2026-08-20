// Best-effort client IP for LOGIN HISTORY DISPLAY ONLY. Trusts
// x-forwarded-for as-is (no reverse-proxy hop count config), which any
// client can forge — do NOT use this value as a rate-limit key (see
// lib/auth/rateLimit.ts, which is keyed on email alone for that reason).
export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return (forwarded.split(",")[0] ?? "unknown").trim();
  return "unknown";
}
