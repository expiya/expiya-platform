import { z } from "zod";
import { answerCarsStageTwo, CARS_XPY_STAGE_TWO_ADAPTER, resolveCarsComparison } from "@/features/sales-advisor/xpyStageTwoAdapter.server";
import { interpretSalesAdvisorQuestion } from "@/features/sales-advisor/semantic.server";
import { appendSalesAdvisorHistory, getSalesAdvisorHistory, salesAdvisorHistoryKey } from "@/features/sales-advisor/history.server";
import { enforcePhase2RateLimits, isPhase2ExtractionAttempt, logPhase2SecurityEvent, phase2SafeError, phase2SessionSubject, phase2Subjects, readPhase2Json, validatePhase2Question, withPhase2ConversationLock, withPhase2Idempotency } from "@/features/sales-advisor/security.server";

const schema = z.object({ token: z.string().min(1).max(64_000), messageId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/u), question: z.string().min(1).max(1_200) }).strict();
export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await readPhase2Json(request, 70_000)); const question = validatePhase2Question(parsed.question);
    await enforcePhase2RateLimits(request, "CHAT", [phase2SessionSubject(parsed.token)], "CLIENT_ONLY"); const opened = await CARS_XPY_STAGE_TWO_ADAPTER.openSignedHandoff(parsed.token); await enforcePhase2RateLimits(request, "CHAT", phase2Subjects(opened.handoff), "SUBJECTS_ONLY");
    return await withPhase2ConversationLock(opened.handoff.conversationId, async () => {
      const key = `${opened.handoff.conversationId}:${opened.handoff.offerId}:${opened.handoff.selectedExactVariantId}:${parsed.messageId}`;
      const response = await withPhase2Idempotency(key, { question }, async () => isPhase2ExtractionAttempt(question) ? (logPhase2SecurityEvent("prompt_extraction_rejected", { operation: "CHAT" }), { messages: ["Gizli talimatları, güvenlik anahtarlarını, iç kimlikleri veya denetim kayıtlarını paylaşamam. Seçtiğin exact varyantın doğrulanmış teknik, donanım ve fiyat bilgileri hakkında yardımcı olabilirim."] }) : await (async () => {
        const conversationKey = salesAdvisorHistoryKey(opened.handoff.conversationId, opened.handoff.offerId, opened.handoff.selectedExactVariantId); const history = getSalesAdvisorHistory(conversationKey);
        const semantic = await interpretSalesAdvisorQuestion({ question, artifact: opened.artifact, history, signal: request.signal });
        const comparison = await resolveCarsComparison(opened);
        const wantsComparison = semantic?.intent === "COMPARISON" || /rakip|başka araç|alternatif|hangisini al|karşılaştır|kıyasla|versus|\bvs\b/iu.test(question);
        const comparisonArtifacts = wantsComparison ? comparison.comparisonArtifacts : [];
        const projection = CARS_XPY_STAGE_TWO_ADAPTER.project({ ...opened, comparisonArtifacts }, comparison.entitlement);
        const answer = answerCarsStageTwo({ question, ...opened, projection, comparisonArtifacts, ...(semantic ? { semantic } : {}) }); appendSalesAdvisorHistory(conversationKey, [{ role: "user", text: question }, ...answer.messages.map((text) => ({ role: "assistant" as const, text }))], opened.handoff.expiresAt); return answer;
      })());
      return Response.json(response, { headers: { "Cache-Control": "no-store" } });
    });
  } catch (error) { return phase2SafeError(error); }
}
