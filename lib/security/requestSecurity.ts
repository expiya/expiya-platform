import { createHash } from "node:crypto";

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

export function verifySameOrigin(request: Request): Response | undefined {
  const contentType = request.headers.get("content-type")?.split(";")[0];
  if (contentType !== "application/json") return Response.json({ message: "Yalnızca JSON istekleri kabul ediliyor." }, { status: 415 });
  const origin = request.headers.get("origin");
  if (!origin) return undefined;
  const expectedOrigin = new URL(request.url).origin;
  if (origin !== expectedOrigin) return Response.json({ message: "Bu kaynaktan gelen isteğe izin verilmiyor." }, { status: 403 });
}

export function enforceRateLimit(request: Request, scope: string, limit: number, windowMs: number): Response | undefined {
  const now = Date.now();
  const key = `${scope}:${clientKey(request)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return undefined;
  }
  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1_000));
    return Response.json({ message: "Çok fazla istek gönderildi. Lütfen biraz bekleyip yeniden deneyin." }, { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } });
  }
  current.count += 1;
  return undefined;
}

export async function readJsonWithLimit(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error("REQUEST_BODY_TOO_LARGE");
  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) throw new Error("REQUEST_BODY_TOO_LARGE");
  return JSON.parse(text);
}
