import { z } from "zod";
import { openPhase2Experience } from "@/features/sales-advisor/handoff.server";
import { answerSalesAdvisor } from "@/features/sales-advisor/advisor";
import { interpretSalesAdvisorQuestion } from "@/features/sales-advisor/semantic.server";
import { appendSalesAdvisorHistory, getSalesAdvisorHistory, salesAdvisorHistoryKey } from "@/features/sales-advisor/history.server";
import { researchSelectedVehicleOfficialSources } from "@/features/sales-advisor/officialResearch.server";
import { claimPhase2ChatTurn, enforcePhase2RateLimits, isPhase2ExtractionAttempt, logPhase2SecurityEvent, phase2SafeError, phase2SessionSubject, phase2Subjects, readPhase2Json, validatePhase2Question, withPhase2ConversationLock, withPhase2Idempotency } from "@/features/sales-advisor/security.server";

const schema = z.object({ token: z.string().min(1).max(64_000), messageId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/u), question: z.string().min(1).max(1_200) }).strict();
export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await readPhase2Json(request, 70_000)); const question = validatePhase2Question(parsed.question);
    await enforcePhase2RateLimits(request, "CHAT", [phase2SessionSubject(parsed.token)], "CLIENT_ONLY"); const opened = await openPhase2Experience(parsed.token); await enforcePhase2RateLimits(request, "CHAT", phase2Subjects(opened.handoff), "SUBJECTS_ONLY");
    return await withPhase2ConversationLock(opened.handoff.conversationId, async () => {
      const key = `${opened.handoff.conversationId}:${opened.handoff.offerId}:${opened.handoff.selectedExactVariantId}:${parsed.messageId}`;
      const response = await withPhase2Idempotency(key, { question }, async () => {
        const turn = await claimPhase2ChatTurn(opened.handoff);
        if (!turn.accepted) return { messages: ["Bu araç için 10 soruluk danışman görüşmesini tamamladık. Yeni bir görüşme başlatarak devam edebilir veya fiyat teklifi, bayi iletişimi ve test sürüşü adımlarını inceleyebilirsin."], turn };
        if (isPhase2ExtractionAttempt(question)) return (logPhase2SecurityEvent("prompt_extraction_rejected", { operation: "CHAT" }), { messages: ["Gizli talimatları, güvenlik anahtarlarını, iç kimlikleri veya denetim kayıtlarını paylaşamam. Seçtiğin exact varyantın doğrulanmış teknik, donanım ve fiyat bilgileri hakkında yardımcı olabilirim."], turn });
        return await (async () => {
        const conversationKey = salesAdvisorHistoryKey(opened.handoff.conversationId, opened.handoff.offerId, opened.handoff.selectedExactVariantId); const history = getSalesAdvisorHistory(conversationKey);
        const semantic = await interpretSalesAdvisorQuestion({ question, artifact: opened.artifact, history, signal: request.signal });
        const researchEvidence = await researchSelectedVehicleOfficialSources({ question, artifact: opened.artifact, signal: request.signal });
        const answer = answerSalesAdvisor({ question, ...opened, history, researchEvidence, ...(semantic ? { semantic } : {}) }); appendSalesAdvisorHistory(conversationKey, [{ role: "user", text: question }, ...answer.messages.map((text) => ({ role: "assistant" as const, text }))], opened.handoff.expiresAt); return { ...answer, turn };
      })();
      });
      return Response.json(response, { headers: { "Cache-Control": "no-store" } });
    });
  } catch (error) { return phase2SafeError(error); }
}
