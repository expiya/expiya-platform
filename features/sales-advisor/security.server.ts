import { createHash, randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { readJsonWithLimit } from "@/lib/security/requestSecurity";

export type Phase2Operation = "HANDOFF" | "EXPERIENCE" | "CHAT" | "PHASE3_HANDOFF";
type Subject = { readonly kind: "session" | "conversation" | "offer" | "variant" | "message"; readonly value: string };
type Counter = { count: number; resetAt: number };

const counters = new Map<string, Counter>();
const locks = new Map<string, { owner: string; expiresAt: number }>();
const replays = new Map<string, { requestDigest: string; response: unknown; expiresAt: number }>();
const turnBudgets = new Map<string, Counter>();
const MAX_LOCAL_ENTRIES = 5_000;
export const MAX_PHASE2_CHAT_TURNS = 10;

const policies: Record<Phase2Operation, readonly { kind: "client" | Subject["kind"]; limit: number; windowMs: number }[]> = {
  HANDOFF: [{ kind: "client", limit: 8, windowMs: 60_000 }, { kind: "client", limit: 3, windowMs: 10_000 }, { kind: "session", limit: 4, windowMs: 60_000 }],
  EXPERIENCE: [{ kind: "client", limit: 30, windowMs: 10 * 60_000 }, { kind: "session", limit: 12, windowMs: 60_000 }],
  CHAT: [{ kind: "client", limit: 30, windowMs: 10 * 60_000 }, { kind: "client", limit: 5, windowMs: 15_000 }, { kind: "conversation", limit: 24, windowMs: 60 * 60_000 }, { kind: "offer", limit: 24, windowMs: 60 * 60_000 }, { kind: "variant", limit: 60, windowMs: 60 * 60_000 }],
  PHASE3_HANDOFF: [{ kind: "client", limit: 10, windowMs: 10 * 60_000 }, { kind: "conversation", limit: 5, windowMs: 60 * 60_000 }, { kind: "offer", limit: 5, windowMs: 60 * 60_000 }, { kind: "variant", limit: 10, windowMs: 60 * 60_000 }],
};

const RATE_SCRIPT = "local max=0; local ttl=0; for i=1,#KEYS do local n=redis.call('INCR',KEYS[i]); if n==1 then redis.call('PEXPIRE',KEYS[i],ARGV[i*2-1]) end; local t=redis.call('PTTL',KEYS[i]); if n>tonumber(ARGV[i*2]) then max=1; if t>ttl then ttl=t end end end; return {max,ttl}";
const RELEASE_SCRIPT = "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end";
const CLAIM_TURN_SCRIPT = "local n=tonumber(redis.call('GET',KEYS[1]) or '0'); local lim=tonumber(ARGV[1]); if n>=lim then return {n,0} end; n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[2]) end; return {n,1}";
const REPLAY_TTL_MS = 60 * 60_000;

export class Phase2SecurityError extends Error {
  constructor(readonly code: "FORBIDDEN" | "RATE_LIMITED" | "SECURITY_BACKEND_UNAVAILABLE" | "CONCURRENT_REQUEST", readonly status: 403 | 429 | 503, readonly retryAfter?: number) { super(code); }
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 24);
const isProduction = () => process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
const allowsPreviewMemorySecurity = () => process.env.VERCEL_ENV === "preview" && process.env.CARS_PHASE2_ALLOW_MEMORY_SECURITY === "true";
const redisConfig = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim(); const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : undefined;
};

export function logPhase2SecurityEvent(event: string, fields: Record<string, string | number> = {}): void {
  const safeFields = Object.fromEntries(Object.entries(fields).filter(([key]) => !/(ip|token|question|message|conversation|offer|variant|payload)/iu.test(key)));
  console.warn(JSON.stringify({ type: "security", area: "phase2_sales_advisor", event, ...safeFields }));
  if (["security_backend_unavailable", "prompt_extraction_rejected"].includes(event)) Sentry.captureMessage(`Phase 2 security event: ${event}`, { level: event === "security_backend_unavailable" ? "error" : "warning", tags: { security_event: event, security_area: "phase2_sales_advisor" }, extra: safeFields });
}

function pruneLocal(now: number) {
  for (const [key, value] of counters) if (value.resetAt <= now) counters.delete(key);
  for (const [key, value] of locks) if (value.expiresAt <= now) locks.delete(key);
  for (const [key, value] of replays) if (value.expiresAt <= now) replays.delete(key);
  for (const [key, value] of turnBudgets) if (value.resetAt <= now) turnBudgets.delete(key);
  for (const map of [counters, locks, replays, turnBudgets]) while (map.size > MAX_LOCAL_ENTRIES) map.delete(map.keys().next().value!);
}

function clientIdentity(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return hash(forwarded || request.headers.get("x-real-ip") || "unknown");
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return !isProduction();
  try { return origin === new URL(request.url).origin; } catch { return false; }
}

export async function readPhase2Json(request: Request, maxBytes: number): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json" || !sameOrigin(request)) throw new Phase2SecurityError("FORBIDDEN", 403);
  return readJsonWithLimit(request, maxBytes);
}

function rateKeys(request: Request, operation: Phase2Operation, subjects: readonly Subject[], mode: "ALL" | "CLIENT_ONLY" | "SUBJECTS_ONLY") {
  const byKind = new Map(subjects.map((subject) => [subject.kind, hash(subject.value)]));
  return policies[operation].flatMap((policy, index) => {
    if (mode === "CLIENT_ONLY" && policy.kind !== "client" || mode === "SUBJECTS_ONLY" && policy.kind === "client") return [];
    const identity = policy.kind === "client" ? clientIdentity(request) : byKind.get(policy.kind);
    return identity ? [{ key: `phase2:rate:${operation.toLowerCase()}:${policy.kind}:${identity}:${index}`, ...policy }] : [];
  });
}

export async function enforcePhase2RateLimits(request: Request, operation: Phase2Operation, subjects: readonly Subject[] = [], mode: "ALL" | "CLIENT_ONLY" | "SUBJECTS_ONLY" = "ALL"): Promise<void> {
  const entries = rateKeys(request, operation, subjects, mode); const redis = redisConfig();
  if (entries.length === 0) return;
  if (!redis) {
    if (isProduction() && !allowsPreviewMemorySecurity()) throw new Phase2SecurityError("SECURITY_BACKEND_UNAVAILABLE", 503);
    const now = Date.now(); pruneLocal(now); let retryAfter = 0;
    for (const entry of entries) { const current = counters.get(entry.key); const next = !current || current.resetAt <= now ? { count: 1, resetAt: now + entry.windowMs } : { ...current, count: current.count + 1 }; counters.set(entry.key, next); if (next.count > entry.limit) retryAfter = Math.max(retryAfter, Math.ceil((next.resetAt - now) / 1_000)); }
    if (retryAfter) { logPhase2SecurityEvent("rate_limit_rejected", { operation, backend: "memory", retryAfter }); throw new Phase2SecurityError("RATE_LIMITED", 429, retryAfter); } return;
  }
  try {
    const args = entries.flatMap((entry) => [String(entry.windowMs), String(entry.limit)]);
    const response = await fetch(redis.url, { method: "POST", headers: { Authorization: `Bearer ${redis.token}`, "Content-Type": "application/json" }, body: JSON.stringify(["EVAL", RATE_SCRIPT, String(entries.length), ...entries.map((entry) => entry.key), ...args]), cache: "no-store", signal: AbortSignal.timeout(2_000) });
    if (!response.ok) throw new Error("RATE_STORE_RESPONSE"); const payload = await response.json() as { result?: [number, number] };
    if (!Array.isArray(payload.result)) throw new Error("RATE_STORE_PAYLOAD");
    if (payload.result[0] === 1) { const retryAfter = Math.max(1, Math.ceil(payload.result[1] / 1_000)); logPhase2SecurityEvent("rate_limit_rejected", { operation, backend: "redis", retryAfter }); throw new Phase2SecurityError("RATE_LIMITED", 429, retryAfter); }
  } catch (error) { if (error instanceof Phase2SecurityError) throw error; logPhase2SecurityEvent("security_backend_unavailable", { operation, backend: "redis" }); throw new Phase2SecurityError("SECURITY_BACKEND_UNAVAILABLE", 503); }
}

export function phase2Subjects(handoff: { conversationId: string; offerId: string; selectedExactVariantId: string }): readonly Subject[] {
  return [{ kind: "conversation", value: handoff.conversationId }, { kind: "offer", value: handoff.offerId }, { kind: "variant", value: handoff.selectedExactVariantId }];
}
export const phase2SessionSubject = (token: string): Subject => ({ kind: "session", value: token });

export interface Phase2TurnBudget {
  readonly used: number;
  readonly limit: typeof MAX_PHASE2_CHAT_TURNS;
  readonly remaining: number;
  readonly ended: boolean;
  readonly accepted: boolean;
}

export async function claimPhase2ChatTurn(handoff: { conversationId: string; offerId: string; selectedExactVariantId: string; expiresAt: string }): Promise<Phase2TurnBudget> {
  const key = `phase2:turns:${hash(`${handoff.conversationId}:${handoff.offerId}:${handoff.selectedExactVariantId}`)}`;
  const now = Date.now();
  const expiry = Date.parse(handoff.expiresAt);
  const ttlMs = Math.max(1_000, Math.min(Number.isFinite(expiry) ? expiry - now : REPLAY_TTL_MS, 24 * 60 * 60_000));
  const redis = redisConfig();
  let used: number;
  let accepted: boolean;
  if (!redis) {
    if (isProduction() && !allowsPreviewMemorySecurity()) throw new Phase2SecurityError("SECURITY_BACKEND_UNAVAILABLE", 503);
    pruneLocal(now);
    const current = turnBudgets.get(key);
    accepted = !current || current.resetAt <= now || current.count < MAX_PHASE2_CHAT_TURNS;
    used = !current || current.resetAt <= now ? 1 : Math.min(MAX_PHASE2_CHAT_TURNS, current.count + 1);
    turnBudgets.set(key, { count: used, resetAt: now + ttlMs });
  } else {
    try {
      const response = await redisCommand(redis, ["EVAL", CLAIM_TURN_SCRIPT, "1", key, String(MAX_PHASE2_CHAT_TURNS), String(ttlMs)]);
      const result = response.result as [number, number];
      used = Number(result?.[0]);
      accepted = Number(result?.[1]) === 1;
      if (!Number.isFinite(used)) throw new Error("TURN_STORE_PAYLOAD");
    } catch {
      logPhase2SecurityEvent("security_backend_unavailable", { operation: "CHAT", backend: "redis" });
      throw new Phase2SecurityError("SECURITY_BACKEND_UNAVAILABLE", 503);
    }
  }
  const bounded = Math.min(MAX_PHASE2_CHAT_TURNS, Math.max(0, used));
  return { used: bounded, limit: MAX_PHASE2_CHAT_TURNS, remaining: MAX_PHASE2_CHAT_TURNS - bounded, ended: bounded >= MAX_PHASE2_CHAT_TURNS, accepted };
}

async function redisCommand(redis: { url: string; token: string }, command: readonly string[]) {
  const response = await fetch(redis.url, { method: "POST", headers: { Authorization: `Bearer ${redis.token}`, "Content-Type": "application/json" }, body: JSON.stringify(command), cache: "no-store", signal: AbortSignal.timeout(2_000) });
  if (!response.ok) throw new Error("SECURITY_STORE_RESPONSE"); return response.json() as Promise<{ result?: unknown }>;
}

export async function withPhase2ConversationLock<T>(conversationId: string, operation: () => Promise<T>): Promise<T> {
  const key = `phase2:lock:chat:${hash(conversationId)}`; const owner = randomUUID(); const redis = redisConfig(); const ttlMs = 20_000;
  if (!redis) {
    if (isProduction() && !allowsPreviewMemorySecurity()) throw new Phase2SecurityError("SECURITY_BACKEND_UNAVAILABLE", 503);
    const now = Date.now(); pruneLocal(now); if ((locks.get(key)?.expiresAt ?? 0) > now) { logPhase2SecurityEvent("concurrent_request_rejected", { operation: "CHAT", backend: "memory" }); throw new Phase2SecurityError("CONCURRENT_REQUEST", 429, 2); } locks.set(key, { owner, expiresAt: now + ttlMs });
    try { return await operation(); } finally { if (locks.get(key)?.owner === owner) locks.delete(key); }
  }
  try {
    const acquired = await redisCommand(redis, ["SET", key, owner, "NX", "PX", String(ttlMs)]); if (acquired.result !== "OK") throw new Phase2SecurityError("CONCURRENT_REQUEST", 429, 2);
    try { return await operation(); } finally { await redisCommand(redis, ["EVAL", RELEASE_SCRIPT, "1", key, owner]).catch(() => undefined); }
  } catch (error) { if (error instanceof Phase2SecurityError) throw error; throw new Phase2SecurityError("SECURITY_BACKEND_UNAVAILABLE", 503); }
}

export async function withPhase2Idempotency<T>(identity: string, requestValue: unknown, operation: () => Promise<T>): Promise<T> {
  const key = `phase2:replay:${hash(identity)}`;
  const requestDigest = createHash("sha256").update(JSON.stringify(requestValue)).digest("hex");
  const redis = redisConfig();
  if (!redis) {
    if (isProduction() && !allowsPreviewMemorySecurity()) throw new Phase2SecurityError("SECURITY_BACKEND_UNAVAILABLE", 503);
    const now = Date.now(); pruneLocal(now); const replay = replays.get(key);
    if (replay) { if (replay.requestDigest !== requestDigest) throw new TypeError("PHASE2_MESSAGE_PAYLOAD_CONFLICT"); return replay.response as T; }
    const response = await operation(); replays.set(key, { requestDigest, response, expiresAt: now + REPLAY_TTL_MS }); return response;
  }
  try {
    const existing = await redisCommand(redis, ["GET", key]);
    if (typeof existing.result === "string") {
      const replay = JSON.parse(existing.result) as { requestDigest?: string; response?: T };
      if (replay.requestDigest !== requestDigest) throw new TypeError("PHASE2_MESSAGE_PAYLOAD_CONFLICT");
      return replay.response as T;
    }
    const response = await operation();
    await redisCommand(redis, ["SET", key, JSON.stringify({ requestDigest, response }), "PX", String(REPLAY_TTL_MS), "NX"]);
    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message === "PHASE2_MESSAGE_PAYLOAD_CONFLICT") throw error;
    throw new Phase2SecurityError("SECURITY_BACKEND_UNAVAILABLE", 503);
  }
}

export function validatePhase2Question(value: string): string {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized || normalized.length > 800 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/u.test(normalized) || /(https?:\/\/|www\.|data:|javascript:|file:|ftp:)/iu.test(normalized)) throw new TypeError("PHASE2_QUESTION_REJECTED");
  return normalized;
}

export function isPhase2ExtractionAttempt(value: string): boolean {
  return /(system\s*prompt|gizli\s*(talimat|prompt)|checksum|audit\s*payload|internal\s*(id|kimlik)|api\s*(key|anahtar)|tool\s*(call|çağrı)|ignore\s+(all|previous)|önceki\s+talimatları\s+(unut|yok say)|jailbreak|developer\s+message)/iu.test(value);
}

export function phase2SafeError(error: unknown): Response {
  if (error instanceof Phase2SecurityError) return Response.json({ message: error.status === 429 ? "Çok hızlı istek gönderildi. Lütfen kısa bir süre bekleyip yeniden dene." : error.status === 503 ? "Satış danışmanı güvenlik servisi geçici olarak kullanılamıyor. Lütfen kısa bir süre sonra yeniden dene." : "Bu isteğe izin verilmiyor." }, { status: error.status, headers: { "Cache-Control": "no-store", ...(error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}) } });
  if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof Error && ["REQUEST_BODY_TOO_LARGE", "PHASE2_QUESTION_REJECTED"].includes(error.message)) return Response.json({ message: "İstek gövdesi geçersiz veya çok büyük." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const conflict = error instanceof Error && /^(PHASE2|PHASE3)_/u.test(error.message); return Response.json({ message: conflict ? "Bağlantı doğrulanamadı veya süresi doldu. Lütfen araç önerisi ekranından yeniden aç." : "İstek şu anda işlenemiyor. Lütfen kısa bir süre sonra yeniden dene." }, { status: conflict ? 409 : 503, headers: { "Cache-Control": "no-store" } });
}

export function resetPhase2SecurityForTests() { counters.clear(); locks.clear(); replays.clear(); turnBudgets.clear(); }
