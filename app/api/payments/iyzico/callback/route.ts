import { finalizeIyzicoCheckout } from "@/features/payments/iyzico/checkoutService";
import { resolveIyzicoConfig } from "@/features/payments/iyzico/config";
import { createIyzicoHttpClient } from "@/features/payments/iyzico/httpClient";
import { PostgresIyzicoOrderRepository } from "@/features/payments/iyzico/orderRepository";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { enforceRateLimit } from "@/lib/security/requestSecurity";

async function readToken(request: Request): Promise<string> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > 4_000) throw new TypeError("IYZICO_CALLBACK_TOO_LARGE");
  const text = await request.text();
  if (Buffer.byteLength(text) > 4_000) throw new TypeError("IYZICO_CALLBACK_TOO_LARGE");
  const token = new URLSearchParams(text).get("token")?.trim();
  if (!token || token.length > 500) throw new TypeError("IYZICO_CALLBACK_TOKEN_INVALID");
  return token;
}

export async function POST(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, { scope: "iyzico-callback", limit: 30, windowMs: 10 * 60_000 });
  if (limited) return limited;
  let orderId: string | undefined;
  let outcome: "success" | "failure" = "failure";
  try {
    const token = await readToken(request);
    const config = resolveIyzicoConfig({
      IYZICO_ENV: process.env.IYZICO_ENV,
      IYZICO_API_KEY: process.env.IYZICO_API_KEY,
      IYZICO_SECRET_KEY: process.env.IYZICO_SECRET_KEY,
      IYZICO_LIVE_PAYMENTS_ENABLED: process.env.IYZICO_LIVE_PAYMENTS_ENABLED,
    });
    const finalized = await finalizeIyzicoCheckout({
      token,
      secretKey: config.secretKey,
      client: createIyzicoHttpClient(config),
      repository: new PostgresIyzicoOrderRepository(getPostgresDatabase()),
    });
    orderId = finalized.orderId;
    outcome = "success";
  } catch {
    // Do not disclose payment or provider details on the browser redirect.
  }
  const destination = new URL("/cars/paid-comparison/status", request.url);
  destination.searchParams.set("payment", outcome);
  if (orderId) destination.searchParams.set("orderId", orderId);
  return Response.redirect(destination, 303);
}
