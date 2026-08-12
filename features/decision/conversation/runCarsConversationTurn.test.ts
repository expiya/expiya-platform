import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runCarsRuntime: vi.fn() }));

vi.mock("@/features/decision/runtime/runCarsRuntime", () => ({
  runCarsRuntime: mocks.runCarsRuntime,
}));

import { runCarsConversationTurn } from "./runCarsConversationTurn";

const lineage = {
  requestId: "request-1",
  contextReference: "conversation-1:context",
  stoppedAt: "DOMAIN_SUFFICIENCY" as const,
  inspectedStages: ["CLASSIFICATION", "DOMAIN_SUFFICIENCY"] as const,
};

describe("runCarsConversationTurn", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks for a concrete decision factor before entering the governed runtime", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "araba almak istiyorum." }],
    });

    expect(response).toMatchObject({ kind: "QUESTION" });
    expect(response.message).toMatch(/bütçe|kullan/iu);
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

    expect(response).toMatchObject({
      kind: "QUESTION",
      message: expect.stringMatching(/bütçe|fiyat/iu),
    });
    expect(mocks.runCarsRuntime).not.toHaveBeenCalled();
  });

  it("does not repeat the usage question when the user says they do not know", async () => {
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
      ],
    });

    expect(response.kind).toBe("QUESTION");
    expect(mocks.runCarsRuntime).toHaveBeenCalledWith(expect.objectContaining({
      contextReference: "conversation-1:context",
      query: expect.stringMatching(/family car[\s\S]*1\.5 million/),
    }));
  });

  it("returns recommendations only after governed runtime success", async () => {
    const recommendations = [{ car: { id: "1" } }];
    mocks.runCarsRuntime.mockResolvedValue({
      status: "SUCCEEDED",
      recommendations,
      reasons: [],
      lineage: { ...lineage, stoppedAt: "AUTHORIZATION" },
    });

    await expect(runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "Compare Corolla and Civic." }],
    })).resolves.toMatchObject({
      kind: "RECOMMENDATIONS",
      recommendations,
    });
  });

  it("keeps successful assistant responses in the user's Turkish language", async () => {
    mocks.runCarsRuntime.mockResolvedValue({
      status: "SUCCEEDED",
      recommendations: [{ car: { id: "1" } }],
      reasons: [],
      lineage: { ...lineage, stoppedAt: "AUTHORIZATION" },
    });

    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{
        id: "1",
        role: "user",
        content: "Şehir içinde kullanacağım, bütçem 1.4 milyon TL.",
      }],
    });

    expect(response).toMatchObject({
      kind: "RECOMMENDATIONS",
      message: expect.stringMatching(/bilgilere göre/iu),
    });
  });

  it("converts runtime failures to a user-facing error without leaking codes", async () => {
    mocks.runCarsRuntime.mockResolvedValue({
      status: "FAILED",
      reasons: [{ code: "CLASSIFICATION_FAILED", stage: "CLASSIFICATION", referenceIds: [] }],
      lineage: { ...lineage, stoppedAt: "CLASSIFICATION" },
    });

    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{
        id: "1",
        role: "user",
        content: "Find a compact city car under 1.5 million TL.",
      }],
    });

    expect(response).toMatchObject({ kind: "ERROR" });
    expect(response.message).not.toContain("CLASSIFICATION_FAILED");
  });
});
