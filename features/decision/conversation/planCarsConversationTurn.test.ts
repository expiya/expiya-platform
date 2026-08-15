import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  parse: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({ responses: { parse: mocks.parse } }),
}));

import { planCarsConversationTurn } from "./planCarsConversationTurn";
import { emptyConversationTrace } from "./carsRequirementLedger";

describe("planCarsConversationTurn", () => {
  beforeEach(() => {
    mocks.parse.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("uses Responses API structured output with a privacy-preserving store=false call", async () => {
    mocks.parse.mockResolvedValue({
      output_parsed: {
        latestUserMeaning: "Kullanıcı ciddi arazi istiyor.",
        replyKind: "NEW_FACTS",
        bindsToActiveQuestion: false,
        selectedOptionId: null,
        facts: [],
        readyToEvaluate: false,
        readyToEvaluateReason: "Seats and cargo are missing.",
        nextAction: "ASK",
        questionPurpose: "USAGE_DETAIL",
        options: [{ id: "usage-camp", label: "Kamp ve stabilize yol", semanticValue: "CAMP" }],
        assistantMessage: "Arazi kullanımını netleştirelim: kamp yolu mı, ciddi arazi mi?",
      },
    });

    await expect(planCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "arazi aracı lazım" }],
      memory: emptyConversationTrace(),
      remainingUserTurns: 19,
    })).resolves.toMatchObject({ nextAction: "ASK", questionPurpose: "USAGE_DETAIL" });

    expect(mocks.parse).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5.6",
      store: false,
      reasoning: { effort: "low" },
      prompt_cache_key: "expiya-cars-conversation-turn-v1",
    }), expect.objectContaining({ timeout: 20_000 }));
  });

  it("falls through to gpt-5.5 when the first parse is empty", async () => {
    mocks.parse
      .mockResolvedValueOnce({ output_parsed: null, status: "incomplete", incomplete_details: { reason: "max_output_tokens" } })
      .mockResolvedValueOnce({
        output_parsed: {
          latestUserMeaning: "Kullanıcı arazi arıyor.",
          replyKind: "NEW_FACTS",
          bindsToActiveQuestion: false,
          selectedOptionId: null,
          facts: [],
          readyToEvaluate: false,
          readyToEvaluateReason: "Seats missing.",
          nextAction: "ASK",
          questionPurpose: "USAGE_DETAIL",
          options: [],
          assistantMessage: "Arazi kullanımını netleştirelim.",
        },
      });

    await expect(planCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "arazi aracı bakıyorum" }],
      memory: emptyConversationTrace(),
      remainingUserTurns: 19,
    })).resolves.toMatchObject({ assistantMessage: "Arazi kullanımını netleştirelim." });

    expect(mocks.parse).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: "gpt-5.5" }), expect.anything());
  });

  it("returns undefined after a schema or API failure so memory is not wiped", async () => {
    mocks.parse.mockResolvedValue({ output_parsed: null, status: "failed" });
    await expect(planCarsConversationTurn({
      conversationId: "conversation-1",
      messages: [{ id: "1", role: "user", content: "araba istiyorum" }],
      memory: emptyConversationTrace(),
      remainingUserTurns: 19,
    })).resolves.toBeUndefined();
    expect(mocks.parse).toHaveBeenCalledTimes(2);
  });
});
