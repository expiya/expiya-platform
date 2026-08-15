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

function plan(overrides: Record<string, unknown> = {}) {
  return {
    latestMessageInterpretation: "anlam",
    replyKind: "NEW_FACTS",
    bindsToActiveQuestion: false,
    selectedOptionId: null,
    newFacts: [], corrections: [], confirmedAnswers: [], rejectedAssumptions: [],
    answeredQuestionPurpose: "NONE", stillOpenQuestionPurposes: [],
    conversationMove: "ACKNOWLEDGE_AND_EXPLORE",
    nextQuestionPurpose: "PRIMARY_USAGE", whyThisQuestionNow: "material",
    decisionReadiness: { ready: false, reason: "not yet" }, unsupportedButUnderstood: [],
    options: [],
    assistantMessage: "Aracı gününüzde asıl hangi iş için kullanacaksınız?",
    plannerModel: "gpt-5.6",
    ...overrides,
  };
}

describe("runCarsConversationTurn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.planCarsConversationTurn.mockResolvedValue(undefined);
  });

  it("asks before entering the governed runtime on a vague opener", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "araba almak istiyorum." }],
    });
    expect(response).toMatchObject({ kind: "QUESTION" });
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("routes first-turn off-road intent to usage detail without a budget question", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(undefined);
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
    expect(response.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "USAGE_ROUGH_ROAD" }),
    ]));
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("does not let the model skip to catalog ranking without evaluable evidence", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(plan({ conversationMove: "PROCEED_TO_EVALUATION", decisionReadiness: { ready: true, reason: "model says ready" } }));
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
  });

  it("publishes a valid model realization without deterministic copy overriding it", async () => {
    const modelMessage = "3 milyon TL sınırınız net. Ciddi arazi ana kullanım olacaksa araç hafta içinde şehirde de çalışacak mı?";
    mocks.planCarsConversationTurn.mockResolvedValue(plan({
      conversationMove: "REFLECT_TRADEOFF",
      nextQuestionPurpose: "DAILY_VS_OFFROAD",
      assistantMessage: modelMessage,
    }));
    const response = await runCarsConversationTurn({ conversationId: "model-natural", messages: [
      { id: "1", role: "user", content: "ciddi arazi aracı lazım" },
      { id: "2", role: "assistant", content: "Şehirde de kullanacak mısınız?" },
      { id: "3", role: "user", content: "3 milyon bütçem var" },
    ] });
    expect(response.message).toBe(modelMessage);
    expect(response.conversation?.turnProvenance).toMatchObject({
      userFacingOrigin: "MODEL", selectedModel: "gpt-5.6", structuredPlan: true, deterministicOverride: false,
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

  it("evaluates a sufficient first message without extra lifestyle questions", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "immediate",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    expect(response).toMatchObject({
      kind: "QUESTION",
      decision: {
        conversationState: "DECISION_READY",
        selectedRuntimeVehicleCandidateId: "RVC-PILOT-0001",
        selectedVehicle: { brand: "Hyundai", model: "IONIQ 9" },
      },
    });
    expect(mocks.planCarsConversationTurn).not.toHaveBeenCalled();
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("collects seats then cargo across turns into a grounded unique decision", async () => {
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
    expect(final).toMatchObject({ decision: {
      conversationState: "DECISION_READY",
      selectedRuntimeVehicleCandidateId: "RVC-PILOT-0001",
    } });
    expect(final.message).toMatch(/7 koltuk.*338 L bagaj/iu);
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

  it("turns a structured final discriminator into a grounded decision", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "multiple",
      choiceId: "MAX_CARGO",
      messages: [
        { id: "1", role: "user", content: "En az 5 koltuk ve en az 350 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: "Ayırt edici seçeneği seçin." },
        { id: "3", role: "user", content: "Daha fazla bagaj alanı" },
      ],
    });
    expect(response).toMatchObject({ decision: {
      conversationState: "DECISION_READY",
      selectedRuntimeVehicleCandidateId: "RVC-PILOT-0002",
    } });
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

  it("binds evet to the prior seats confirmation and retains earlier facts", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(undefined);
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
    expect(confirmed.message).toMatch(/4 kişilik kullanım.*bagajda.*ne taşı/iu);
    expect(confirmed.message).not.toMatch(/vazgeçilmez|günlük hayatınızdan/iu);
    expect(confirmed.conversation?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "EQUIPMENT_LEVEL", value: "HIGH" }),
      expect.objectContaining({ key: "SIZE_PREFERENCE", value: "NOT_SMALL" }),
      expect.objectContaining({ key: "MIN_SEATS", value: 4, sourceText: "evet" }),
    ]));
    const quality = evaluateCarsConversationQuality({
      messages: [{ id: "11", role: "user", content: "evet" }],
      conversation: confirmed.conversation!,
      assistantMessage: confirmed.message,
      expectedKeys: ["USAGE_SERIOUS_OFF_ROAD", "BUDGET_MAX_TRY", "EQUIPMENT_LEVEL", "MIN_SEATS"],
      shortAnswerBound: true,
    });
    expect(quality.factRetention).toBe(true);
    expect(quality.shortAnswerBinding).toBe(true);
    expect(quality.roboticTemplateHits).toBe(0);
  });

  it("repairs pickup frustration without repeating a generic question", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(undefined);
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
    mocks.planCarsConversationTurn.mockResolvedValue(undefined);
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
    mocks.planCarsConversationTurn.mockResolvedValue(plan({
      replyKind: "RECOMMENDATION_REJECTION",
      conversationMove: "ACKNOWLEDGE_AND_CLARIFY",
      nextQuestionPurpose: "REJECTION_DIAGNOSTIC",
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
  });

  it("walks the serious off-road journey without dropping evet or looping", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(undefined);
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
    expect(last?.message).toMatch(/4 kişilik kullanım.*bagaj/iu);
  });

  it("walks the camping/pickup journey with frustration repair and no generic loop", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(undefined);
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

  it("ends safely when the turn limit is reached", async () => {
    mocks.planCarsConversationTurn.mockResolvedValue(undefined);
    const messages = Array.from({ length: 20 }, (_, index) => ({
      id: `user-${index}`,
      role: "user" as const,
      content: index === 0 ? "Araba almak istiyorum." : `Cevap ${index}`,
    }));
    const response = await runCarsConversationTurn({ conversationId: "limit", messages });
    expect(response).toMatchObject({ kind: "ERROR", message: expect.stringMatching(/tur sınır/iu) });
  });
});
