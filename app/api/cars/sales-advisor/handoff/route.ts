import { z } from "zod";
import { createPhase2Handoff } from "@/features/sales-advisor/handoff.server";
import { enforcePhase2RateLimits, phase2SafeError, phase2SessionSubject, readPhase2Json } from "@/features/sales-advisor/security.server";

const schema = z.object({ conversationId: z.string().min(1).max(200), stateToken: z.string().min(1).max(200_000), offerId: z.string().min(1).max(200), selectedExactVariantId: z.string().min(1).max(300) }).strict();
export async function POST(request: Request) {
  try { const input = schema.parse(await readPhase2Json(request, 220_000)); await enforcePhase2RateLimits(request, "HANDOFF", [phase2SessionSubject(input.stateToken)]); return Response.json(await createPhase2Handoff(input), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return phase2SafeError(error); }
}
