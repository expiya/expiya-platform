import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runCarsRuntime: vi.fn(),
  createCarsConversationGuidance: vi.fn(),
}));

vi.mock("@/features/decision/runtime/runCarsRuntime", () => ({
  runCarsRuntime: mocks.runCarsRuntime,
}));

vi.mock("./createCarsConversationGuidance", () => ({
  createCarsConversationGuidance: mocks.createCarsConversationGuidance,
}));

import { runCarsConversationTurn } from "./runCarsConversationTurn";

const lineage = {
  requestId: "request-1",
  contextReference: "conversation-1:context",
  stoppedAt: "DOMAIN_SUFFICIENCY" as const,
  inspectedStages: ["CLASSIFICATION", "DOMAIN_SUFFICIENCY"] as const,
};

describe("runCarsConversationTurn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createCarsConversationGuidance.mockResolvedValue({
      action: "ASK",
      message: "Aracı nasıl kullanacağınızı biraz anlatır mısınız?",
      options: [],
    });
  });

  it("asks for a concrete decision factor before entering the governed runtime", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "araba almak istiyorum." }],
    });

    expect(response).toMatchObject({ kind: "QUESTION" });
    expect(response.message).toMatch(/kullan/iu);
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("keeps an off-topic request inside the Cars domain", async () => {
    mocks.createCarsConversationGuidance.mockResolvedValue({
      action: "REDIRECT",
      message: "Borsa tavsiyesi veremem; ama araç bütçenizin nakit akışına etkisini konuşabiliriz.",
      options: [],
    });

    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "Bana hisse senedi öner." }],
    });

    expect(response).toMatchObject({ kind: "QUESTION", message: expect.stringMatching(/araç.*bütçe/iu) });
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("does not allow the model to proceed before minimum conversation maturity", async () => {
    mocks.createCarsConversationGuidance.mockResolvedValue({
      action: "PROCEED", message: "Hazırım.", options: [],
    });

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

  it("does not repeat prior recommendations when the user rejects them", async () => {
    mocks.createCarsConversationGuidance.mockResolvedValue({
      action: "PROCEED",
      message: "Aynı sonuçları tekrarlamayayım. Bu araçlarda sizi rahatsız eden temel nokta neydi?",
      options: ["Fiyat", "Boyut", "Yakıt", "Tasarım"],
    });
    const messages = [
      { id: "1", role: "user" as const, content: "Şehir için araba istiyorum." },
      { id: "2", role: "assistant" as const, content: "Bütçeniz?" },
      { id: "3", role: "user" as const, content: "1.5 milyon TL." },
      {
        id: "4",
        role: "assistant" as const,
        content: "En güçlü seçenekler bunlar.",
        recommendationIds: ["1", "2", "3"],
      },
      { id: "5", role: "user" as const, content: "Bu seçenekleri beğenmedim." },
    ];

    const response = await runCarsConversationTurn({ conversationId: "conversation-1", messages });

    expect(response).toMatchObject({ kind: "QUESTION", message: expect.stringMatching(/rahatsız eden/iu) });
    expect(mocks.createCarsConversationGuidance).toHaveBeenCalledWith(expect.objectContaining({
      recommendationAllowed: false,
      hasPriorRecommendations: true,
      latestUserRejectedRecommendations: true,
    }));
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("asks for a budget in Turkish instead of recommending from usage alone", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{
        id: "1",
        role: "user",
        content: "İşe gidiş geliş için kullanacağım. Park yeri bulmak zor, küçük olsun.",
      }],
    });

    expect(response).toMatchObject({ kind: "QUESTION" });
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("does not repeat the usage question when the user says they do not know", async () => {
    mocks.createCarsConversationGuidance.mockResolvedValue({
      action: "ASK",
      message: "Sorun değil. Bunun yerine rahat edeceğiniz bütçeyi konuşalım.",
      options: ["1–1,5 milyon TL"],
    });
    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [
        { id: "1", role: "user", content: "Araba almak istiyorum." },
        {
          id: "2",
          role: "assistant",
          content: "Aracı en çok nasıl kullanacaksınız ve sizin için hangi özellik önemli?",
        },
        { id: "3", role: "user", content: "bilmiyorum" },
      ],
    });

    expect(response).toMatchObject({
      kind: "QUESTION",
      message: expect.stringMatching(/bütçe/iu),
      options: expect.arrayContaining(["1–1,5 milyon TL"]),
    });
    expect(response.message).not.toMatch(/nasıl kullanacaksınız/iu);
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("moves from an unknown budget to guided preference choices", async () => {
    mocks.createCarsConversationGuidance.mockResolvedValue({
      action: "ASK",
      message: "Sorun değil. Sizi rahatlatacak özelliği seçelim.",
      options: ["Parkı kolay küçük araç"],
    });
    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [
        { id: "1", role: "user", content: "Araba almak istiyorum." },
        { id: "2", role: "assistant", content: "Yaklaşık bütçeniz nedir?" },
        { id: "3", role: "user", content: "Bütçemi de bilmiyorum" },
      ],
    });

    expect(response).toMatchObject({
      kind: "QUESTION",
      message: expect.stringMatching(/özelliği seçelim/iu),
      options: expect.arrayContaining(["Parkı kolay küçük araç"]),
    });
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("re-runs the governed runtime with accumulated user answers", async () => {
    mocks.createCarsConversationGuidance
      .mockResolvedValueOnce({ action: "PROCEED", message: "Hazırım.", options: [] })
      .mockResolvedValueOnce({ action: "ASK", message: "Bir noktayı daha netleştirelim.", options: [] });
    mocks.runCarsRuntime.mockResolvedValue({
      status: "ADDITIONAL_CONTEXT_REQUIRED",
      reasons: [{
        code: "DOMAIN_SUFFICIENCY_INSUFFICIENT",
        stage: "DOMAIN_SUFFICIENCY",
        referenceIds: [],
      }],
      lineage,
    });

    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [
        { id: "1", role: "user", content: "Find me a family car." },
        { id: "2", role: "assistant", content: "What is your budget?" },
        { id: "3", role: "user", content: "My budget is 1.5 million TL." },
        { id: "4", role: "assistant", content: "What matters most?" },
        { id: "5", role: "user", content: "Low running costs matter most." },
      ],
    });

    expect(response.kind).toBe("QUESTION");
    expect(mocks.runCarsRuntime).toHaveBeenCalledWith(expect.objectContaining({
      contextReference: "conversation-1:context",
      query: expect.stringMatching(/family car[\s\S]*1\.5 million/),
    }));
  });

  it("returns recommendations only after governed runtime success", async () => {
    mocks.createCarsConversationGuidance.mockResolvedValue({
      action: "PROCEED", message: "Ready.", options: [],
    });
    const recommendations = [{ car: { id: "1" } }];
    mocks.runCarsRuntime.mockResolvedValue({
      status: "SUCCEEDED",
      recommendations,
      reasons: [],
      lineage: { ...lineage, stoppedAt: "AUTHORIZATION" },
    });

    await expect(runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [
        { id: "1", role: "user", content: "Compare Corolla and Civic." },
        { id: "2", role: "assistant", content: "What matters most?" },
        { id: "3", role: "user", content: "Running costs." },
      ],
    })).resolves.toMatchObject({
      kind: "RECOMMENDATIONS",
      recommendations,
    });
  });

  it("keeps successful assistant responses in the user's Turkish language", async () => {
    mocks.createCarsConversationGuidance.mockResolvedValue({
      action: "PROCEED", message: "Hazırım.", options: [],
    });
    mocks.runCarsRuntime.mockResolvedValue({
      status: "SUCCEEDED",
      recommendations: [{ car: { id: "1" } }],
      reasons: [],
      lineage: { ...lineage, stoppedAt: "AUTHORIZATION" },
    });

    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [
        { id: "1", role: "user", content: "Şehir içinde kullanacağım." },
        { id: "2", role: "assistant", content: "Bütçeniz nedir?" },
        { id: "3", role: "user", content: "Bütçem 1.4 milyon TL." },
        { id: "4", role: "assistant", content: "En önemli konu nedir?" },
        { id: "5", role: "user", content: "Park kolaylığı." },
      ],
    });

    expect(response).toMatchObject({
      kind: "RECOMMENDATIONS",
      message: expect.stringMatching(/konuştuklarımıza/iu),
    });
  });

  it("converts runtime failures to a user-facing error without leaking codes", async () => {
    mocks.createCarsConversationGuidance.mockResolvedValue({
      action: "PROCEED", message: "Ready.", options: [],
    });
    mocks.runCarsRuntime.mockResolvedValue({
      status: "FAILED",
      reasons: [{ code: "CLASSIFICATION_FAILED", stage: "CLASSIFICATION", referenceIds: [] }],
      lineage: { ...lineage, stoppedAt: "CLASSIFICATION" },
    });

    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [
        { id: "1", role: "user", content: "Find a compact city car." },
        { id: "2", role: "assistant", content: "Budget?" },
        { id: "3", role: "user", content: "Under 1.5 million TL." },
        { id: "4", role: "assistant", content: "Priority?" },
        { id: "5", role: "user", content: "Easy parking." },
      ],
    });

    expect(response).toMatchObject({ kind: "ERROR" });
    expect(response.message).not.toContain("CLASSIFICATION_FAILED");
  });

  it("ends safely when the turn limit is reached without runtime sufficiency", async () => {
    mocks.createCarsConversationGuidance.mockResolvedValue({
      action: "ASK", message: "Bir soru daha.", options: [],
    });
    mocks.runCarsRuntime.mockResolvedValue({
      status: "ADDITIONAL_CONTEXT_REQUIRED",
      reasons: [{ code: "DOMAIN_SUFFICIENCY_INSUFFICIENT", stage: "DOMAIN_SUFFICIENCY", referenceIds: [] }],
      lineage,
    });
    const messages = Array.from({ length: 20 }, (_, index) => ({
      id: `user-${index}`,
      role: "user" as const,
      content: index === 0 ? "Araba almak istiyorum." : `Cevap ${index}`,
    }));

    const response = await runCarsConversationTurn({ conversationId: "conversation-1", messages });

    expect(response).toMatchObject({ kind: "ERROR", message: expect.stringMatching(/tur sınır/iu) });
  });

  it("keeps the conversation open through the nineteenth user message", async () => {
    const messages = Array.from({ length: 19 }, (_, index) => ({
      id: `user-${index}`,
      role: "user" as const,
      content: index === 0 ? "Araba almak istiyorum." : `Cevap ${index}`,
    }));

    const response = await runCarsConversationTurn({ conversationId: "conversation-1", messages });

    expect(response).toMatchObject({ kind: "QUESTION" });
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
    expect(mocks.createCarsConversationGuidance).toHaveBeenCalledWith(
      expect.objectContaining({ remainingUserTurns: 1 }),
    );
  });

  it("collects supported material requirements across turns and returns the grounded unique decision", async () => {
    const first = await runCarsConversationTurn({ conversationId: "evidence-journey", messages: [
      { id: "1", role: "user", content: "En az 7 koltuk istiyorum." },
    ] });
    expect(first).toMatchObject({ kind: "QUESTION", decision: { decisionStatus: "NEEDS_MORE_USER_CONTEXT", evidenceBacked: false } });
    expect(first.message).toMatch(/bagaj/iu);

    const final = await runCarsConversationTurn({ conversationId: "evidence-journey", messages: [
      { id: "1", role: "user", content: "En az 7 koltuk istiyorum." },
      { id: "2", role: "assistant", content: first.message },
      { id: "3", role: "user", content: "Bagaj en az 300 litre olsun." },
    ] });
    expect(final).toMatchObject({ kind: "QUESTION", decision: {
      conversationState: "DECISION_READY", decisionStatus: "DECISION_READY", evidenceBacked: true,
      selectedRuntimeVehicleCandidateId: "RVC-PILOT-0001", selectedVehicle: { brand: "Hyundai", model: "IONIQ 9" },
    } });
    expect(final.message).toMatch(/7 koltuk.*338 L bagaj/iu);
    expect(final.message).not.toMatch(/güvenli|ekonomik|konforlu|aileler için ideal/iu);
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("does not use legacy ranking when multiple governed candidates remain", async () => {
    const response = await runCarsConversationTurn({ conversationId: "multiple", messages: [
      { id: "1", role: "user", content: "En az 5 koltuk ve en az 350 litre bagaj istiyorum." },
    ] });
    expect(response).toMatchObject({ kind: "QUESTION", decision: { decisionStatus: "NEEDS_MORE_USER_CONTEXT", evidenceBacked: false } });
    expect(response.message).toMatch(/birden fazla|ayırt edici/iu);
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("keeps party size non-atomic and asks for a numeric cargo threshold", async () => {
    const party = await runCarsConversationTurn({ conversationId: "party", messages: [
      { id: "1", role: "user", content: "5 kişiyiz, bagaj da önemli." },
    ] });
    expect(party.kind).not.toBe("ERROR");
    if (party.kind === "ERROR") return;
    expect(party.message).toMatch(/5 koltuk.*zorunlu/iu);
    expect(party.decision?.requirements).toHaveLength(0);

    const cargo = await runCarsConversationTurn({ conversationId: "cargo", messages: [
      { id: "1", role: "user", content: "Bagaj önemli." },
    ] });
    expect(cargo.message).toMatch(/minimum.*hacim|litre/iu);
  });

  it("does not select unknown candidates for an eight-seat requirement", async () => {
    const response = await runCarsConversationTurn({ conversationId: "none", messages: [
      { id: "1", role: "user", content: "8 koltuk lazım." },
    ] });
    expect(response).toMatchObject({ decision: { decisionStatus: "INSUFFICIENT_VEHICLE_EVIDENCE", evidenceBacked: false } });
    expect(response.message).toMatch(/doğrulanmış.*yeterli değil/iu);
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("applies the latest explicit correction", async () => {
    const response = await runCarsConversationTurn({ conversationId: "correction", messages: [
      { id: "1", role: "user", content: "En az 7 koltuk istiyorum." },
      { id: "2", role: "assistant", content: "Bagaj beklentiniz?" },
      { id: "3", role: "user", content: "Hayır, 5 koltuk yeter." },
    ] });
    expect(response.kind).not.toBe("ERROR");
    if (response.kind === "ERROR") return;
    expect(response.decision?.requirements).toEqual([expect.objectContaining({ factKey: "seats", value: 5 })]);
  });
});
