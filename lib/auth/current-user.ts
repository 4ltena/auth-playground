import "server-only";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, verifyAccessToken, type AccessTokenPayload } from "./jwt";

// This checks the JWT signature only — it does NOT hit the DB, by design
// (proxy.ts calls this same verification path and must stay Edge-compatible
// / DB-free). Known consequence: admin suspend and per-session logout are
// NOT instant. A suspended or logged-out-elsewhere user's still-valid access
// token keeps working for up to its remaining TTL (ACCESS_TOKEN_MAX_AGE,
// currently 15 min) — only /api/auth/refresh re-checks user.status, so
// revocation becomes effective the next time that user's token is refreshed
// or expires. Accepted tradeoff for a stateless-JWT design; a stricter
// version would look up the session (and user.status) on every request,
// which trades this file's simplicity for a DB round-trip per request.
export async function getCurrentUser(): Promise<AccessTokenPayload | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}
