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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: "", messages: [] }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.runCarsConversationTurn).not.toHaveBeenCalled();
  });

  it("accepts and forwards a structured discriminator choice", async () => {
    mocks.runCarsConversationTurn.mockResolvedValue({ kind: "QUESTION", message: "Decision ready." });
    const body = {
      conversationId: "conversation-1",
      choiceId: "MAX_CARGO",
      messages: [
        { id: "message-1", role: "assistant", content: "Seçin", discriminatorChoices: [{ id: "MAX_CARGO", label: "Daha fazla bagaj alanı" }] },
        { id: "message-2", role: "user", content: "Daha fazla bagaj alanı" },
      ],
    };
    const response = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    expect(response.status).toBe(200);
    expect(mocks.runCarsConversationTurn).toHaveBeenCalledWith(body);
  });

  it("rejects free text while a structured discriminator is active", async () => {
    const response = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        conversationId: "conversation-locked",
        messages: [
          { id: "1", role: "assistant", content: "Seçin", discriminatorChoices: [{ id: "MAX_CARGO", label: "Daha fazla bagaj alanı" }] },
          { id: "2", role: "user", content: "Serbest metin" },
        ],
      }),
    }));
    expect(response.status).toBe(409);
    expect(mocks.runCarsConversationTurn).not.toHaveBeenCalled();
  });

  it("rejects a choice id outside the current structured state", async () => {
    const response = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        conversationId: "conversation-unlocked", choiceId: "MAX_CARGO",
        messages: [{ id: "1", role: "user", content: "Bagaj" }],
      }),
    }));
    expect(response.status).toBe(409);
    expect(mocks.runCarsConversationTurn).not.toHaveBeenCalled();
  });
});
