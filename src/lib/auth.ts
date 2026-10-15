import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./db";
import { requireThat } from "./errors";
import { appOrigin } from "./environment";
const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "sah_session";
export const SESSION_SECONDS = 8 * 60 * 60;
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hash] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function issueSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({ data: { id: digest(token), userId, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) } });
  return token;
}
export async function resolveSession(token?: string) {
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: digest(token) }, include: { user: true } });
  if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.active) return null;
  return session.user;
}
export async function currentUser() {
  return resolveSession((await cookies()).get(SESSION_COOKIE)?.value);
}
export async function requireUser() {
  const user = await currentUser();
  requireThat(user, 401, "Please sign in.");
  return user;
}
export function sessionOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.SESSION_COOKIE_SECURE === "true" ||
    (process.env.SESSION_COOKIE_SECURE !== "false" && appOrigin()?.startsWith("https://") === true), path: "/", maxAge: SESSION_SECONDS };
}
export async function rateLimit(key: string, limit = 10) {
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "LoginAttempt" ("key", "count", "expiresAt") VALUES (${digest(key)}, 1, ${expires})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "LoginAttempt"."expiresAt" < ${now} THEN 1 ELSE "LoginAttempt"."count" + 1 END,
      "expiresAt" = CASE WHEN "LoginAttempt"."expiresAt" < ${now} THEN ${expires} ELSE "LoginAttempt"."expiresAt" END
    RETURNING "count"`;
  requireThat(rows[0].count <= limit, 429, "Too many attempts. Please try again in 15 minutes.");
}
