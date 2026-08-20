import "server-only";
import { prisma } from "@/lib/data/client";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const CAPTCHA_REQUIRED_AFTER_FAILURES = 3;

function makeIdentifier(email: string, ip: string): string {
  return `${email}|${ip}`;
}

export async function checkLoginAttempt(email: string, ip: string) {
  const identifier = makeIdentifier(email, ip);
  const record = await prisma.loginAttempt.findUnique({ where: { identifier } });

  const locked = !!record?.lockedUntil && record.lockedUntil > new Date();
  const requireCaptcha = (record?.failedCount ?? 0) >= CAPTCHA_REQUIRED_AFTER_FAILURES;

  return { locked, requireCaptcha, failedCount: record?.failedCount ?? 0 };
}

export async function recordLoginFailure(email: string, ip: string) {
  const identifier = makeIdentifier(email, ip);
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

export async function resetLoginAttempts(email: string, ip: string) {
  const identifier = makeIdentifier(email, ip);
  await prisma.loginAttempt.deleteMany({ where: { identifier } });
}

export async function unlockLoginAttempt(identifier: string) {
  await prisma.loginAttempt.update({
    where: { identifier },
    data: { failedCount: 0, lockedUntil: null },
  });
}

// Admin "unlock" action: clears every rate-limit bucket for this email,
// regardless of which IP triggered it.
export async function unlockAllForEmail(email: string) {
  await prisma.loginAttempt.deleteMany({
    where: { identifier: { startsWith: `${email}|` } },
  });
}
