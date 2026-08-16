import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runCarsRuntime: vi.fn(),
  planCarsConversationTurn: vi.fn(),
}));

vi.mock("@/features/decision/runtime/runCarsRuntime", () => ({
  runCarsRuntime: mocks.runCarsRuntime,
}));

vi.mock("./planCarsConversationTurn", () => ({
  planCarsConversationTurn: mocks.planCarsConversationTurn,
}));

import { runCarsConversationTurn } from "./runCarsConversationTurn";
import { evaluateCarsConversationQuality } from "./evaluateCarsConversationQuality";
import { messageRevealsCandidateIdentity } from "./publicCarsDecision";

function planned(overrides: Record<string, unknown> = {}) {
  return {
    requestedModel: "gpt-5.5",
    selectedModel: "gpt-5.5",
    parseOutcome: "SUCCESS" as const,
    fallbackUsed: false,
    plan: {
      latestMessage: {
        primaryAct: "INFORMATION",
        interpretation: "anlam",
        callsForSocialResponseFirst: false,
        answersActiveQuestion: false,
      },
      proposedMemoryChanges: { newFacts: [], corrections: [], confirmedAnswers: [] },
      move: "ASK_ONE_QUESTION",
      question: { purpose: "PRIMARY_USAGE", text: "Aracı gününüzde asıl hangi iş için kullanacaksınız?", whyMaterialNow: "material" },
      readiness: { humanReady: false, reason: "not yet" },
      recommendationAction: "NONE",
      options: [],
      assistantMessage: "Aracı gününüzde asıl hangi iş için kullanacaksınız?",
      plannerModel: "gpt-5.5",
      requestedModel: "gpt-5.5",
      ...overrides,
    },
  };
}

function unavailable() {
  return { requestedModel: "gpt-5.5", parseOutcome: "UNAVAILABLE" as const, fallbackUsed: false };
}

describe("runCarsConversationTurn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.planCarsConversationTurn.mockResolvedValue(unavailable());
  });

  it("keeps a pure greeting social without requirements or evaluation", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(planned({
      latestMessage: { primaryAct: "GREETING", interpretation: "selam", callsForSocialResponseFirst: true, answersActiveQuestion: false },
      move: "SOCIAL_RESPONSE",
      question: null,
      assistantMessage: "Merhaba! Hoş geldiniz. Nasıl yardımcı olabilirim?",
    }));
    const response = await runCarsConversationTurn({
      conversationId: "hello",
      messages: [{ id: "1", role: "user", content: "Merhaba" }],
    });
    expect(response.message).toBe("Merhaba! Hoş geldiniz. Nasıl yardımcı olabilirim?");
    expect(response.kind).toBe("QUESTION");
    if (response.kind !== "QUESTION") return;
    expect(response.options).toBeUndefined();
    expect(response.conversation?.requirements).toEqual([]);
    expect(response.conversation?.vehicleIntentEstablished).toBe(false);
    expect(response.conversation?.advisorStage).toBe("SOCIAL_OPEN");
    expect(response.decision).toBeUndefined();
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
    expect(response.conversation?.turnProvenance).toMatchObject({
      userFacingOrigin: "MODEL", selectedModel: "gpt-5.5", requestedModel: "gpt-5.5",
      structuredPlan: true, deterministicOverride: false, parseOutcome: "SUCCESS",
    });
  });

  it("does not start discovery after repeated Merhaba :)", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "hello-repeat",
      messages: [
        { id: "1", role: "user", content: "Merhaba" },
        { id: "2", role: "assistant", content: "Merhaba! Hoş geldiniz. Nasıl yardımcı olabilirim?" },
        { id: "3", role: "user", content: "Merhaba :)" },
      ],
    });
    expect(response.message).toMatch(/merhaba|hoş geldiniz|yardımcı/iu);
    expect(response.message).not.toMatch(/hangi senaryo|kaç koltuk|daraltalım/iu);
    expect(response.conversation?.requirements).toEqual([]);
  });

  it("acknowledges greeting-plus-intent without attaching off-road quick replies", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(planned({
      latestMessage: { primaryAct: "VEHICLE_INTENT", interpretation: "aile", callsForSocialResponseFirst: true, answersActiveQuestion: false },
      move: "ASK_ONE_QUESTION",
      question: { purpose: "PRIMARY_USAGE", text: "Günlük hayatta bu araç sizin için asıl ne işi görecek?", whyMaterialNow: "family use" },
      assistantMessage: "Merhaba. Aile kullanımı öne çıkıyor. Günlük hayatta bu araç sizin için asıl ne işi görecek?",
      options: [
        { id: "usage-camp", label: "Kamp ve stabilize yol", semanticValue: "CAMP" },
        { id: "usage-rough", label: "Çamurlu/kötü yol", semanticValue: "ROUGH_ROAD" },
      ],
    }));
    const response = await runCarsConversationTurn({
      conversationId: "family-intent",
      messages: [{ id: "1", role: "user", content: "Merhaba, aile için araç bakıyorum" }],
    });
    expect(response.message).toMatch(/aile|günlük/iu);
    expect(response.message).not.toMatch(/hangi senaryo|daraltalım/iu);
    expect(response.kind).toBe("QUESTION");
    if (response.kind !== "QUESTION") return;
    expect(response.options).toBeUndefined();
    expect(response.conversation?.vehicleIntentEstablished).toBe(true);
  });

  it("asks before entering the governed runtime on a vague opener", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "araba almak istiyorum." }],
    });
    expect(response).toMatchObject({ kind: "QUESTION" });
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
    expect(response.conversation?.vehicleIntentEstablished).toBe(true);
  });

  it("routes first-turn off-road intent to usage detail without a budget question", async () => {
    const first = await runCarsConversationTurn({
      conversationId: "off-road-loop",
      messages: [{ id: "1", role: "user", content: "merhaba. arazi aracı var mı sizde?" }],
    });
    expect(first.message).toMatch(/arazi|kamp|stabilize/iu);
    expect(first.message).not.toMatch(/üst bütçe|vazgeçilmez/iu);
    expect(first.kind).toBe("QUESTION");
    if (first.kind !== "QUESTION") return;
    expect(first.options?.length).toBeGreaterThan(0);
    expect(first.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "USAGE_ROUGH_ROAD" }),
    ]));
  });

  it("explains a previous usage question on ne gibi without asking budget", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "usage-repair",
      messages: [
        { id: "1", role: "user", content: "arazi aracı var mı sizde" },
        { id: "2", role: "assistant", content: "Kamp ve stabilize yol mu, ciddi arazi mi?" },
        { id: "3", role: "user", content: "ne gibi?" },
      ],
    });
    expect(response.message).toMatch(/örneğin.*stabilize/iu);
    expect(response.message).not.toMatch(/üst bütçe/iu);
    expect(mocks.planCarsConversationTurn).not.toHaveBeenCalled();
  });

  it("keeps an off-topic request inside the Cars domain and preserves facts", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "off-topic",
      messages: [
        { id: "1", role: "user", content: "arazi aracı lazım" },
        { id: "2", role: "assistant", content: "Ciddi arazi mi?" },
        { id: "3", role: "user", content: "bugün hava nasıl?" },
      ],
    });
    expect(response.message).toMatch(/hava/iu);
    expect(response.message).not.toMatch(/kaç koltuk|kaç litre|daraltalım/iu);
    expect(response.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "USAGE_ROUGH_ROAD" }),
    ]));
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("does not let the model skip to catalog ranking without evaluable evidence", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(planned({
      move: "OFFER_RECOMMENDATION",
      recommendationAction: "OFFER_ONLY",
      readiness: { humanReady: true, reason: "model says ready" },
      question: null,
      assistantMessage: "Güçlü bir önerim var.",
    }));
    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{
        id: "1",
        role: "user",
        content: "Şehir için küçük otomatik araba, bütçem 1.5 milyon TL.",
      }],
    });
    expect(response.kind).toBe("QUESTION");
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
    expect(response.conversation?.recommendationOfferStatus ?? "NONE").not.toBe("REVEALED");
  });

  it("publishes a valid model realization without deterministic copy overriding it", async () => {
    const modelMessage = "3 milyon TL sınırınız net. Ciddi arazi ana kullanım olacaksa araç hafta içinde şehirde de çalışacak mı?";
    mocks.planCarsConversationTurn.mockResolvedValue(planned({
      move: "REFLECT_TRADEOFF",
      question: { purpose: "DAILY_VS_OFFROAD", text: "Araç hafta içinde şehirde de çalışacak mı?", whyMaterialNow: "tradeoff" },
      assistantMessage: modelMessage,
    }));
    const response = await runCarsConversationTurn({ conversationId: "model-natural", messages: [
      { id: "1", role: "user", content: "ciddi arazi aracı lazım" },
      { id: "2", role: "assistant", content: "Şehirde de kullanacak mısınız?" },
      { id: "3", role: "user", content: "3 milyon bütçem var" },
    ] });
    expect(response.message).toBe(modelMessage);
    expect(response.conversation?.turnProvenance).toMatchObject({
      userFacingOrigin: "MODEL", selectedModel: "gpt-5.5", requestedModel: "gpt-5.5",
      structuredPlan: true, deterministicOverride: false,
    });
  });

  it("retains unsupported equipment preference without an immediate evidence disclaimer", async () => {
    const response = await runCarsConversationTurn({ conversationId: "equipment-natural", messages: [
      { id: "1", role: "user", content: "ciddi arazi aracı lazım" },
      { id: "2", role: "assistant", content: "Şehirde de kullanacak mısınız?" },
      { id: "3", role: "user", content: "donanımı yüksek olsun" },
    ] });
    expect(response.conversation?.requirements).toContainEqual(expect.objectContaining({
      key: "EQUIPMENT_LEVEL", evaluability: "UNDERSTOOD_NOT_EVALUABLE",
    }));
    expect(response.message).toMatch(/donanım|sürüş destek|kabin konfor/iu);
    expect(response.message).not.toMatch(/doğrulanmış|sayısal eşik|değerlendirmeye geçebilirim/iu);
  });

  it("authorizes an immediate governed candidate as an offer without identity or card", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "immediate",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    expect(response.kind).toBe("QUESTION");
    if (response.kind !== "QUESTION") return;
    expect(messageRevealsCandidateIdentity(response.message)).toBe(false);
    expect(response.message).not.toMatch(/Hyundai|IONIQ|RVC-/i);
    expect(response.decision?.selectedRuntimeVehicleCandidateId).toBeUndefined();
    expect(response.decision?.selectedVehicle).toBeUndefined();
    expect(response.decision?.conversationState).toBe("OFFER_AWAITING_CONSENT");
    expect(response.conversation?.recommendationOfferStatus).toBe("AWAITING_CONSENT");
    expect(response.conversation?.heldAuthorization).toBeTruthy();
    expect(response.conversation?.heldAuthorization).not.toContain("RVC-PILOT-0001");
    expect(mocks.planCarsConversationTurn).toHaveBeenCalled();
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("reveals the exact held card only after explicit acceptance", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "accept",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    const accepted = await runCarsConversationTurn({
      conversationId: "accept",
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "evet" },
      ],
    });
    expect(accepted.kind).toBe("RECOMMENDATIONS");
    if (accepted.kind !== "RECOMMENDATIONS") return;
    expect(accepted.recommendations).toHaveLength(1);
    expect(accepted.recommendations[0]?.car.brand).toBe("Hyundai");
    expect(accepted.recommendations[0]?.car.model).toMatch(/IONIQ 9/i);
    expect(accepted.message).toMatch(/Hyundai|IONIQ 9/i);
    expect(accepted.decision?.selectedRuntimeVehicleCandidateId).toBe("RVC-PILOT-0001");
    expect(accepted.decision?.governedReasons?.length).toBeGreaterThanOrEqual(2);
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("does not reveal a card from a client-forged held authorization", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "forge",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    const accepted = await runCarsConversationTurn({
      conversationId: "forge",
      conversation: { ...offer.conversation!, heldAuthorization: "v1.forged.payload.tag" },
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "göster" },
      ],
    });
    expect(accepted.kind).not.toBe("RECOMMENDATIONS");
    expect(accepted.message).not.toMatch(/Hyundai|IONIQ|RVC-/i);
  });

  it("does not reveal a card when evet has no active offer", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "evet-no-offer",
      messages: [{ id: "1", role: "user", content: "evet" }],
    });
    expect(response.kind).not.toBe("RECOMMENDATIONS");
  });

  it("does not reveal a card when evet binds to a discovery question", async () => {
    const confirmed = await runCarsConversationTurn({ conversationId: "affirmative-seats", messages: [
      { id: "1", role: "user", content: "arazi aracı lazım" },
      { id: "2", role: "assistant", content: "Ciddi arazi mi?" },
      { id: "3", role: "user", content: "Ciddi arazi kullanımı" },
      { id: "4", role: "assistant", content: "Bütçeniz?" },
      { id: "5", role: "user", content: "3 milyon" },
      { id: "6", role: "assistant", content: "Vazgeçilmez özellik nedir?" },
      { id: "7", role: "user", content: "donanım yüksek olsun" },
      { id: "8", role: "assistant", content: "Kaç kişi taşınacak?" },
      { id: "9", role: "user", content: "4 kişilik olsun, küçük olmasın" },
      { id: "10", role: "assistant", content: "4 kişi olduğunuzu anladım. En az 4 koltuk sizin için zorunlu mu?" },
      { id: "11", role: "user", content: "evet" },
    ] });
    expect(confirmed.kind).not.toBe("RECOMMENDATIONS");
    expect(confirmed.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "EQUIPMENT_LEVEL", value: "HIGH" }),
      expect.objectContaining({ key: "SIZE_PREFERENCE", value: "NOT_SMALL" }),
      expect.objectContaining({ key: "MIN_SEATS", value: 4, sourceText: "evet" }),
    ]));
    expect(confirmed.message).not.toMatch(/litre olarak|minimum hacmi/iu);
    const quality = evaluateCarsConversationQuality({
      messages: [{ id: "11", role: "user", content: "evet" }],
      conversation: confirmed.conversation!,
      assistantMessage: confirmed.message,
      expectedKeys: ["USAGE_SERIOUS_OFF_ROAD", "BUDGET_MAX_TRY", "EQUIPMENT_LEVEL", "MIN_SEATS"],
      shortAnswerBound: true,
    });
    expect(quality.factRetention).toBe(true);
    expect(quality.shortAnswerBinding).toBe(true);
  });

  it("declines an offer without a card or pressure", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "decline",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    const declined = await runCarsConversationTurn({
      conversationId: "decline",
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "hayır" },
      ],
    });
    expect(declined.kind).toBe("QUESTION");
    expect(declined.message).not.toMatch(/emin misiniz|kesin görün|kaçırmayın/iu);
    expect(declined.message).not.toMatch(/Hyundai|IONIQ/i);
    expect(declined.conversation?.recommendationOfferStatus).toBe("DECLINED");
  });

  it("invalidates a held offer after a material correction", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "correct-offer",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    const corrected = await runCarsConversationTurn({
      conversationId: "correct-offer",
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "Hayır, 5 koltuk yeter." },
      ],
    });
    expect(corrected.kind).not.toBe("RECOMMENDATIONS");
    expect(corrected.conversation?.requirements).toContainEqual(expect.objectContaining({
      key: "MIN_SEATS", value: 5, previousValue: 7,
    }));
    expect(["INVALIDATED", "NONE", "AWAITING_CONSENT"]).toContain(corrected.conversation?.recommendationOfferStatus);
    if (corrected.conversation?.recommendationOfferStatus === "AWAITING_CONSENT") {
      expect(corrected.conversation.heldAuthorization).not.toBe(offer.conversation?.heldAuthorization);
    }
  });

  it("collects seats then cargo across turns into a governed offer, not an identity dump", async () => {
    const first = await runCarsConversationTurn({ conversationId: "evidence-journey", messages: [
      { id: "1", role: "user", content: "En az 7 koltuk istiyorum." },
    ] });
    expect(first.kind).not.toBe("ERROR");
    if (first.kind === "ERROR") return;
    expect(first.decision?.decisionStatus).not.toBe("DECISION_READY");
    const final = await runCarsConversationTurn({ conversationId: "evidence-journey", messages: [
      { id: "1", role: "user", content: "En az 7 koltuk istiyorum." },
      { id: "2", role: "assistant", content: first.message },
      { id: "3", role: "user", content: "Bagaj en az 300 litre olsun." },
    ] });
    expect(final.kind).toBe("QUESTION");
    if (final.kind !== "QUESTION") return;
    expect(final.decision?.conversationState).toBe("OFFER_AWAITING_CONSENT");
    expect(final.message).not.toMatch(/Hyundai|IONIQ/i);
  });

  it("exposes a structured final discriminator for multiple governed candidates", async () => {
    const response = await runCarsConversationTurn({ conversationId: "multiple", messages: [
      { id: "1", role: "user", content: "En az 5 koltuk ve en az 350 litre bagaj istiyorum." },
    ] });
    expect(response).toMatchObject({
      discriminatorChoices: [{ id: "MAX_CARGO", label: "Daha fazla bagaj alanı" }],
      conversation: { state: "FINAL_DISCRIMINATOR_REQUIRED", textInputAllowed: false, phase: "FINAL_TRADEOFF" },
    });
  });

  it("turns a structured final discriminator into a held offer rather than an immediate card", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "multiple",
      choiceId: "MAX_CARGO",
      messages: [
        { id: "1", role: "user", content: "En az 5 koltuk ve en az 350 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: "Ayırt edici seçeneği seçin." },
        { id: "3", role: "user", content: "Daha fazla bagaj alanı" },
      ],
    });
    expect(response.kind).toBe("QUESTION");
    if (response.kind !== "QUESTION") return;
    expect(response.decision?.conversationState).toBe("OFFER_AWAITING_CONSENT");
    expect(response.decision?.selectedRuntimeVehicleCandidateId).toBeUndefined();
    const accepted = await runCarsConversationTurn({
      conversationId: "multiple",
      conversation: response.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 5 koltuk ve en az 350 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: "Ayırt edici seçeneği seçin." },
        { id: "3", role: "user", content: "Daha fazla bagaj alanı" },
        { id: "4", role: "assistant", content: response.message },
        { id: "5", role: "user", content: "göster" },
      ],
    });
    expect(accepted.kind).toBe("RECOMMENDATIONS");
    if (accepted.kind !== "RECOMMENDATIONS") return;
    expect(accepted.decision?.selectedRuntimeVehicleCandidateId).toBe("RVC-PILOT-0009");
  });

  it("keeps party size non-atomic", async () => {
    const party = await runCarsConversationTurn({ conversationId: "party", messages: [
      { id: "1", role: "user", content: "5 kişiyiz, bagaj da önemli." },
    ] });
    expect(party.message).toMatch(/5.*koltuğun.*kesin şart/iu);
    expect(party.kind).not.toBe("ERROR");
    if (party.kind === "ERROR") return;
    expect(party.decision?.requirements ?? []).toHaveLength(0);
  });

  it("applies the latest explicit correction", async () => {
    const response = await runCarsConversationTurn({ conversationId: "correction", messages: [
      { id: "1", role: "user", content: "En az 7 koltuk istiyorum." },
      { id: "2", role: "assistant", content: "Bagaj beklentiniz?" },
      { id: "3", role: "user", content: "Hayır, 5 koltuk yeter." },
    ] });
    expect(response.kind).not.toBe("ERROR");
    if (response.kind === "ERROR") return;
    expect(response.conversation?.requirements).toContainEqual(expect.objectContaining({
      key: "MIN_SEATS", value: 5, previousValue: 7,
    }));
  });

  it("repairs pickup frustration without repeating a generic question", async () => {
    const response = await runCarsConversationTurn({ conversationId: "pickup-repair", messages: [
      { id: "1", role: "user", content: "arazi aracı bakıyorum" },
      { id: "2", role: "assistant", content: "Kamp ve stabilize yol mu?" },
      { id: "3", role: "user", content: "Kamp ve stabilize yol" },
      { id: "4", role: "assistant", content: "Yaklaşık üst bütçeniz nedir?" },
      { id: "5", role: "user", content: "2 milyon tl" },
      { id: "6", role: "assistant", content: "Sizin için vazgeçilmez özellik nedir?" },
      { id: "7", role: "user", content: "4x4 olmalı" },
      { id: "8", role: "assistant", content: "4x4 şartınızı kaydettim. En az kaç koltuk gerekli?" },
      { id: "9", role: "user", content: "pick up araç tercihim" },
      { id: "10", role: "assistant", content: "Pickup tercihinizi kaydettim." },
      { id: "11", role: "user", content: "pick up dedim ya. anlamdın mı?" },
    ] });
    expect(response.message).toMatch(/pickup/iu);
    expect(response.message).not.toMatch(/vazgeçilmez|günlük hayatınızdan/iu);
    expect(response.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "BUDGET_MAX_TRY", value: 2_000_000 }),
      expect.objectContaining({ key: "DRIVETRAIN", value: "AWD_OR_4X4" }),
      expect.objectContaining({ key: "BODY_TYPE", value: "PICKUP" }),
    ]));
  });

  it("falls back without wiping memory when the LLM fails", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "llm-failure",
      messages: [
        { id: "1", role: "user", content: "arazi aracı bakıyorum" },
        { id: "2", role: "assistant", content: "Kamp ve stabilize yol mu?" },
        { id: "3", role: "user", content: "Ciddi arazi kullanımı" },
      ],
    });
    expect(response.kind).toBe("QUESTION");
    expect(response.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "USAGE_SERIOUS_OFF_ROAD" }),
    ]));
    expect(response.message).not.toMatch(/vazgeçilmez özellik nedir/iu);
  });

  it("does not repeat prior recommendations when the user rejects them", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(planned({
      latestMessage: { primaryAct: "RECOMMENDATION_REJECTION", interpretation: "reject", callsForSocialResponseFirst: true, answersActiveQuestion: false },
      move: "EXPLORE_REJECTION",
      recommendationAction: "HANDLE_REJECTION",
      question: { purpose: "REJECTION_DIAGNOSTIC", text: "Bu araçlarda sizi asıl rahatsız eden nokta neydi?", whyMaterialNow: "reason unknown" },
      assistantMessage: "Bu araçlarda sizi asıl rahatsız eden nokta neydi?",
      options: [{ id: "price", label: "Fiyat", semanticValue: "PRICE" }],
    }));
    const response = await runCarsConversationTurn({
      conversationId: "reject",
      messages: [
        { id: "1", role: "user", content: "Şehir için araba istiyorum." },
        { id: "2", role: "assistant", content: "Bütçeniz?" },
        { id: "3", role: "user", content: "1.5 milyon TL." },
        { id: "4", role: "assistant", content: "En güçlü seçenekler bunlar.", recommendationIds: ["1", "2"] },
        { id: "5", role: "user", content: "Bu seçenekleri beğenmedim." },
      ],
    });
    expect(response.message).toMatch(/rahatsız/iu);
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
    expect(response.conversation?.rejectedRecommendationIds).toEqual(["1", "2"]);
    expect(response.kind).not.toBe("RECOMMENDATIONS");
  });

  it("walks the serious off-road journey without dropping evet or looping", async () => {
    const turns = [
      "arazi aracı lazım",
      "ciddi arazi kullanımı",
      "3 milyon",
      "donanımı yüksek olsun",
      "4 kişilik olsun, küçük olmasın",
      "evet",
    ];
    const messages: { id: string; role: "user" | "assistant"; content: string }[] = [];
    let last;
    for (const [index, content] of turns.entries()) {
      messages.push({ id: `u-${index}`, role: "user", content });
      last = await runCarsConversationTurn({ conversationId: "seq-offroad", messages });
      expect(last.message).not.toMatch(/vazgeçilmez|yanıtı tam kuramadım/iu);
      const previousAssistant = messages.filter((message) => message.role === "assistant").map((message) => message.content);
      expect(previousAssistant).not.toContain(last.message);
      messages.push({ id: `a-${index}`, role: "assistant", content: last.message });
    }
    expect(last?.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "USAGE_SERIOUS_OFF_ROAD" }),
      expect.objectContaining({ key: "BUDGET_MAX_TRY", value: 3_000_000 }),
      expect.objectContaining({ key: "EQUIPMENT_LEVEL", value: "HIGH" }),
      expect.objectContaining({ key: "MIN_SEATS", value: 4 }),
    ]));
    expect(last?.message).not.toMatch(/litre olarak belirt|minimum hacmi/iu);
    expect((last?.message.match(/\?/gu) ?? []).length).toBeLessThanOrEqual(1);
  });

  it("walks the camping/pickup journey with frustration repair and no generic loop", async () => {
    const turns = [
      "arazi aracı bakıyorum",
      "kamp ve stabilize yol",
      "2 milyon tl",
      "4x4 olmalı",
      "pickup araç tercihim",
      "pickup dedim ya, anlamadın mı?",
    ];
    const messages: { id: string; role: "user" | "assistant"; content: string }[] = [];
    let last;
    for (const [index, content] of turns.entries()) {
      messages.push({ id: `u-${index}`, role: "user", content });
      last = await runCarsConversationTurn({ conversationId: "seq-pickup", messages });
      expect(last.message).not.toMatch(/vazgeçilmez özellik nedir|günlük hayatınızdan bir örnek/iu);
      const previousAssistant = messages.filter((message) => message.role === "assistant").map((message) => message.content);
      expect(previousAssistant).not.toContain(last.message);
      messages.push({ id: `a-${index}`, role: "assistant", content: last.message });
    }
    expect(last?.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "USAGE_CAMP" }),
      expect.objectContaining({ key: "BUDGET_MAX_TRY", value: 2_000_000 }),
      expect.objectContaining({ key: "DRIVETRAIN", value: "AWD_OR_4X4" }),
      expect.objectContaining({ key: "BODY_TYPE", value: "PICKUP" }),
    ]));
    expect(last?.message).toMatch(/pickup/iu);
    expect(last?.conversation?.loopCount ?? 0).toBeLessThan(2);
  });

  it("binds a discovery option id from a button click", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "option-button",
      selectedOptionId: "usage-camp",
      messages: [
        { id: "1", role: "user", content: "arazi aracı bakıyorum" },
        {
          id: "2",
          role: "assistant",
          content: "Hangisine daha yakınsınız?",
          optionSet: {
            id: "opt-usage-detail",
            purpose: "USAGE_DETAIL",
            active: true,
            sourceAssistantTurn: 1,
            options: [
              { id: "usage-camp", label: "Kamp ve stabilize yol", semanticValue: "CAMP" },
              { id: "usage-serious", label: "Ciddi arazi kullanımı", semanticValue: "SERIOUS_OFF_ROAD" },
            ],
          },
        },
        { id: "3", role: "user", content: "Kamp ve stabilize yol" },
      ],
    });
    expect(response.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "USAGE_CAMP", value: "CAMP" }),
    ]));
    expect(response.conversation?.optionHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({ selectedOptionId: "usage-camp", selectionSource: "button" }),
    ]));
  });

  it("rejects a schema-valid socially invalid greeting plan and uses the greeting fallback", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(planned({
      latestMessage: { primaryAct: "GREETING", interpretation: "hi", callsForSocialResponseFirst: true, answersActiveQuestion: false },
      move: "ASK_ONE_QUESTION",
      question: { purpose: "PRIMARY_USAGE", text: "Aracı en çok hangi senaryoda kullanacaksınız?", whyMaterialNow: "start" },
      assistantMessage: "Merhaba! Size uygun aracı birlikte daraltalım. Aracı en çok hangi senaryoda kullanacaksınız?",
    }));
    const response = await runCarsConversationTurn({
      conversationId: "invalid-greeting",
      messages: [{ id: "1", role: "user", content: "Merhaba" }],
    });
    expect(response.message).toBe("Merhaba! Hoş geldiniz. Nasıl yardımcı olabilirim?");
    expect(response.conversation?.turnProvenance).toMatchObject({
      userFacingOrigin: "BOUNDED_FALLBACK",
      deterministicOverride: true,
      selectedModel: "gpt-5.5",
    });
  });

  it("asks a material body question after the family budget instead of stopping at acknowledgement", async () => {
    const first = await runCarsConversationTurn({ conversationId: "family-forward", messages: [
      { id: "u1", role: "user", content: "Dört kişilik aile için şehir içinde sıfır araç arıyorum. Bagajı küçük olmasın." },
    ] });
    const second = await runCarsConversationTurn({ conversationId: "family-forward", conversation: first.conversation, messages: [
      { id: "u1", role: "user", content: "Dört kişilik aile için şehir içinde sıfır araç arıyorum. Bagajı küçük olmasın." },
      { id: "a1", role: "assistant", content: first.message },
      { id: "u2", role: "user", content: "Bütçem en fazla 3 milyon." },
    ] });
    expect(second.message).toMatch(/SUV\/crossover mı, sedan mı, hatchback mi/iu);
    expect(second.kind).toBe("QUESTION");
    if (second.kind !== "QUESTION") throw new Error("EXPECTED_FAMILY_BODY_QUESTION");
    expect(second.options).toEqual(["SUV/crossover", "Sedan", "Hatchback"]);
    expect(second.conversation?.turnProvenance).toMatchObject({ questionMaterial: true, alreadyAnswered: false });
  });

  it("asks the material fuel question immediately after a body preference", async () => {
    const response = await runCarsConversationTurn({ conversationId: "body-then-fuel", messages: [
      { id: "u1", role: "user", content: "Sedan istiyorum" },
    ] });
    expect(response.message).toMatch(/Yakıt tarafında benzin, dizel, hibrit veya elektrik/iu);
    expect(response.kind).toBe("QUESTION");
    if (response.kind !== "QUESTION") throw new Error("EXPECTED_FUEL_QUESTION");
    expect(response.options).toEqual(["Benzin", "Dizel", "Hibrit", "Elektrik"]);
    expect(response.conversation?.lastAssistantQuestion?.purpose).toBe("FUEL");
    expect(response.conversation?.turnProvenance).toMatchObject({ questionMaterial: true, alreadyAnswered: false });
  });

  it("does not substitute power for an unavailable 0-100 requirement", async () => {
    const response = await runCarsConversationTurn({ conversationId: "acceleration-boundary", messages: [
      { id: "u1", role: "user", content: "10 milyonum var, 0-100 maksimum 3.5 saniye bir araba istiyorum" },
    ] });
    expect(response.message).toMatch(/doğrulanmış 0-100 süresi bulunmadığı/iu);
    expect(response.message).not.toMatch(/dört çeker elektrikli|yüksek performanslı benzinli/iu);
    expect(response.conversation?.turnProvenance).toMatchObject({ candidateHeld: false, advisorStage: "NOT_RECOMMENDABLE" });
  });

  it("starts full-catalog faceting for an explicit recommendation request with electric exclusion", async () => {
    const response = await runCarsConversationTurn({ conversationId: "megane-efficient", messages: [
      { id: "u1", role: "user", content: "Renault Megane aracımı değiştirip çok daha az yakan, elektrikli olmayan ve en az 300 litre bagajlı araç istiyorum; tavsiyen nedir?" },
    ] });
    expect(response.kind).toBe("QUESTION");
    if (response.kind !== "QUESTION") throw new Error("EXPECTED_CATALOG_FACET_QUESTION");
    expect(response.message).not.toMatch(/Birden fazla araç tüm zorunlu şartlarınızı karşılıyor/iu);
    expect(response.message).not.toMatch(/Please send a non-empty message/iu);
    expect(response.options?.length).toBeGreaterThan(1);
    expect(response.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "FUEL_EXCLUDED", value: "ELECTRIC" }),
      expect.objectContaining({ key: "MIN_CARGO_L", value: 300 }),
    ]));
    expect(response.conversation?.turnProvenance?.candidateCount).toBeGreaterThan(0);
    expect(response.conversation?.turnProvenance?.candidateCount).toBeLessThan(577);
  });

  it("reaches a sealed full-catalog variant and reveals its exact card only after consent", async () => {
    const conversationId = "catalog-facet-consent";
    const messages: Array<{ id: string; role: "user" | "assistant"; content: string }> = [
      { id: "u0", role: "user", content: "3 milyon TL altında elektrikli olmayan sıfır araç tavsiyen nedir?" },
    ];
    let conversation;
    let response = await runCarsConversationTurn({ conversationId, messages });
    for (let index = 0; index < 10 && response.conversation?.recommendationOfferStatus !== "AWAITING_CONSENT"; index += 1) {
      expect(response.kind).toBe("QUESTION");
      if (response.kind !== "QUESTION") break;
      const purpose = response.conversation?.lastAssistantQuestion?.purpose;
      const answer = response.options?.[0]
        ?? (purpose === "MIN_SEATS" || /koltuk/iu.test(response.message) ? "4 koltuk"
          : purpose === "MIN_CARGO" || /bagaj/iu.test(response.message) ? "300 litre"
            : purpose === "MIN_POWER_KW" || /güç/iu.test(response.message) ? "100 kW"
              : purpose === "MAX_CONSUMPTION_L_100KM" || /tüketim/iu.test(response.message) ? "8 L/100 km"
                : undefined);
      if (!answer) break;
      messages.push({ id: `a${index}`, role: "assistant", content: response.message });
      messages.push({ id: `u${index + 1}`, role: "user", content: answer });
      conversation = response.conversation;
      response = await runCarsConversationTurn({ conversationId, conversation, messages });
    }
    expect(response.conversation?.recommendationOfferStatus).toBe("AWAITING_CONSENT");
    expect(response.message).not.toMatch(/BMW|Renault|Toyota|Hyundai|Opel|Citroën/iu);
    messages.push({ id: "a-offer", role: "assistant", content: response.message });
    messages.push({ id: "u-consent", role: "user", content: "Göster" });
    const revealed = await runCarsConversationTurn({ conversationId, conversation: response.conversation, messages });
    expect(revealed.kind).toBe("RECOMMENDATIONS");
    if (revealed.kind !== "RECOMMENDATIONS") return;
    expect(revealed.recommendations).toHaveLength(1);
    expect(revealed.recommendations[0].car.id).toBe(revealed.conversation?.shownCandidate?.vehicleVariantId);
  });

  it("gives a clear next action after city use and asks one material budget question after automatic parking", async () => {
    const city = await runCarsConversationTurn({ conversationId: "compact-forward", messages: [
      { id: "u1", role: "user", content: "Şehir içinde işe gidip geleceğim." },
    ] });
    expect(city.message).toMatch(/Bir sonraki adım olarak/iu);
    const automatic = await runCarsConversationTurn({ conversationId: "compact-forward", conversation: city.conversation, messages: [
      { id: "u1", role: "user", content: "Şehir içinde işe gidip geleceğim." },
      { id: "a1", role: "assistant", content: city.message },
      { id: "u2", role: "user", content: "Otomatik olsun, park ederken zorlamasın." },
    ] });
    expect(automatic.message).toMatch(/bütçe tavanı nedir\?/iu);
    expect((automatic.message.match(/\?/gu) ?? [])).toHaveLength(1);
    expect(automatic.conversation?.turnProvenance).toMatchObject({ questionMaterial: true, alreadyAnswered: false });
  });

  it("completes compact discrimination after budget and reveals the sealed winner after consent", async () => {
    const users = [
      "İlk arabam olacak.",
      "Şehir içinde işe gidip geleceğim.",
      "Otomatik olsun, park ederken zorlamasın.",
      "Bütçem en fazla 2 milyon 150 bin TL.",
    ];
    let conversation;
    const messages: Array<{ id: string; role: "user" | "assistant"; content: string }> = [];
    let response;
    for (const [index, content] of users.entries()) {
      messages.push({ id: `u${index}`, role: "user", content });
      response = await runCarsConversationTurn({ conversationId: "compact-complete", messages, conversation });
      conversation = response.conversation;
      messages.push({ id: `a${index}`, role: "assistant", content: response.message });
    }
    expect(conversation?.answeredQuestionPurposes).toContain("SIZE");
    expect(response?.conversation?.turnProvenance).toMatchObject({
      discriminator: "COMPACT_FOOTPRINT_LENGTH_THEN_WIDTH",
      selectedDeterministicCandidate: "RVC-PILOT-0004",
      offerState: "AWAITING_CONSENT",
      cardState: "HIDDEN",
    });
    expect(response?.conversation?.turnProvenance?.candidateSetBeforePriceFilter).toBeDefined();
    expect(response?.conversation?.turnProvenance?.candidateSetAfterPriceFilter).toEqual(["RVC-PILOT-0006", "RVC-PILOT-0004"]);
    expect(response?.conversation?.turnProvenance?.candidateFilters).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "AUTOMATIC" }),
    ]));
    expect(response?.conversation?.recommendationOfferStatus).toBe("AWAITING_CONSENT");

    messages.push({ id: "u4", role: "user", content: "Tamam, göster." });
    const reveal = await runCarsConversationTurn({ conversationId: "compact-complete", messages, conversation });
    expect(reveal.kind).toBe("RECOMMENDATIONS");
    if (reveal.kind !== "RECOMMENDATIONS") throw new Error("EXPECTED_COMPACT_CARD");
    expect(reveal.recommendations).toHaveLength(1);
    expect(reveal.recommendations[0]?.car.model).toMatch(/Corsa/iu);
    expect(reveal.conversation?.turnProvenance).toMatchObject({
      selectedDeterministicCandidate: "RVC-PILOT-0004",
      offerState: "REVEALED",
      cardState: "REVEALED",
    });
  });

  it("ends safely when the turn limit is reached", async () => {
    const messages = Array.from({ length: 20 }, (_, index) => ({
      id: `user-${index}`,
      role: "user" as const,
      content: index === 0 ? "Araba almak istiyorum." : `Cevap ${index}`,
    }));
    const response = await runCarsConversationTurn({ conversationId: "limit", messages });
    expect(response).toMatchObject({ kind: "ERROR", message: expect.stringMatching(/tur sınır/iu) });
  });
});
