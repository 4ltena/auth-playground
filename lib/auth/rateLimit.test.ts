import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/data/client";
import {
  checkLoginAttempt,
  recordLoginFailure,
  resetLoginAttempts,
  unlockAllForEmail,
  CAPTCHA_REQUIRED_AFTER_FAILURES,
} from "./rateLimit";

afterEach(async () => {
  await prisma.loginAttempt.deleteMany();
});

describe("checkLoginAttempt / recordLoginFailure", () => {
  it("starts unlocked with no CAPTCHA requirement", async () => {
    await expect(checkLoginAttempt("fresh@example.com")).resolves.toEqual({
      locked: false,
      requireCaptcha: false,
      failedCount: 0,
    });
  });

  it("requires CAPTCHA after CAPTCHA_REQUIRED_AFTER_FAILURES failures", async () => {
    const email = "captcha@example.com";
    for (let i = 0; i < CAPTCHA_REQUIRED_AFTER_FAILURES; i++) {
      await recordLoginFailure(email);
    }
    await expect(checkLoginAttempt(email)).resolves.toMatchObject({ requireCaptcha: true, locked: false });
  });

  it("locks after 5 failures", async () => {
    const email = "lockme@example.com";
    for (let i = 0; i < 5; i++) {
      await recordLoginFailure(email);
    }
    await expect(checkLoginAttempt(email)).resolves.toMatchObject({ locked: true });
  });

  it("does not touch a bucket for an empty email", async () => {
    await recordLoginFailure("");
    await expect(checkLoginAttempt("")).resolves.toEqual({ locked: false, requireCaptcha: false, failedCount: 0 });
    const record = await prisma.loginAttempt.findUnique({ where: { identifier: "" } });
    expect(record).toBeNull();
  });
});

describe("sliding window decay", () => {
  it("does not count a failure older than the 15-minute window", async () => {
    const email = "stale@example.com";
    await recordLoginFailure(email);
    await recordLoginFailure(email);
    await recordLoginFailure(email);

    // Back-date the bucket's lastAttemptAt past the window.
    await prisma.loginAttempt.update({
      where: { identifier: email },
      data: { lastAttemptAt: new Date(Date.now() - 16 * 60 * 1000) },
    });

    await expect(checkLoginAttempt(email)).resolves.toMatchObject({ requireCaptcha: false, failedCount: 0 });
  });

  it("restarts the failure count from 1 (not baseline+1) once stale", async () => {
    const email = "restart@example.com";
    for (let i = 0; i < 4; i++) await recordLoginFailure(email);

    await prisma.loginAttempt.update({
      where: { identifier: email },
      data: { lastAttemptAt: new Date(Date.now() - 16 * 60 * 1000) },
    });

    await recordLoginFailure(email); // one fresh failure after the stale window
    const record = await prisma.loginAttempt.findUnique({ where: { identifier: email } });
    expect(record?.failedCount).toBe(1);
  });

  it("keeps an active lock in force even after the failure window elapses", async () => {
    const email = "stalelock@example.com";
    for (let i = 0; i < 5; i++) await recordLoginFailure(email);

    // Age the bucket past the failure window, but lockedUntil is still in the future.
    await prisma.loginAttempt.update({
      where: { identifier: email },
      data: { lastAttemptAt: new Date(Date.now() - 16 * 60 * 1000) },
    });

    await expect(checkLoginAttempt(email)).resolves.toMatchObject({ locked: true });
  });
});

describe("resetLoginAttempts / unlockAllForEmail", () => {
  it("resetLoginAttempts clears the bucket entirely", async () => {
    const email = "reset@example.com";
    await recordLoginFailure(email);
    await resetLoginAttempts(email);

    const record = await prisma.loginAttempt.findUnique({ where: { identifier: email } });
    expect(record).toBeNull();
  });

  it("unlockAllForEmail clears the bucket for that email only", async () => {
    const email = "unlock@example.com";
    const other = "other@example.com";
    for (let i = 0; i < 5; i++) await recordLoginFailure(email);
    await recordLoginFailure(other);

    await unlockAllForEmail(email);

    await expect(checkLoginAttempt(email)).resolves.toMatchObject({ locked: false, failedCount: 0 });
    await expect(checkLoginAttempt(other)).resolves.toMatchObject({ failedCount: 1 });
  });
});
