import "server-only";
import { prisma } from "@/lib/data/client";
import { randomInt, randomBytes, createHmac } from "node:crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (I,O,0,1)
const CAPTCHA_LENGTH = 5;
const CAPTCHA_TTL_SECONDS = 120;
function verifier(id: string, answer: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return createHmac("sha256", secret).update(`${id}:${answer.trim().toUpperCase()}`).digest("hex");
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

// Educational SVG challenge: the image is machine-readable, not a bot-defense service.
export async function generateCaptcha(): Promise<{ svg: string; token: string }> {
  const text = randomText();
  const token = randomBytes(32).toString("hex");
  await prisma.captchaChallenge.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await prisma.captchaChallenge.create({ data: {
    id: token, answerVerifier: verifier(token, text), expiresAt: new Date(Date.now() + CAPTCHA_TTL_SECONDS * 1000),
  } });
  return { svg: renderSvg(text), token };
}

export async function verifyCaptcha(token: string, answer: string): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  // Every submitted challenge is single-use, including incorrect answers.
  const result = await prisma.captchaChallenge.updateMany({
    where: { id: token, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });
  if (!result.count) return false;
  const record = await prisma.captchaChallenge.findUnique({ where: { id: token } });
  return record?.answerVerifier === verifier(token, answer);
}
