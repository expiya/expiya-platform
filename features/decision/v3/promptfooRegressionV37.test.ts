import { afterEach, describe, expect, it } from "vitest";
import { activeDecisionPreferences } from "./ledger";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { routeConversationMessage } from "./router";
import { createRecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

describe("V3.7 Promptfoo conversation regressions", () => {
  it.each([
    "Geniş bagajlı, ekonomik bir SUV ya da MPV bakıyorum. Nereden başlayalım?",
    "Şehir içi kargo dağıtımı için ekonomik bir panelvan bakıyorum.",
    "Ailem için uygun bir araç seçiminde yardımcı olur musunuz?",
  ])("recognizes natural vehicle-shopping language: %s", (message) => {
    expect(["PURCHASE_INTENT_DISCOVERY", "RECOMMENDATION_OR_OFFER"]).toContain(routeConversationMessage(message, { hasPurchaseIntent: false, hasOpenQuestion: false }).route);
  });

  it("turns panel-van shopping into commercial and body constraints", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const state = createV3ConversationState("panelvan");
    const output = await runV3Turn({ conversationId: "panelvan", messageId: "1", message: "Şehir içi kargo dağıtımı için ekonomik bir panelvan bakıyorum.", expectedRevision: 0, state });
    expect(output.state.purchaseIntent).toBe("EXPLICIT");
    expect(activeDecisionPreferences(output.state.ledger)).toEqual(expect.arrayContaining([
      expect.objectContaining({ concept: "primaryUsage", normalizedValue: "COMMERCIAL" }),
      expect.objectContaining({ concept: "bodyStyle", normalizedValue: "PANEL VAN" }),
    ]));
    expect(output.message).not.toMatch(/Merhaba! Nasıl gidiyor|yeterince güvenilir/iu);
  });

  it("does not loop on recommendation consent after an unanswered budget", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("decision-loop");
    const messages = ["Şehir içi kargo dağıtımı için ekonomik bir panelvan bakıyorum.", "Dizel olsun", "Önerini göster", "Net bütçem henüz yok", "Tamam, üç alternatif göster", "Geri görüş kamerası olsun", "Üç alternatifi göster"];
    let output;
    for (const [index, message] of messages.entries()) {
      output = await runV3Turn({ conversationId: state.conversationId, messageId: String(index + 1), message, expectedRevision: state.revision, state });
      state = output.state;
    }
    expect(state.purchaseIntent).not.toBe("NOT_EXPRESSED");
    expect(output?.message).not.toMatch(/İstersen şimdi sana en uygun aracı seçebilirim/iu);
    expect(output?.offerAwaitingConsent || output?.recommendations?.length || output?.message.match(/koşulların tümünü karşılayan.*bulamadım|varyant düzeyinde doğrulayacak yeterli veri yok/iu)).toBeTruthy();
  });

  it("does not turn price-performance wording into a sports-car preference", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const state = createV3ConversationState("price-performance");
    const output = await runV3Turn({ conversationId: state.conversationId, messageId: "1", message: "Fiyat/performans odaklı ekonomik bir SUV araç bakıyorum", expectedRevision: 0, state });
    expect(output.state.ledger.some((item) => item.concept === "performance")).toBe(false);
  });

  it("records an explicit refusal to choose a body style as flexible", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("body-flexible");
    state = (await runV3Turn({ conversationId: state.conversationId, messageId: "1", message: "Elektrikli araç almak istiyorum", expectedRevision: 0, state })).state;
    state = (await runV3Turn({ conversationId: state.conversationId, messageId: "2", message: "Şehir içinde kullanacağım", expectedRevision: state.revision, state })).state;
    state = (await runV3Turn({ conversationId: state.conversationId, messageId: "3", message: "Park donanımı belirleyici değil", expectedRevision: state.revision, state })).state;
    const output = await runV3Turn({ conversationId: state.conversationId, messageId: "4", message: "İkisi de önceliğim değil", expectedRevision: state.revision, state });
    expect(output.state.ledger).toEqual(expect.arrayContaining([expect.objectContaining({ concept: "bodyNotImportant", normalizedValue: "FLEXIBLE" })]));
    expect(output.state.lastQuestionKey).not.toBe("budget");
  });

  it("matches pickup catalog facts without Turkish dotted-I corruption and clears rejected equipment", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("pickup-camera");
    for (const [index, message] of ["Ticari amaçlı bir kamyonete ihtiyacım var", "Dizel olsun", "Bütçem 5 milyon TL", "Geri görüş kamerası olsun", "Geri görüş kamerası olmasın, sorun değil"].entries()) {
      state = (await runV3Turn({ conversationId: state.conversationId, messageId: String(index + 1), message, expectedRevision: state.revision, state })).state;
    }
    expect(activeDecisionPreferences(state.ledger).some((item) => item.concept === "equipmentFeature")).toBe(false);
    const output = await runV3Turn({ conversationId: state.conversationId, messageId: "6", message: "Tamam, tek araç seç", expectedRevision: state.revision, state });
    expect(output.message).not.toMatch(/koşulların tümünü karşılayan.*bulamadım/iu);
  });

  it("answers a catalog-overview opening and begins purchase discovery", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const state = createV3ConversationState("catalog-opening");
    const output = await runV3Turn({ conversationId: state.conversationId, messageId: "1", message: "Selam. Sizde hangi araçlar var?", expectedRevision: 0, state });
    expect(output.state.lastRoute).toBe("PURCHASE_INTENT_DISCOVERY");
    expect(output.message).toMatch(/binek.*ticari/iu);
    expect(output.message).toMatch(/nerede ve ne için/iu);
    expect(output.message).not.toMatch(/yeterince güvenilir/iu);
  });

  it("persists a single-car request through a neutral brand fallback and does not repeat equipment discovery", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("single-after-neutral-brand");
    let output = await runV3Turn({ conversationId: state.conversationId, messageId: "1", message: "Şehir içinde sıfır, otomatik, benzinli kompakt bir araç istiyorum. 1-2 kişiyiz. Geri görüş kamerası önemli. Bütçeyi filtreye katma. Bana tek araç öner.", expectedRevision: 0, state });
    state = output.state;
    expect(state.preferredRecommendationLimit).toBe(1);
    expect(output.message).not.toMatch(/gerçekten ayıran donanım|vazgeçmek istemeyeceğin tek bir özellik/iu);
    for (const [id, message] of [["2", "Marka tercihim yok, sen seç"], ["3", "Evet, göster"]] as const) {
      output = await runV3Turn({ conversationId: state.conversationId, messageId: id, message, expectedRevision: state.revision, state, ...(state.pendingOffer ? { recommendationTermsAcceptance: createRecommendationTermsAcceptance() } : {}) });
      state = output.state;
    }
    expect(output.recommendations).toHaveLength(1);
  });
});
