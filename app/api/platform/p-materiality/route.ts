import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createRootPMaterialityRuntime, answerRootPMaterialityRuntime, readRootPMaterialityRuntime } from "@/features/semantic-decision-projection/v2/rootRuntimeConsumer.server";
import { sealRootPMaterialityState, unsealRootPMaterialityState } from "@/features/semantic-decision-projection/v2/rootRuntimeStateToken.server";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

export const runtime = "nodejs";
const create = z.strictObject({ action: z.literal("CREATE"), conversationId: z.string().uuid(), messageId: z.string().min(1).max(200), departmentId: z.string().min(1).max(80), categoryId: z.string().min(1).max(100) });
const read = z.strictObject({ action: z.literal("READ"), conversationId: z.string().uuid(), categoryId: z.string().min(1).max(100), stateToken: z.string().max(500_000) });
const turn = z.strictObject({ action: z.literal("TURN"), conversationId: z.string().uuid(), messageId: z.string().min(1).max(200), expectedRevision: z.number().int().nonnegative(), categoryId: z.string().min(1).max(100), message: z.string().trim().min(1).max(4000), stateToken: z.string().max(500_000), choice: z.strictObject({ questionKey: z.string().min(1).max(200), values: z.array(z.string().min(1).max(100)).length(1) }).optional() });
const schema = z.discriminatedUnion("action", [create, read, turn]);
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function answerFromMessage(message: string): string | undefined {
  const normalized = message.trim().toLocaleLowerCase("tr-TR");
  if (/\b(?:bilmiyorum|emin değilim)\b/u.test(normalized)) return "UNKNOWN";
  if (/\b(?:hayır|önemli değil|zorunlu değil)\b/u.test(normalized) || /\b55\s*(?:inç|inch|["”])/u.test(normalized)) return "NO";
  if (/\b(?:evet|gerekli|önemli|istiyorum)\b/u.test(normalized) || /\b(?:65|75)\s*(?:inç|inch|["”])/u.test(normalized)) return "YES";
  return undefined;
}

export async function POST(request: Request): Promise<Response> {
  const origin = verifySameOrigin(request); if (origin) return origin;
  const limited = await enforceRateLimit(request, { scope: "platform-p-materiality", limit: 40, windowMs: 60_000 }); if (limited) return limited;
  try {
    const parsed = schema.safeParse(await readJsonWithLimit(request, 500_000));
    if (!parsed.success) return json({ kind: "FAILED_CLOSED", message: "Geçersiz P görüşme isteği." }, 400);
    const data = parsed.data;
    if (data.action === "CREATE") {
      const result = await createRootPMaterialityRuntime(data.departmentId, data.categoryId);
      return json({ ...result.outcome, conversationId: data.conversationId, revision: 0, categoryId: data.categoryId, stateToken: sealRootPMaterialityState(result.state) });
    }
    const state = unsealRootPMaterialityState(data.stateToken, data.categoryId);
    if (!state) return json({ kind: "FAILED_CLOSED", message: "İmzalı P görüşme durumu doğrulanamadı." }, 409);
    if (data.action === "READ") {
      const result = await readRootPMaterialityRuntime(state);
      return json({ kind: "CONVERSATION", conversationId: data.conversationId, revision: state.answerLedger.length, categoryId: data.categoryId, outcome: result.outcome, stateToken: sealRootPMaterialityState(result.state) });
    }
    if (data.expectedRevision !== state.answerLedger.length) return json({ kind: "FAILED_CLOSED", message: "P görüşmesi güncellendi; yeniden okuyun." }, 409);
    const normalized = data.message.toLocaleLowerCase("tr-TR");
    const operation = /(?:temizle|sil|unut)/u.test(normalized) ? "CLEAR" as const : /(?:düzelt|yerine)/u.test(normalized) ? "CORRECT" as const : "ANSWER" as const;
    if (!state.pendingQuestionId && operation === "ANSWER") {
      const result = await readRootPMaterialityRuntime(state);
      const candidate = "candidateSummaries" in result.outcome && result.outcome.candidateSummaries.find(item => item.exactProductId === data.message || item.label.toLocaleLowerCase("tr-TR") === data.message.toLocaleLowerCase("tr-TR"));
      return json({ ...result.outcome, message: candidate ? `${candidate.label} açık ürün tercihi olarak composer’da korundu. P katmanı bu tercihten tek başına kazanan veya karar yetkisi üretmez.` : result.outcome.message, conversationId: data.conversationId, revision: state.answerLedger.length, categoryId: data.categoryId, stateToken: sealRootPMaterialityState(result.state) });
    }
    if (data.choice && data.choice.questionKey !== state.pendingQuestionId) return json({ kind: "FAILED_CLOSED", message: "Yanıt bekleyen maddi soruyla eşleşmiyor." }, 409);
    const answerId = operation === "CLEAR" ? undefined : data.choice?.values[0] ?? answerFromMessage(data.message);
    if (operation !== "CLEAR" && !answerId) return json({ kind: "CLARIFY", message: "Bu maddi soru için seçeneğinizi açıkça belirtin.", questionKey: state.pendingQuestionId, revision: state.answerLedger.length, stateToken: data.stateToken });
    const result = await answerRootPMaterialityRuntime({ slice: state, eventId: randomUUID(), answerId, operation });
    return json({ ...result.outcome, conversationId: data.conversationId, revision: result.state.answerLedger.length, categoryId: data.categoryId, stateToken: sealRootPMaterialityState(result.state) });
  } catch (error) {
    console.error("root_p_materiality_failed", { code: error instanceof Error ? error.message : "UNKNOWN" });
    return json({ kind: "FAILED_CLOSED", message: "P yetkisi güvenli biçimde yüklenemedi." }, 503);
  }
}
