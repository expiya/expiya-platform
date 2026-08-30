import { z } from "zod";

import { iyzicoBuyerSchema } from "@/features/payments/iyzico/checkout";
import { requireIyzicoCallbackUrl } from "@/features/payments/iyzico/callbackUrl";
import { startIyzicoCheckout } from "@/features/payments/iyzico/checkoutService";
import { resolveIyzicoConfig } from "@/features/payments/iyzico/config";
import { createIyzicoHttpClient } from "@/features/payments/iyzico/httpClient";
import { PostgresIyzicoOrderRepository } from "@/features/payments/iyzico/orderRepository";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { clientKey, enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";
import { paidComparisonLegalArtifacts } from "@/features/paid-comparison/legalArtifacts";
import { findDevelopmentPaidComparisonQuote } from "@/features/paid-comparison/repository";
import { DevelopmentIyzicoOrderRepository } from "@/features/payments/iyzico/developmentOrderRepository";

const schema = z.strictObject({
  quoteId: z.string().uuid(),
  buyer: iyzicoBuyerSchema,
  legalAcceptance: z.strictObject({
    preInformationVersion: z.literal(paidComparisonLegalArtifacts.preInformation.version),
    distanceContractVersion: z.literal(paidComparisonLegalArtifacts.distanceContract.version),
    immediatePerformanceVersion: z.literal(paidComparisonLegalArtifacts.immediatePerformance.version),
    preInformationAccepted: z.literal(true),
    distanceContractAccepted: z.literal(true),
    immediatePerformanceAccepted: z.literal(true),
  }),
});

function rawClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1";
}

function checkoutErrorMessage(error: unknown): string {
  if (process.env.NODE_ENV === "production" || !(error instanceof Error)) return "Ödeme başlatılamadı.";
  if (error.message === "IYZICO_CREDENTIALS_REQUIRED") return "iyzico sandbox API anahtarı ve güvenlik anahtarı yerel test ortamında yapılandırılmadı.";
  if (error.message === "IYZICO_SANDBOX_CREDENTIALS_REQUIRED") return "Yerel testte yalnız iyzico sandbox anahtarları kullanılabilir.";
  if (error.message === "IYZICO_CALLBACK_URL_REQUIRED") return "iyzico sandbox callback adresi yerel test ortamında yapılandırılmadı.";
  if (error.message === "PAID_COMPARISON_QUOTE_NOT_CHECKOUT_READY") return "Yerel test teklifi ödeme deposunda bulunamadı. Test veritabanı bağlantısı gerekiyor.";
  return "Ödeme başlatılamadı. Yerel sandbox yapılandırmasını kontrol edin.";
}

export async function POST(request: Request): Promise<Response> {
  const rejected = verifySameOrigin(request);
  if (rejected) return rejected;
  if (process.env.PAID_COMPARISON_CHECKOUT_ENABLED !== "true") {
    return Response.json({ message: "Satın alma işlemi henüz kullanıma açılmadı." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
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
    const now = new Date();
    const checkout = await startIyzicoCheckout({
      quoteId: input.quoteId,
      buyer: input.buyer,
      buyerIp: rawClientIp(request),
      callbackUrl,
      secretKey: config.secretKey,
      client: createIyzicoHttpClient(config),
      repository: findDevelopmentPaidComparisonQuote(input.quoteId)
        ? new DevelopmentIyzicoOrderRepository()
        : new PostgresIyzicoOrderRepository(getPostgresDatabase()),
      legalAcceptance: { ...input.legalAcceptance, acceptedAt: now.toISOString() },
      subjectHash: clientKey(request),
      now,
    });
    return Response.json(checkout, { status: 201, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    const invalid = error instanceof z.ZodError;
    return Response.json({ message: invalid ? "Ödeme bilgileri geçersiz." : checkoutErrorMessage(error) }, {
      status: invalid ? 400 : 409,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
