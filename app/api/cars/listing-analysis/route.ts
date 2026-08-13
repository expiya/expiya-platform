import { z } from "zod";

import { analyzeVehicleListing } from "@/features/listing/analyzeVehicleListing";
import { readVehicleListingPage } from "@/features/listing/readVehicleListingPage";

const requestSchema = z.object({ url: z.string().trim().url().max(2_000), userContext: z.string().trim().min(1).max(20_000) });

export async function POST(request: Request): Promise<Response> {
  try {
    const input = requestSchema.parse(await request.json());
    const page = await readVehicleListingPage(input.url);
    return Response.json(await analyzeVehicleListing({ sourceUrl: page.url, pageContent: page.content, userContext: input.userContext }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "İlan analiz edilemedi.";
    const isInputError = error instanceof z.ZodError || /HTTPS|adres|ağ|HTML|sınır|yönlendirme|okunamadı/.test(message);
    return Response.json({ message: isInputError ? message : "İlan şu anda analiz edilemedi. Lütfen farklı bir bağlantı deneyin." }, { status: isInputError ? 400 : 500 });
  }
}
