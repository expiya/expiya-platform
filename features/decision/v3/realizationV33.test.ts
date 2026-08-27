import { describe, expect, it } from "vitest";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { contextualQuestion, dailyUsageContext, isTurkishPublicCopy } from "./turkishRealization";
import { createRecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";

describe("V3.3 Turkish and daily-use realization", () => {
  it("uses a user-specific daily-use example from conversation history", async () => {
    let output = await runV3Turn({ conversationId: "history-cue", messageId: "1", message: "Yeni araç almak istiyorum", expectedRevision: 0 });
    output = await runV3Turn({ conversationId: "history-cue", messageId: "2", message: "Çocuğu okula bırakmak için şehir içinde kullanacağım", expectedRevision: output.state.revision, state: output.state });
    expect(output.message).toMatch(/senin de söylediğin gibi, okul yolculuklarını/iu); expect(output.message).toMatch(/Park kolaylığı mı|ferah ve yüksek/iu);
  });

  it("generates a Turkish daily-use example when history has none", () => {
    const state = createV3ConversationState("generic-cue"); const text = contextualQuestion(state, "primaryUsage", "Aracı en çok hangi günlük ihtiyaç için kullanacaksın?");
    expect(text).toMatch(/işe gidiş, aile yolculuğu, uzun yol/iu); expect(isTurkishPublicCopy(text)).toBe(true); expect(dailyUsageContext(state)).toMatch(/Günlük kullanımda/iu);
  });

  it("rejects English public copy", () => {
    expect(isTurkishPublicCopy("Your car recommendation is ready")).toBe(false); expect(isTurkishPublicCopy("Seçimin hazır.")).toBe(true);
  });

  it("reveals only brand/model titles without examples, details or experience copy", async () => {
    let output = await runV3Turn({ conversationId: "no-model-copy", messageId: "1", message: "Yeni araç almak istiyorum", expectedRevision: 0 });
    for (const [id, message] of [["2", "Şehir içinde günlük kullanacağım"], ["3", "Parkı kolay hatchback olsun"], ["4", "Kesin bütçem 3 milyon TL"], ["5", "Elektrikli olsun"], ["6", "Geri görüş kamerası kesin olsun"], ["7", "Tek araç öner"], ["8", "Evet, göster"]] as const) output = await runV3Turn({ conversationId: "no-model-copy", messageId: id, message, expectedRevision: output.state.revision, state: output.state, ...(output.state.pendingOffer ? { recommendationTermsAcceptance: createRecommendationTermsAcceptance() } : {}) });
    expect(output.recommendations).toHaveLength(1); expect(output.recommendations![0]).toMatchObject({ id: expect.any(String), title: expect.any(String), image: expect.any(String), imageStatus: expect.any(String) });
    expect(output.message).toBe("Karar motorunun seçtiği aracı paylaşıyorum."); expect(output.message).not.toContain(output.recommendations![0]!.title);
  });
});
