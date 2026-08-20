import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { randomInt } from "node:crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (I,O,0,1)
const CAPTCHA_LENGTH = 5;
const CAPTCHA_TTL_SECONDS = 5 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function randomText(): string {
  let text = "";
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    text += CHARSET[randomInt(CHARSET.length)];
  }
  return text;
}

function renderSvg(text: string): string {
  const glyphs = text
    .split("")
    .map((char, i) => {
      const x = 12 + i * 30 + randomInt(-4, 5);
      const y = 34 + randomInt(-6, 7);
      const rotate = randomInt(-25, 26);
      const hue = randomInt(0, 360);
      return `<text x="${x}" y="${y}" font-size="30" font-family="monospace" font-weight="bold" fill="hsl(${hue},60%,35%)" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
    })
    .join("");
  const noiseLines = Array.from({ length: 4 }, () => {
    const y1 = randomInt(0, 60);
    const y2 = randomInt(0, 60);
    return `<line x1="0" y1="${y1}" x2="170" y2="${y2}" stroke="#ccc" stroke-width="1" />`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="170" height="60" viewBox="0 0 170 60"><rect width="170" height="60" fill="#f3f3f3"/>${noiseLines}${glyphs}</svg>`;
}

export async function generateCaptcha(): Promise<{ svg: string; token: string }> {
  const text = randomText();
  const token = await new SignJWT({ answer: text })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CAPTCHA_TTL_SECONDS}s`)
    .sign(getSecretKey());
  return { svg: renderSvg(text), token };
}

export async function verifyCaptcha(token: string, answer: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.answer !== "string") return false;
    return payload.answer.toUpperCase() === answer.trim().toUpperCase();
  } catch {
    return false;
  }
}
