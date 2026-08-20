import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { randomInt } from "node:crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (I,O,0,1)
const CAPTCHA_LENGTH = 5;
// Short TTL is a partial mitigation for replay, not a fix: this token is a
// stateless signed JWT, so the same token+answer pair is valid for every
// request until it expires (no server-side "already used" tracking). A real
// fix needs a server-side single-use store (e.g. record the JWT `jti` in the
// DB on issue, delete-on-verify, reject already-consumed jti) — left as a
// known gap, tracked in the SDD ledger, not implemented in this pass.
const CAPTCHA_TTL_SECONDS = 2 * 60;

// Shares JWT_SECRET with lib/auth/jwt.ts's access tokens — `aud` keeps the
// two token kinds from being interchangeable (see the matching comment in
// jwt.ts).
const CAPTCHA_AUDIENCE = "auth-playground:captcha";

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
    .setAudience(CAPTCHA_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${CAPTCHA_TTL_SECONDS}s`)
    .sign(getSecretKey());
  return { svg: renderSvg(text), token };
}

export async function verifyCaptcha(token: string, answer: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { audience: CAPTCHA_AUDIENCE });
    if (typeof payload.answer !== "string") return false;
    return payload.answer.toUpperCase() === answer.trim().toUpperCase();
  } catch {
    return false;
  }
}
