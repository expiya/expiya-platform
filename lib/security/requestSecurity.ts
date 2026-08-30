import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

export interface RateLimitPolicy {
  readonly scope: string;
  readonly limit: number;
  readonly windowMs: number;
  readonly subject?: string;
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

function hashSubject(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function rateLimitResponse(retryAfter: number): Response {
  return Response.json(
    { message: "Çok fazla istek gönderildi. Lütfen biraz bekleyip yeniden deneyin." },
    { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
  );
}

function logSecurityEvent(event: string, fields: Record<string, string | number>): void {
  console.warn(JSON.stringify({ type: "security", event, ...fields }));
  if (event === "rate_limit_backend_error") {
    Sentry.captureMessage("Distributed rate-limit backend failed", {
      level: "error",
      tags: { security_event: event },
      extra: fields,
    });
  }
}

export function verifySameOrigin(request: Request): Response | undefined {
  const contentType = request.headers.get("content-type")?.split(";")[0];
  if (contentType !== "application/json") return Response.json({ message: "Yalnızca JSON istekleri kabul ediliyor." }, { status: 415 });
  const origin = request.headers.get("origin");
  if (!origin) return undefined;
  const expectedOrigin = new URL(request.url).origin;
  if (origin !== expectedOrigin) {
    let localDevelopmentAlias = false;
    if (process.env.NODE_ENV !== "production") {
      try {
        const supplied = new URL(origin); const expected = new URL(expectedOrigin);
        const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
        localDevelopmentAlias = loopback.has(supplied.hostname) && loopback.has(expected.hostname)
          && supplied.protocol === expected.protocol && supplied.port === expected.port;
      } catch { localDevelopmentAlias = false; }
    }
    if (!localDevelopmentAlias) return Response.json({ message: "Bu kaynaktan gelen isteğe izin verilmiyor." }, { status: 403 });
  }
}

function enforceMemoryRateLimit(request: Request, policy: RateLimitPolicy): Response | undefined {
  const now = Date.now();
  const key = `${policy.scope}:${clientKey(request)}:${policy.subject ? hashSubject(policy.subject) : "client"}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + policy.windowMs });
    return undefined;
  }
  if (current.count >= policy.limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1_000));
    logSecurityEvent("rate_limit_rejected", { scope: policy.scope, backend: "memory", retryAfter });
    return rateLimitResponse(retryAfter);
  }
  current.count += 1;
  return undefined;
}

const RATE_LIMIT_SCRIPT = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('PTTL',KEYS[1])}";

export async function enforceRateLimit(request: Request, policy: RateLimitPolicy): Promise<Response | undefined> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return enforceMemoryRateLimit(request, policy);

  const rawKey = `${policy.scope}:${clientKey(request)}:${policy.subject ? hashSubject(policy.subject) : "client"}`;
  try {
    const response = await fetch(redisUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", RATE_LIMIT_SCRIPT, "1", `ratelimit:${rawKey}`, String(policy.windowMs)]),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) throw new Error(`redis_${response.status}`);
    const payload = await response.json() as { result?: [number, number] };
    const count = payload.result?.[0];
    const ttl = payload.result?.[1];
    if (typeof count !== "number" || typeof ttl !== "number" || !Number.isFinite(count) || !Number.isFinite(ttl)) throw new Error("redis_invalid_response");
    if (count > policy.limit) {
      const retryAfter = Math.max(1, Math.ceil(ttl / 1_000));
      logSecurityEvent("rate_limit_rejected", { scope: policy.scope, backend: "redis", retryAfter });
      return rateLimitResponse(retryAfter);
    }
    return undefined;
  } catch (error) {
    logSecurityEvent("rate_limit_backend_error", { scope: policy.scope, error: error instanceof Error ? error.message : "unknown" });
    // Availability fallback. The Cloudflare edge rate limit remains the outer fail-safe.
    return enforceMemoryRateLimit(request, policy);
  }
}

export async function readJsonWithLimit(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error("REQUEST_BODY_TOO_LARGE");
  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) throw new Error("REQUEST_BODY_TOO_LARGE");
  return JSON.parse(text);
}
