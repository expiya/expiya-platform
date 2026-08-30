import { z } from "zod";
import { createCatalogPhase2Handoff } from "@/features/sales-advisor/handoff.server";
import { enforcePhase2RateLimits, phase2SafeError, readPhase2Json } from "@/features/sales-advisor/security.server";

const schema = z.object({ exactVariantId: z.string().uuid() }).strict();
export async function POST(request: Request) {
  try {
    const input = schema.parse(await readPhase2Json(request, 2_000));
    await enforcePhase2RateLimits(request, "HANDOFF");
    return Response.json(await createCatalogPhase2Handoff({ selectedExactVariantId: input.exactVariantId }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return phase2SafeError(error); }
}
