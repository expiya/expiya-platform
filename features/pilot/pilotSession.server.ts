import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const PILOT_SESSION_COOKIE = "expiya_cars_pilot";
const registrySchema = z.array(z.object({ username: z.string().regex(/^[a-z0-9._-]{3,40}$/u), displayName: z.string().trim().min(1).max(80), passwordHash: z.string().regex(/^scrypt\$[A-Za-z0-9_-]{16,}\$[A-Za-z0-9_-]{32,}$/u), active: z.boolean().default(true) })).max(500);
type PilotUser = z.infer<typeof registrySchema>[number];
export type PilotSession = Readonly<{ username: string; displayName: string; expiresAt: string }>;

const encoded = (value: Buffer | string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url");
function secret(): string | undefined { const value = process.env.CARS_PILOT_SESSION_SECRET?.trim(); return value && Buffer.byteLength(value) >= 32 ? value : undefined; }
function users(): readonly PilotUser[] { try { return registrySchema.parse(JSON.parse(process.env.CARS_PILOT_USERS_JSON ?? "[]")); } catch { return []; } }
function signature(payload: string, key: string) { return createHmac("sha256", key).update(payload).digest(); }
function equal(left: Buffer, right: Buffer) { return left.length === right.length && timingSafeEqual(left, right); }

export function verifyPilotPassword(password: string, passwordHash: string): boolean {
  const [, saltText, expectedText] = passwordHash.split("$");
  if (!saltText || !expectedText || password.length < 8 || password.length > 200) return false;
  try { return equal(scryptSync(password, decode(saltText), 32), decode(expectedText)); } catch { return false; }
}

export function authenticatePilotUser(username: string, password: string): PilotSession | null {
  const normalized = username.trim().toLocaleLowerCase("en-US");
  const user = users().find((candidate) => candidate.active && candidate.username === normalized);
  if (!user || !verifyPilotPassword(password, user.passwordHash)) return null;
  return Object.freeze({ username: user.username, displayName: user.displayName, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString() });
}

export function createPilotSessionToken(session: PilotSession): string {
  const key = secret(); if (!key) throw new Error("PILOT_SESSION_SECRET_INVALID");
  const payload = encoded(JSON.stringify({ v: 1, u: session.username, d: session.displayName, exp: session.expiresAt }));
  return `${payload}.${encoded(signature(payload, key))}`;
}

export function verifyPilotSessionToken(token: string | undefined): PilotSession | null {
  const key = secret(); if (!key || !token) return null;
  try {
    const [payload, supplied] = token.split("."); if (!payload || !supplied || !equal(signature(payload, key), decode(supplied))) return null;
    const value = z.object({ v: z.literal(1), u: z.string(), d: z.string(), exp: z.string().datetime() }).parse(JSON.parse(decode(payload).toString("utf8")));
    const active = users().some((user) => user.active && user.username === value.u && user.displayName === value.d);
    return active && Date.parse(value.exp) > Date.now() ? Object.freeze({ username: value.u, displayName: value.d, expiresAt: value.exp }) : null;
  } catch { return null; }
}

export function pilotSessionFromRequest(request: Request): PilotSession | null {
  const value = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${PILOT_SESSION_COOKIE}=`))?.slice(PILOT_SESSION_COOKIE.length + 1);
  return verifyPilotSessionToken(value ? decodeURIComponent(value) : undefined);
}
