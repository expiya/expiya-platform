import { z } from "zod";
import type { V3PublicResponse } from "@/features/decision/v3/types";
import { runV3TurnWithAnalyst } from "@/features/decision/v3/analyst/shadowRuntime.server";
import { runStoredV31Turn } from "@/features/decision/v3/store.server";
import { sealV31State, unsealV31State } from "@/features/decision/v3/stateToken.server";
import { evaluateV3Catalog, scoreV3Candidate } from "@/features/decision/v3/catalogAdapter.server";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";
import { RECOMMENDATION_TERMS_VERSION } from "@/lib/legal/recommendationTerms";

const schema = z.object({
  conversationId: z.string().min(1).max(100), messageId: z.string().min(1).max(100),
  message: z.string().trim().min(1).max(4_000), expectedRevision: z.number().int().nonnegative(),
  state: z.unknown().optional(),
  stateToken: z.string().max(200_000).optional(),
  includePilotDiagnostics: z.boolean().optional(),
  recommendationTermsAcceptance: z.object({ version: z.literal(RECOMMENDATION_TERMS_VERSION), acceptedAt: z.string().datetime() }).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const originRejected = verifySameOrigin(request); if (originRejected) return originRejected;
  const limited = await enforceRateLimit(request, { scope: "cars-conversation-v3", limit: 40, windowMs: 10 * 60_000 }); if (limited) return limited;
  try {
    const input = schema.parse(await readJsonWithLimit(request, 250_000));
    const output = await runStoredV31Turn({ ...input, trustedSeed: unsealV31State(input.stateToken, input.conversationId), run: (state) => runV3TurnWithAnalyst({ ...input, state, signal: request.signal }) });
    let variantCounts: V3PublicResponse["variantCounts"];
    if (input.includePilotDiagnostics && ["EXPLICIT", "ACTIVE_DISCOVERY", "READY_FOR_DECISION"].includes(output.state.purchaseIntent)) {
      try {
        const budgetMode = output.state.budgetMode ?? "NEEDS_ONLY";
        const catalog = await evaluateV3Catalog(output.state.ledger, undefined, budgetMode);
        const scores = catalog.variants.map((variant) => scoreV3Candidate(variant, output.state.ledger, budgetMode));
        const top = scores.length ? Math.max(...scores) : undefined;
        const leading = top === undefined ? undefined : scores.filter((score) => Math.abs(score - top) < 1e-9).length;
        variantCounts = { total: catalog.initialCount, remaining: catalog.variants.length, ...(leading ? { leading } : {}) };
      } catch { variantCounts = undefined; }
    }
    return Response.json({ ...output, ...(variantCounts ? { variantCounts } : {}), stateToken: sealV31State(output.state) });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ message: "Mesaj doğrulanamadı." }, { status: 400 });
    const code = error instanceof Error ? error.message : "V3_UNKNOWN";
    if (code === "V3_REVISION_CONFLICT" || code === "V3_MESSAGE_PAYLOAD_CONFLICT") return Response.json({ message: "Bu konuşma adımı başka bir yanıtla çakıştı. Sayfayı yenileyip yeniden deneyin." }, { status: 409 });
    if (code === "V3_RECOMMENDATION_TERMS_REQUIRED") return Response.json({ message: "Araç kartını görmek için güncel Araç Önerisi ve Katalog Kullanım Koşulları'nı kabul etmeniz gerekir." }, { status: 409 });
    return Response.json({ message: "Araç danışmanı şu anda geçici olarak kullanılamıyor. Konuşmanız tarayıcınızda korunuyor; lütfen yeniden deneyin." }, { status: 503 });
  }
}
