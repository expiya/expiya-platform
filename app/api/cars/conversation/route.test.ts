import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runCarsConversationTurn: vi.fn() }));

vi.mock("@/features/decision/conversation/runCarsConversationTurn", () => ({
  runCarsConversationTurn: mocks.runCarsConversationTurn,
}));

import { POST } from "./route";

describe("POST /api/cars/conversation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes the stable conversation and complete message history to the governed boundary", async () => {
    mocks.runCarsConversationTurn.mockResolvedValue({
      kind: "QUESTION",
      message: "What is your budget?",
    });
    const body = {
      conversationId: "conversation-1",
      messages: [
        { id: "message-1", role: "user", content: "Find a family car." },
        { id: "message-2", role: "assistant", content: "How will you use it?" },
        { id: "message-3", role: "user", content: "Mostly in the city." },
      ],
    };

    const response = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      kind: "QUESTION",
      message: "What is your budget?",
    });
    expect(mocks.runCarsConversationTurn).toHaveBeenCalledWith(body);
  });

  it("rejects malformed input before the governed boundary", async () => {
    const response = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST",
      body: JSON.stringify({ conversationId: "", messages: [] }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.runCarsConversationTurn).not.toHaveBeenCalled();
  });
});
