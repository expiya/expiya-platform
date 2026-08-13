import { z } from "zod";

import { analyzeVehicleListing } from "@/features/listing/analyzeVehicleListing";
import { readVehicleListingPage } from "@/features/listing/readVehicleListingPage";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const requestSchema = z.object({ url: z.string().trim().url().max(2_000), userContext: z.string().trim().min(1).max(20_000) });

export async function POST(request: Request): Promise<Response> {
  const originRejected = verifySameOrigin(request);
  if (originRejected) return originRejected;
  const rejected = await enforceRateLimit(request, { scope: "listing-analysis", limit: 5, windowMs: 10 * 60_000 });
  if (rejected) return rejected;
  try {
    const input = requestSchema.parse(await readJsonWithLimit(request, 30_000));
    const page = await readVehicleListingPage(input.url);
    return Response.json(await analyzeVehicleListing({ sourceUrl: page.url, pageContent: page.content, userContext: input.userContext }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "İlan analiz edilemedi.";
    const isInputError = error instanceof z.ZodError || /HTTPS|adres|ağ|HTML|sınır|yönlendirme|okunamadı/.test(message);
    return Response.json({ message: isInputError ? message : "İlan şu anda analiz edilemedi. Lütfen farklı bir bağlantı deneyin." }, { status: isInputError ? 400 : 500 });
  }
}
