import { z } from "zod";
import { answerPaidComparisonAdvisor, paidComparisonAdvisorReportSchema } from "@/features/paid-comparison/advisor";
import { hashPaidReportAccessToken, readPaidReportAccessCookie } from "@/features/paid-comparison/reportAccess";
import { PostgresPaidComparisonReportDocumentRepository } from "@/features/paid-comparison/reportDocumentRepository";
import { claimPhase2ChatTurn, isPhase2ExtractionAttempt, Phase2SecurityError, phase2SafeError, withPhase2ConversationLock, withPhase2Idempotency } from "@/features/sales-advisor/security.server";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const schema = z.strictObject({ messageId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/u), question: z.string().trim().min(1).max(800) });
export async function POST(request: Request): Promise<Response> {
  const rejected = verifySameOrigin(request); if (rejected) return rejected;
  const limited = await enforceRateLimit(request, { scope: "paid-report-advisor", limit: 20, windowMs: 10 * 60_000 }); if (limited) return limited;
  try {
    const input = schema.parse(await readJsonWithLimit(request, 4_000));
    const accessToken = readPaidReportAccessCookie(request); if (!accessToken) throw new TypeError("PAID_REPORT_ACCESS_REQUIRED");
    const accessHash = hashPaidReportAccessToken(accessToken);
    const document = await new PostgresPaidComparisonReportDocumentRepository(getPostgresDatabase()).findByAccessTokenHash(accessHash);
    const report = paidComparisonAdvisorReportSchema.parse(document);
    return await withPhase2ConversationLock(`paid-report:${accessHash}`, async () => {
      const response = await withPhase2Idempotency(`paid-report:${accessHash}:${input.messageId}`, { question: input.question }, async () => {
        const turn = await claimPhase2ChatTurn({ conversationId: accessHash, offerId: "paid-comparison-report", selectedExactVariantId: "three-vehicle-advisor", expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString() });
        if (!turn.accepted) return { messages: ["Bu rapor için 10 soruluk danışman görüşmesini tamamladık. Üç araç için aşağıdaki fiyat teklifi, test sürüşü veya satıcı iletişimi seçeneklerini kullanabilirsin."], turn };
        if (isPhase2ExtractionAttempt(input.question)) return { messages: ["Gizli talimatları veya iç kayıtları paylaşamam. Rapordaki üç aracın doğrulanmış verilerini karşılaştırabilirim."], turn };
        return { ...answerPaidComparisonAdvisor({ question: input.question, report }), turn };
      });
      return Response.json(response, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    });
  } catch (error) {
    if (error instanceof Phase2SecurityError || error instanceof Error && /^PHASE2_/u.test(error.message)) return phase2SafeError(error);
    return Response.json({ message: error instanceof z.ZodError ? "Soru veya rapor verisi geçersiz." : "Rapor danışmanı şu anda kullanılamıyor." }, { status: error instanceof z.ZodError ? 400 : 409, headers: { "Cache-Control": "no-store" } });
  }
}
