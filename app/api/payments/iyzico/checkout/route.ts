import { z } from "zod";

import { iyzicoBuyerSchema } from "@/features/payments/iyzico/checkout";
import { requireIyzicoCallbackUrl } from "@/features/payments/iyzico/callbackUrl";
import { startIyzicoCheckout } from "@/features/payments/iyzico/checkoutService";
import { resolveIyzicoConfig } from "@/features/payments/iyzico/config";
import { createIyzicoHttpClient } from "@/features/payments/iyzico/httpClient";
import { PostgresIyzicoOrderRepository } from "@/features/payments/iyzico/orderRepository";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { clientKey, enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const schema = z.strictObject({ quoteId: z.string().uuid(), buyer: iyzicoBuyerSchema });

function rawClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1";
}

export async function POST(request: Request): Promise<Response> {
  const rejected = verifySameOrigin(request);
  if (rejected) return rejected;
  const limited = await enforceRateLimit(request, { scope: "iyzico-checkout", limit: 5, windowMs: 10 * 60_000, subject: clientKey(request) });
  if (limited) return limited;
  try {
    const input = schema.parse(await readJsonWithLimit(request, 8_000));
    const config = resolveIyzicoConfig({
      IYZICO_ENV: process.env.IYZICO_ENV,
      IYZICO_API_KEY: process.env.IYZICO_API_KEY,
      IYZICO_SECRET_KEY: process.env.IYZICO_SECRET_KEY,
      IYZICO_LIVE_PAYMENTS_ENABLED: process.env.IYZICO_LIVE_PAYMENTS_ENABLED,
    });
    const callbackUrl = requireIyzicoCallbackUrl({ IYZICO_CALLBACK_URL: process.env.IYZICO_CALLBACK_URL, IYZICO_ENV: config.environment });
    const checkout = await startIyzicoCheckout({
      quoteId: input.quoteId,
      buyer: input.buyer,
      buyerIp: rawClientIp(request),
      callbackUrl,
      secretKey: config.secretKey,
      client: createIyzicoHttpClient(config),
      repository: new PostgresIyzicoOrderRepository(getPostgresDatabase()),
    });
    return Response.json(checkout, { status: 201, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    const invalid = error instanceof z.ZodError;
    return Response.json({ message: invalid ? "Ödeme bilgileri geçersiz." : "Ödeme başlatılamadı." }, {
      status: invalid ? 400 : 409,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
