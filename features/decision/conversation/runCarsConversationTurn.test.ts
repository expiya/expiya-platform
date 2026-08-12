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

  it("converts runtime failures to a user-facing error without leaking codes", async () => {
    mocks.runCarsRuntime.mockResolvedValue({
      status: "FAILED",
      reasons: [{ code: "CLASSIFICATION_FAILED", stage: "CLASSIFICATION", referenceIds: [] }],
      lineage: { ...lineage, stoppedAt: "CLASSIFICATION" },
    });

    const response = await runCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "Find a car." }],
    });

    expect(response).toMatchObject({ kind: "ERROR" });
    expect(response.message).not.toContain("CLASSIFICATION_FAILED");
  });
});
