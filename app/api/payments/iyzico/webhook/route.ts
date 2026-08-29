import { z } from "zod";

import { resolveIyzicoConfig } from "@/features/payments/iyzico/config";
import { PostgresIyzicoWebhookRepository } from "@/features/payments/iyzico/webhookRepository";
import { verifyIyzicoCheckoutWebhookSignature } from "@/features/payments/iyzico/webhookSignature";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { enforceRateLimit, readJsonWithLimit } from "@/lib/security/requestSecurity";

const webhookSchema = z.strictObject({
  iyziEventType: z.string().min(1).max(80),
  iyziPaymentId: z.string().min(1).max(200),
  token: z.string().min(1).max(500),
  paymentConversationId: z.string().min(1).max(200),
  status: z.enum(["FAILURE", "SUCCESS", "INIT_THREEDS", "CALLBACK_THREEDS", "BKM_POS_SELECTED", "INIT_APM", "INIT_BANK_TRANSFER", "INIT_CREDIT", "PENDING_CREDIT", "INIT_CONTACTLESS"]),
}).refine((value) => value.iyziEventType === "CHECKOUT_FORM_AUTH", "Unsupported iyzico event type.");

export async function POST(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, { scope: "iyzico-webhook", limit: 100, windowMs: 10 * 60_000 });
  if (limited) return limited;
  try {
    const payload = webhookSchema.parse(await readJsonWithLimit(request, 10_000));
    const config = resolveIyzicoConfig({
      IYZICO_ENV: process.env.IYZICO_ENV,
      IYZICO_API_KEY: process.env.IYZICO_API_KEY,
      IYZICO_SECRET_KEY: process.env.IYZICO_SECRET_KEY,
      IYZICO_LIVE_PAYMENTS_ENABLED: process.env.IYZICO_LIVE_PAYMENTS_ENABLED,
    });
    const signature = request.headers.get("x-iyz-signature-v3");
    if (!verifyIyzicoCheckoutWebhookSignature({ secretKey: config.secretKey, signature, payload })) {
      return Response.json({ message: "Invalid signature." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const outcome = await new PostgresIyzicoWebhookRepository(getPostgresDatabase()).recordAccepted(payload);
    return Response.json({ accepted: true, duplicate: outcome === "DUPLICATE" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const invalid = error instanceof z.ZodError;
    return Response.json({ message: invalid ? "Invalid payload." : "Webhook could not be recorded." }, {
      status: invalid ? 400 : 409,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
