import { z } from "zod";

import { createAndPersistPaidComparisonQuote } from "@/features/paid-comparison/server";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const schema = z.strictObject({
  handoff: z.string().min(20).max(300_000),
  alternativeVariantIds: z.tuple([z.string().min(1).max(300), z.string().min(1).max(300)]),
});

export async function POST(request: Request): Promise<Response> {
  const rejected = verifySameOrigin(request);
  if (rejected) return rejected;
  const limited = await enforceRateLimit(request, { scope: "paid-comparison-quotes", limit: 10, windowMs: 10 * 60_000 });
  if (limited) return limited;
  try {
    const input = schema.parse(await readJsonWithLimit(request, 315_000));
    const quote = await createAndPersistPaidComparisonQuote(input);
    return Response.json({
      quoteId: quote.id,
      productCode: quote.productCode,
      vehicles: quote.vehicles,
      amountKurus: quote.amountKurus,
      currency: quote.currency,
      taxIncluded: quote.taxIncluded,
      expiresAt: quote.expiresAt,
    }, { status: 201, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    const invalid = error instanceof z.ZodError;
    const developmentMessage = process.env.NODE_ENV !== "production" && error instanceof Error ? `Rapor teklifi oluşturulamadı: ${error.message}` : "Rapor teklifi oluşturulamadı.";
    return Response.json({ message: invalid ? "Geçersiz istek." : developmentMessage }, {
      status: invalid ? 400 : 409,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
