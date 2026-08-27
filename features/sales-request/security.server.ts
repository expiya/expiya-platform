import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const csrf = new Map<string, number>(); const rate = new Map<string, { count: number; reset: number }>();
export function issueCsrfToken() { const token = randomBytes(24).toString("base64url"); csrf.set(hash(token), Date.now() + 30 * 60_000); return token; }
export function consumeCsrfToken(token: string) { const key = hash(token); const expiry = csrf.get(key); csrf.delete(key); return Boolean(expiry && expiry > Date.now() && timingSafeEqual(Buffer.from(key), Buffer.from(hash(token)))); }
export function sameOrigin(request: Request) { const origin = request.headers.get("origin"); const host = request.headers.get("host"); if (!origin || !host) return process.env.NODE_ENV === "test"; try { return new URL(origin).host === host; } catch { return false; } }
export function allowRequest(key: string, now = Date.now()) { const hashed = hash(key); const item = rate.get(hashed); if (!item || item.reset <= now) { rate.set(hashed, { count: 1, reset: now + 60_000 }); return true; } if (item.count >= 5) return false; item.count += 1; return true; }
export const normalizePhone = (value: string) => { const digits = value.replace(/\D/gu, ""); const local = digits.startsWith("90") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits; if (!/^5\d{9}$/u.test(local)) throw new TypeError("PHONE_INVALID"); return `+90${local}`; };
export const redactError = (error: unknown) => error instanceof Error && /^[A-Z0-9_]+$/u.test(error.message) ? error.message : "SALES_REQUEST_REJECTED";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
