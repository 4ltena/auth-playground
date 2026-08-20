import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, scorePasswordStrength } from "./password";

describe("password hashing", () => {
  it("hashes a password and verifies the correct plain text", async () => {
    const hash = await hashPassword("Sup3r-Secret!");
    expect(hash).not.toBe("Sup3r-Secret!");
    await expect(verifyPassword("Sup3r-Secret!", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect plain text", async () => {
    const hash = await hashPassword("Sup3r-Secret!");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("produces a different hash for the same input each time (random salt)", async () => {
    const hashA = await hashPassword("same-input");
    const hashB = await hashPassword("same-input");
    expect(hashA).not.toBe(hashB);
  });
});

describe("scorePasswordStrength", () => {
  it("scores an empty/short password 0", () => {
    expect(scorePasswordStrength("")).toBe(0);
    expect(scorePasswordStrength("short")).toBe(0);
  });

  it("scores within 0-5 for every criterion combined", () => {
    // length>=8, length>=12, mixed case, digit, symbol — all five at once.
    expect(scorePasswordStrength("VeryLongPassword123!")).toBe(5);
  });

  it("increases monotonically as criteria are added", () => {
    const scores = ["password", "password1234", "Password1234", "Password1234!"].map(scorePasswordStrength);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]!);
    }
  });
});
