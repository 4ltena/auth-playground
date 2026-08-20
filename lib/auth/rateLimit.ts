import "server-only";
import { prisma } from "@/lib/data/client";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const CAPTCHA_REQUIRED_AFTER_FAILURES = 3;

// Keyed on email alone, NOT email+IP. `X-Forwarded-For` is client-supplied
// and trivially spoofable (see lib/http/client-ip.ts) — keying on IP would
// let an attacker open a fresh rate-limit bucket per request just by
// rotating the header, defeating the limiter entirely. IP is still recorded
// in LoginHistory for visibility, just not used as a bypassable lock key.
function makeIdentifier(email: string): string {
  return email;
}

export async function checkLoginAttempt(email: string) {
  const identifier = makeIdentifier(email);
  const record = await prisma.loginAttempt.findUnique({ where: { identifier } });

  const locked = !!record?.lockedUntil && record.lockedUntil > new Date();
  const requireCaptcha = (record?.failedCount ?? 0) >= CAPTCHA_REQUIRED_AFTER_FAILURES;

  return { locked, requireCaptcha, failedCount: record?.failedCount ?? 0 };
}

export async function recordLoginFailure(email: string) {
  const identifier = makeIdentifier(email);
  const existing = await prisma.loginAttempt.findUnique({ where: { identifier } });
  const failedCount = (existing?.failedCount ?? 0) + 1;
  const lockedUntil =
    failedCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : existing?.lockedUntil ?? null;

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
