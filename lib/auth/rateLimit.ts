import "server-only";
import { prisma } from "@/lib/data/client";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const CAPTCHA_REQUIRED_AFTER_FAILURES = 3;

// Failures older than this window no longer count — without decay, a
// single failed attempt every few minutes keeps failedCount pinned at
// MAX_FAILED_ATTEMPTS forever (an attacker who knows a victim's email can
// re-lock it in perpetuity with ~1 request/5min, and since password-reset
// shares this bucket, that also blocks the victim's own recovery path).
const FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Keyed on email alone, NOT email+IP. `X-Forwarded-For` is client-supplied
// and trivially spoofable (see lib/http/client-ip.ts) — keying on IP would
// let an attacker open a fresh rate-limit bucket per request just by
// rotating the header, defeating the limiter entirely. IP is still recorded
// in LoginHistory for visibility, just not used as a bypassable lock key.
function makeIdentifier(email: string): string {
  return email;
}

function isStale(lastAttemptAt: Date): boolean {
  return Date.now() - lastAttemptAt.getTime() > FAILURE_WINDOW_MS;
}

export async function checkLoginAttempt(email: string) {
  // An empty email has no bucket of its own — every malformed/anonymous
  // request would otherwise share one "" identifier and lock each other out.
  if (!email) return { locked: false, requireCaptcha: false, failedCount: 0 };

  const identifier = makeIdentifier(email);
  const record = await prisma.loginAttempt.findUnique({ where: { identifier } });

  const locked = !!record?.lockedUntil && record.lockedUntil > new Date();
  // A lock always holds even if the failure that caused it has since aged
  // out of the window — only the failedCount used for the next decision
  // decays, not an active lock.
  const failedCount = record && !isStale(record.lastAttemptAt) ? record.failedCount : 0;
  const requireCaptcha = failedCount >= CAPTCHA_REQUIRED_AFTER_FAILURES;

  return { locked, requireCaptcha, failedCount };
}

export async function recordLoginFailure(email: string) {
  if (!email) return;

  const identifier = makeIdentifier(email);
  const existing = await prisma.loginAttempt.findUnique({ where: { identifier } });
  const baseline = existing && !isStale(existing.lastAttemptAt) ? existing.failedCount : 0;
  const failedCount = baseline + 1;
  const lockedUntil = failedCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null;

  await prisma.loginAttempt.upsert({
    where: { identifier },
    create: { identifier, failedCount, lockedUntil, lastAttemptAt: new Date() },
    update: { failedCount, lockedUntil, lastAttemptAt: new Date() },
  });
}

export async function resetLoginAttempts(email: string) {
  const identifier = makeIdentifier(email);
  await prisma.loginAttempt.deleteMany({ where: { identifier } });
}

export async function unlockAllForEmail(email: string) {
  await prisma.loginAttempt.deleteMany({ where: { identifier: makeIdentifier(email) } });
}
