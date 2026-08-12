import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ parse: vi.fn() }));

vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({ responses: { parse: mocks.parse } }),
}));

import { createCarsConversationGuidance } from "./createCarsConversationGuidance";

describe("createCarsConversationGuidance", () => {
  beforeEach(() => mocks.parse.mockReset());

  it("returns a validated reflective follow-up", async () => {
    mocks.parse.mockResolvedValue({
      output_parsed: {
        action: "ASK",
        message: "Park kolaylığının önemli olduğunu anladım. Günlük mesafeniz yaklaşık ne kadar?",
        options: ["10 km altı", "10–30 km", "30 km üzeri"],
      },
    });

    await expect(createCarsConversationGuidance({
      messages: [{
        id: "1",
        role: "user",
        content: "Park etmek zor, küçük bir araç istiyorum.",
      }],
      locale: "tr",
      recommendationAllowed: false,
      remainingUserTurns: 9,
    })).resolves.toMatchObject({ action: "ASK" });

    const systemMessage = mocks.parse.mock.calls[0][0].input[0].content;
    expect(systemMessage).toContain("acknowledge the concrete meaning");
    expect(systemMessage).toContain("Do not repeat a question");
    expect(systemMessage).toContain("Stay strictly within");
  });

  it("fails closed for absent model output", async () => {
    mocks.parse.mockResolvedValue({ output_parsed: null });

    await expect(createCarsConversationGuidance({
      messages: [{ id: "1", role: "user", content: "Araba istiyorum." }],
      locale: "tr",
      recommendationAllowed: false,
      remainingUserTurns: 9,
    })).resolves.toBeUndefined();
  });
});
