import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  parse: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({ responses: { parse: mocks.parse } }),
}));

import { planCarsConversationTurn } from "./planCarsConversationTurn";
import { emptyConversationTrace } from "./carsRequirementLedger";
import { interpretLatestUserAct } from "./carsSocialIntent";

const parsed = {
  latestMessage: {
    primaryAct: "VEHICLE_INTENT",
    interpretation: "Kullanıcı ciddi arazi istiyor.",
    callsForSocialResponseFirst: false,
    answersActiveQuestion: false,
  },
  proposedMemoryChanges: { newFacts: [], corrections: [], confirmedAnswers: [] },
  move: "ASK_ONE_QUESTION",
  question: { purpose: "USAGE_DETAIL", text: "Kamp yolu mu, ciddi arazi mi?", whyMaterialNow: "Kullanımı anlamak için." },
  readiness: { humanReady: false, reason: "Still discovering." },
  recommendationAction: "NONE",
  options: [{ id: "usage-camp", label: "Kamp ve stabilize yol", semanticValue: "CAMP" }],
  assistantMessage: "Arazi kullanımını netleştirelim: kamp yolu mı, ciddi arazi mi?",
};

describe("planCarsConversationTurn", () => {
  beforeEach(() => {
    mocks.parse.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("requests the configured gpt-5.5 model directly with store=false", async () => {
    mocks.parse.mockResolvedValue({ output_parsed: parsed });
    const result = await planCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "arazi aracı lazım" }],
      memory: emptyConversationTrace(),
      remainingUserTurns: 19,
      latestAct: interpretLatestUserAct([{ id: "1", role: "user", content: "arazi aracı lazım" }]),
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    });
    expect(result).toMatchObject({
      selectedModel: "gpt-5.5",
      requestedModel: "gpt-5.5",
      parseOutcome: "SUCCESS",
      fallbackUsed: false,
      plan: { move: "ASK_ONE_QUESTION", plannerModel: "gpt-5.5" },
    });
    expect(mocks.parse).toHaveBeenCalledTimes(1);
    expect(mocks.parse).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5.5",
      store: false,
      prompt_cache_key: "expiya-cars-natural-advisor-v1",
    }), expect.objectContaining({ timeout: 20_000 }));
    expect(mocks.parse.mock.calls.some((call) => call[0]?.model === "gpt-5.6")).toBe(false);
  });

  it("uses a configured secondary model only after a genuine primary failure", async () => {
    vi.stubEnv("OPENAI_CARS_CONVERSATION_FALLBACK_MODEL", "gpt-5.5-secondary");
    mocks.parse
      .mockRejectedValueOnce({ status: 503, error: { code: "unavailable" } })
      .mockResolvedValueOnce({ output_parsed: parsed });
    const result = await planCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "arazi aracı bakıyorum" }],
      memory: emptyConversationTrace(),
      remainingUserTurns: 19,
      latestAct: interpretLatestUserAct([{ id: "1", role: "user", content: "arazi aracı bakıyorum" }]),
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    });
    expect(result.fallbackUsed).toBe(true);
    expect(result.selectedModel).toBe("gpt-5.5-secondary");
    expect(mocks.parse).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: "gpt-5.5" }), expect.anything());
    expect(mocks.parse).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: "gpt-5.5-secondary" }), expect.anything());
    vi.unstubAllEnvs();
  });

  it("returns an unsuccessful parse outcome after API failure so memory is not wiped", async () => {
    mocks.parse.mockResolvedValue({ output_parsed: null, status: "failed" });
    await expect(planCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "araba istiyorum" }],
      memory: emptyConversationTrace(),
      remainingUserTurns: 19,
      latestAct: interpretLatestUserAct([{ id: "1", role: "user", content: "araba istiyorum" }]),
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    })).resolves.toMatchObject({ plan: undefined, parseOutcome: "EMPTY", requestedModel: "gpt-5.5" });
    expect(mocks.parse).toHaveBeenCalledTimes(1);
  });
});
