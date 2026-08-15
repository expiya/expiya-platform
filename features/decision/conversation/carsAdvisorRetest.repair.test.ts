import { describe, expect, it, vi } from "vitest";

vi.mock("./planCarsConversationTurn", () => ({
  planCarsConversationTurn: vi.fn().mockResolvedValue({
    requestedModel: "gpt-5.5",
    parseOutcome: "UNAVAILABLE",
    fallbackUsed: false,
  }),
}));

import { emptyConversationTrace } from "./carsRequirementLedger";
import {
  interpretLatestUserAct,
  isActualCorrection,
  isOfferAcceptanceText,
  isOfferDeclineText,
  resolveConversationAddressForm,
} from "./carsSocialIntent";
import { VAGUE_CONTINUITY, createCarsBoundedRecovery } from "./createCarsBoundedRecovery";
import { isVagueContinuityPhrase, assessForwardProgress } from "./carsForwardProgress";
import { assessDirectRecommendationCoverage } from "./carsDirectRecommendation";
import { runCarsConversationTurn } from "./runCarsConversationTurn";
import { evaluateCarsConversationQuality } from "./evaluateCarsConversationQuality";

const ACCEPTANCE = [
  "evet",
  "göster",
  "görelim",
  "tamam, göster",
  "tamam, görelim",
  "görelim bakalım",
  "neymiş görelim",
  "hadi göster",
  "olur, görmek istiyorum",
  "tamam. görelim bakalım neymiş.",
];

const DECLINE = [
  "hayır",
  "istemiyorum",
  "şimdilik istemiyorum",
  "hayır, şimdilik görmek istemiyorum",
  "sonra bakarız",
  "şimdi göstermene gerek yok",
  "vazgeçtim",
  "kalsın",
];

describe("advisor retest repair — act classification", () => {
  it("treats help-start vehicle intent as intent, not a correction", () => {
    const text = "Aslında araba almayı düşünüyorum ama nereden başlayacağımı bilmiyorum.";
    const act = interpretLatestUserAct([{ id: "1", role: "user", content: text }]);
    expect(act.primaryAct).toBe("VEHICLE_INTENT");
    expect(act.secondaryActs).toContain("HELP_START_REQUEST");
    expect(act.isCorrection).toBe(false);
    expect(isActualCorrection(text, emptyConversationTrace())).toBe(false);
  });

  it("classifies a capability question without treating it as a greeting", () => {
    const act = interpretLatestUserAct([
      { id: "1", role: "user", content: "Merhaba" },
      { id: "2", role: "assistant", content: "Merhaba! Hoş geldiniz. Nasıl yardımcı olabilirim?" },
      { id: "3", role: "user", content: "Ne yapabildiğini merak ettim." },
    ], { ...emptyConversationTrace(), vehicleIntentEstablished: false });
    expect(act.primaryAct).toBe("CAPABILITY_QUESTION");
    expect(act.isCapabilityQuestion).toBe(true);
    expect(act.isPureGreeting).toBe(false);
  });

  it("classifies return-to-topic", () => {
    const act = interpretLatestUserAct([
      { id: "1", role: "user", content: "Aile için araba bakıyorum" },
      { id: "2", role: "assistant", content: "Şehir içi mi öne çıkıyor?" },
      { id: "3", role: "user", content: "Neyse, arabaya dönelim." },
    ], { ...emptyConversationTrace(), vehicleIntentEstablished: true });
    expect(act.primaryAct).toBe("RETURN_TO_TOPIC");
    expect(act.isReturnToVehicle).toBe(true);
  });

  it("classifies a Clio comparison request", () => {
    const act = interpretLatestUserAct([{ id: "1", role: "user", content: "Arkadaşlarım Clio almamı önerdi, sen ne dersin?" }]);
    expect(act.primaryAct).toBe("DIRECT_MODEL_COMPARISON_REQUEST");
    expect(act.isDirectModelComparison).toBe(true);
    expect(act.namedModel).toBe("clio");
  });

  it("classifies a named alternative request", () => {
    const act = interpretLatestUserAct([{ id: "1", role: "user", content: "Clio harici ne var söyle." }]);
    expect(act.primaryAct).toBe("DIRECT_RECOMMENDATION_REQUEST");
    expect(act.isDirectRecommendationRequest).toBe(true);
    expect(act.namedModel).toBe("clio");
  });

  it.each(ACCEPTANCE)("binds acceptance phrase: %s", (phrase) => {
    expect(isOfferAcceptanceText(phrase)).toBe(true);
    expect(isOfferDeclineText(phrase)).toBe(false);
    const act = interpretLatestUserAct([{ id: "1", role: "user", content: phrase }], {
      ...emptyConversationTrace(),
      recommendationOfferStatus: "AWAITING_CONSENT",
      vehicleIntentEstablished: true,
    });
    expect(act.primaryAct).toBe("OFFER_ACCEPTANCE");
    expect(act.isRecommendationAcceptance).toBe(true);
  });

  it.each(DECLINE)("binds decline phrase: %s", (phrase) => {
    expect(isOfferDeclineText(phrase)).toBe(true);
    const act = interpretLatestUserAct([{ id: "1", role: "user", content: phrase }], {
      ...emptyConversationTrace(),
      recommendationOfferStatus: "AWAITING_CONSENT",
      vehicleIntentEstablished: true,
    });
    expect(act.primaryAct).toBe("OFFER_DECLINE");
    expect(act.isRecommendationDecline).toBe(true);
    expect(act.isCorrection).toBe(false);
  });
});

describe("advisor retest repair — recovery and forward progress", () => {
  it("never uses the forbidden vague continuity phrase", () => {
    expect(isVagueContinuityPhrase(VAGUE_CONTINUITY)).toBe(true);
    const recovery = createCarsBoundedRecovery({
      ...emptyConversationTrace(),
      vehicleIntentEstablished: true,
      requirements: [{
        key: "USAGE_CITY",
        value: "CITY",
        status: "UNDERSTOOD_BUT_UNSUPPORTED",
        category: "USAGE_CONTEXT",
        evaluability: "UNDERSTOOD_NOT_EVALUABLE",
        sourceTurn: 1,
        sourceText: "şehirde kullanacağım",
        usedInDecision: false,
      }],
    }, "Neyse, arabaya dönelim.", interpretLatestUserAct(
      [{ id: "1", role: "user", content: "Neyse, arabaya dönelim." }],
      { ...emptyConversationTrace(), vehicleIntentEstablished: true },
    ));
    expect(recovery.response.message).not.toBe(VAGUE_CONTINUITY);
    expect(isVagueContinuityPhrase(recovery.response.message)).toBe(false);
    expect(recovery.response.message).toMatch(/şehir|aile|bütçe|günlük/iu);
  });

  it("detects repeated generic Clio advice as semantic repetition", () => {
    const prior = "Clio kötü bir öneri değil; küçük otomatik hatchback, kolay park, düşük masraf riski ve aktif ikinci el pazarı var. Temiz örnek modelden önemli. Rastgele seçme.";
    const next = "Küçük otomatik hatchback almak mantıklı; kolay park edilir, düşük gider riski taşır ve ikinci elde yaygındır. Clio tek seçenek değil, rastgele model seçme.";
    const progress = assessForwardProgress({
      latestUser: "Clio harici ne var söyle.",
      assistantMessage: next,
      recentAssistant: [prior],
      directQuestionAnswered: false,
      stateChanged: false,
      askedMaterialQuestion: true,
      statedLimitation: false,
      repaired: false,
      recommendationAction: false,
    });
    expect(progress.semanticRepetitionDetected).toBe(true);
  });

  it("blocks named Clio alternatives by catalog coverage", () => {
    expect(assessDirectRecommendationCoverage({
      namedModel: "clio",
      wantsNamedAlternatives: true,
      memory: emptyConversationTrace(),
    })).toBe("DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE");
  });
});

describe("advisor retest repair — conversation turns", () => {
  it("answers a capability question without greeting again", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "capability",
      messages: [
        { id: "1", role: "user", content: "Merhaba" },
        { id: "2", role: "assistant", content: "Merhaba! Hoş geldiniz. Nasıl yardımcı olabilirim?" },
        { id: "3", role: "user", content: "Ne yapabildiğini merak ettim." },
      ],
    });
    expect(response.message).not.toMatch(/merhaba|hoş geldiniz/iu);
    expect(response.message).toMatch(/ihtiyaç|daralt|yardım/iu);
    expect(response.message).not.toMatch(/hangi senaryo|kaç koltuk|kaç litre/iu);
    expect(response.conversation?.turnProvenance?.latestPrimaryAct).toBe("CAPABILITY_QUESTION");
    expect(response.conversation?.turnProvenance?.directQuestionAnswered).toBe(true);
  });

  it("starts helpfully on vehicle-intent plus help-start", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "help-start",
      messages: [{ id: "1", role: "user", content: "Aslında araba almayı düşünüyorum ama nereden başlayacağımı bilmiyorum." }],
    });
    expect(response.message).not.toMatch(/düzeltmen/iu);
    expect(response.message).toMatch(/şehir|günlük|aile|başlangıç/iu);
    expect(response.conversation?.turnProvenance?.latestPrimaryAct).toBe("VEHICLE_INTENT");
  });

  it("resumes concrete vehicle context on return-to-topic", async () => {
    const first = await runCarsConversationTurn({
      conversationId: "return",
      messages: [{ id: "1", role: "user", content: "Genelde şehirde kullanacağım ama hafta sonu ailemle dışarı çıkıyoruz." }],
    });
    const returned = await runCarsConversationTurn({
      conversationId: "return",
      conversation: first.conversation,
      messages: [
        { id: "1", role: "user", content: "Genelde şehirde kullanacağım ama hafta sonu ailemle dışarı çıkıyoruz." },
        { id: "2", role: "assistant", content: first.message },
        { id: "3", role: "user", content: "Neyse, arabaya dönelim." },
      ],
    });
    expect(returned.message).not.toMatch(/kaçırmadım|oradan devam ederiz/iu);
    expect(returned.message).toMatch(/şehir|aile/iu);
    expect(returned.conversation?.turnProvenance?.latestPrimaryAct).toBe("RETURN_TO_TOPIC");
  });

  it.each(ACCEPTANCE)("reveals the held card for acceptance: %s", async (phrase) => {
    const offer = await runCarsConversationTurn({
      conversationId: `accept-${phrase}`,
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    expect(offer.conversation?.recommendationOfferStatus).toBe("AWAITING_CONSENT");
    const accepted = await runCarsConversationTurn({
      conversationId: `accept-${phrase}`,
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: phrase },
      ],
    });
    expect(accepted.kind).toBe("RECOMMENDATIONS");
    if (accepted.kind !== "RECOMMENDATIONS") return;
    expect(accepted.recommendations).toHaveLength(1);
    expect(accepted.recommendations[0]?.car.model).toMatch(/IONIQ 9/i);
    expect(accepted.message).not.toMatch(/görmek ister misin/iu);
    expect(accepted.message).not.toMatch(/kullanım bağlamınız duruyor/iu);
  });

  it.each(DECLINE)("closes the offer for decline: %s", async (phrase) => {
    const offer = await runCarsConversationTurn({
      conversationId: `decline-${phrase}`,
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    const declined = await runCarsConversationTurn({
      conversationId: `decline-${phrase}`,
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: phrase },
      ],
    });
    expect(declined.kind).toBe("QUESTION");
    expect(declined.conversation?.recommendationOfferStatus).toBe("DECLINED");
    expect(declined.message).not.toMatch(/görmek ister misin|önerim var/iu);
    expect(declined.message).not.toMatch(/Hyundai|IONIQ/i);
  });

  it("does not revive a declined offer with a later bare evet", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "no-revive",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    const declined = await runCarsConversationTurn({
      conversationId: "no-revive",
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "hayır, şimdilik görmek istemiyorum" },
      ],
    });
    const later = await runCarsConversationTurn({
      conversationId: "no-revive",
      conversation: declined.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "hayır, şimdilik görmek istemiyorum" },
        { id: "4", role: "assistant", content: declined.message },
        { id: "5", role: "user", content: "evet" },
      ],
    });
    expect(later.kind).not.toBe("RECOMMENDATIONS");
    expect(later.conversation?.recommendationOfferStatus).not.toBe("REVEALED");
    expect(later.message).not.toMatch(/Hyundai|IONIQ/i);
  });

  it("states the Clio named-alternative coverage block once", async () => {
    const first = await runCarsConversationTurn({
      conversationId: "clio-block",
      messages: [{ id: "1", role: "user", content: "Clio harici ne var söyle." }],
    });
    expect(first.conversation?.turnProvenance?.latestPrimaryAct).toBe("DIRECT_RECOMMENDATION_REQUEST");
    expect(first.conversation?.turnProvenance?.directRecommendationCoverage).toBe("DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE");
    expect(first.message).toMatch(/alternatif yok|uydurmak/iu);
    expect(first.message).not.toMatch(/evidence|runtime|schema|doğrulanmış karar/iu);
    const second = await runCarsConversationTurn({
      conversationId: "clio-block",
      conversation: first.conversation,
      messages: [
        { id: "1", role: "user", content: "Clio harici ne var söyle." },
        { id: "2", role: "assistant", content: first.message },
        { id: "3", role: "user", content: "Hadi, isim ver." },
      ],
    });
    expect(second.message).not.toBe(first.message);
    expect(second.message.length).toBeLessThan(first.message.length + 10);
    expect(second.conversation?.turnProvenance?.directRecommendationCoverage).toBe("DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE");
    expect(second.conversation?.turnProvenance?.latestPrimaryAct).toBe("DIRECT_RECOMMENDATION_REQUEST");
  });

  it("keeps 2M budget unevaluated while revealing a seats/cargo winner without claiming full fit", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "budget-safety",
      messages: [{ id: "1", role: "user", content: "Bütçem 2 milyon TL. En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    expect(offer.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "BUDGET_MAX_TRY", value: 2_000_000, evaluability: "UNDERSTOOD_NOT_EVALUABLE" }),
      expect.objectContaining({ key: "MIN_SEATS", value: 7 }),
      expect.objectContaining({ key: "MIN_CARGO_L", value: 300 }),
    ]));
    const accepted = await runCarsConversationTurn({
      conversationId: "budget-safety",
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "Bütçem 2 milyon TL. En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "tamam. görelim bakalım neymiş." },
      ],
    });
    expect(accepted.kind).toBe("RECOMMENDATIONS");
    if (accepted.kind !== "RECOMMENDATIONS") return;
    expect(accepted.message).toMatch(/koltuk|bagaj/iu);
    expect(accepted.message).not.toMatch(/tüm (?:şart|ihtiyac)|bütçenizi karşıl|bütçe.*karşılıyor|kullanım bağlamınız duruyor/iu);
    expect(accepted.conversation?.turnProvenance?.budgetEvaluated).toBe(false);
    expect(accepted.conversation?.turnProvenance?.unevaluatedBudgetPresent).toBe(true);
    expect(accepted.conversation?.turnProvenance?.heldDespiteUnevaluatedBudget).toBe(true);
    expect(accepted.decision?.governedReasons?.join(" ")).toMatch(/koltuk|bagaj/iu);
    expect(accepted.decision?.governedReasons?.join(" ")).not.toMatch(/bütçe/iu);
  });

  it("locks sen once the user uses sen", () => {
    expect(resolveConversationAddressForm([
      { id: "1", role: "user", content: "Nasılsın?" },
      { id: "2", role: "assistant", content: "İyiyim." },
      { id: "3", role: "user", content: "Ne yapabildiğini merak ettim." },
    ])).toBe("SEN");
    expect(resolveConversationAddressForm([
      { id: "1", role: "user", content: "Merhaba" },
      { id: "2", role: "assistant", content: "Merhaba! Hoş geldin." },
    ])).toBe("SEN");
  });

  it("flags the forbidden continuity phrase in naturalness quality", () => {
    const quality = evaluateCarsConversationQuality({
      messages: [{ id: "1", role: "user", content: "Neyse, arabaya dönelim." }],
      conversation: emptyConversationTrace(),
      assistantMessage: VAGUE_CONTINUITY,
    });
    expect(quality.roboticTemplateHits).toBeGreaterThan(0);
  });
});
