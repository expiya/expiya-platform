import { z } from "zod";
import type { V3PublicResponse } from "@/features/decision/v3/types";
import { executePreparedCarsDecision } from "@/features/decision/v3/engine.server";
import { prepareCarsTurn } from "@/features/decision/v3/prepareCarsTurn.server";
import { planCarsTurn } from "@/features/decision/v3/planCarsTurn.server";
import { runStoredV31Turn } from "@/features/decision/v3/store.server";
import { sealV31State, unsealV31State } from "@/features/decision/v3/stateToken.server";
import { evaluateV3Catalog } from "@/features/decision/v3/catalogAdapter.server";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";
import { RECOMMENDATION_TERMS_VERSION } from "@/lib/legal/recommendationTerms";
import { requireXpyDomainPack } from "@/features/xpy/domainPacks";
import { carsQuestionChoices, validateCarsChoice } from "@/features/decision/v3/carsQuestionChoices";
import { choiceSubmissionText, consumerQuestionText } from "@/features/xpy/questionGuidance";

const schema = z.object({
  conversationId: z.string().min(1).max(100), messageId: z.string().min(1).max(100),
  message: z.string().trim().min(1).max(4_000), expectedRevision: z.number().int().nonnegative(),
  state: z.unknown().optional(),
  stateToken: z.string().max(200_000).optional(),
  includePilotDiagnostics: z.boolean().optional(),
  recommendationTermsAcceptance: z.object({ version: z.literal(RECOMMENDATION_TERMS_VERSION), acceptedAt: z.string().datetime() }).optional(),
  choice: z.strictObject({ questionKey: z.string().min(1).max(200), values: z.array(z.string().min(1).max(300)).min(1).max(8) }).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const originRejected = verifySameOrigin(request); if (originRejected) return originRejected;
  const limited = await enforceRateLimit(request, { scope: "cars-conversation-v3", limit: 40, windowMs: 10 * 60_000 }); if (limited) return limited;
  try {
    const input = schema.parse(await readJsonWithLimit(request, 250_000));
    requireXpyDomainPack("CARS");
    const trustedSeed = unsealV31State(input.stateToken, input.conversationId);
    if (input.choice && !validateCarsChoice(trustedSeed?.lastQuestionKey, input.choice)) return Response.json({ message: "Seçenek bekleyen Cars sorusu için geçerli değil." }, { status: 409 });
    const message = input.choice ? choiceSubmissionText(input.choice) : input.message;
    const output = await runStoredV31Turn({ ...input, message, trustedSeed, stages: {
      prepare: state => prepareCarsTurn(state, { ...input, message, signal: request.signal }),
      plan: planCarsTurn,
      decide: executePreparedCarsDecision,
    } });
    let variantCounts: V3PublicResponse["variantCounts"];
    if (input.includePilotDiagnostics && ["EXPLICIT", "ACTIVE_DISCOVERY", "READY_FOR_DECISION"].includes(output.state.purchaseIntent)) {
      try { const catalog = await evaluateV3Catalog(output.state.ledger, undefined, output.state.budgetMode ?? "NEEDS_ONLY"); variantCounts = { total: catalog.initialCount, remaining: catalog.variants.length }; } catch { variantCounts = undefined; }
    }
    const choices = carsQuestionChoices(output.state.lastQuestionKey);
    return Response.json({ ...output, message: choices ? consumerQuestionText(output.message, choices) : output.message, ...(choices ? { choices } : {}), ...(variantCounts ? { variantCounts } : {}), stateToken: sealV31State(output.state) });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ message: "Mesaj doğrulanamadı." }, { status: 400 });
    const code = error instanceof Error ? error.message : "V3_UNKNOWN";
    if (code === "V3_REVISION_CONFLICT" || code === "V3_MESSAGE_PAYLOAD_CONFLICT") return Response.json({ message: "Bu konuşma adımı başka bir yanıtla çakıştı. Sayfayı yenileyip yeniden deneyin." }, { status: 409 });
    if (code === "V3_RECOMMENDATION_TERMS_REQUIRED") return Response.json({ message: "Araç kartını görmek için güncel Araç Önerisi ve Katalog Kullanım Koşulları'nı kabul etmeniz gerekir." }, { status: 409 });
    return Response.json({ message: "Araç danışmanı şu anda geçici olarak kullanılamıyor. Konuşmanız tarayıcınızda korunuyor; lütfen yeniden deneyin." }, { status: 503 });
  }
}
