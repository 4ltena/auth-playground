import "server-only";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, verifyAccessToken, type AccessTokenPayload } from "./jwt";

export async function getCurrentUser(): Promise<AccessTokenPayload | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}
