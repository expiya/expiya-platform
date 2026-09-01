import { describe, expect, it } from "vitest";
import { evaluateConversationPolicy } from "./conversationPolicy";
import { createV3ConversationState, runV3Turn } from "./engine.server";

describe("V3 conversation policy", () => {
  it("redirects unrelated requests to vehicles without mutating the decision", async () => {
    const output = await runV3Turn({ conversationId: "off-topic", messageId: "1", message: "Bana yemek tarifi verir misin?", expectedRevision: 0 });
    expect(output.message).toMatch(/araç seçimi ve otomotiv/iu);
    expect(output.state.ledger).toEqual([]);
    expect(output.state.ended).toBe(false);
  });
  it("sets a boundary once and terminates after repeated abuse", async () => {
    let output = await runV3Turn({ conversationId: "boundary", messageId: "1", message: "Aptal mısın?", expectedRevision: 0 });
    expect(output.state.ended).toBe(false);
    expect(output.state.boundaryViolationCount).toBe(1);
    output = await runV3Turn({ conversationId: "boundary", messageId: "2", message: "Salak, cevap ver", expectedRevision: output.state.revision, state: output.state });
    expect(output.state.ended).toBe(true);
  });
  it("honors an explicit request to end the conversation", async () => {
    const output = await runV3Turn({ conversationId: "end", messageId: "1", message: "Görüşmeyi bitir", expectedRevision: 0 });
    expect(output.state.ended).toBe(true);
  });
  it("keeps automotive messages in scope and recognizes a greeting", () => {
    expect(evaluateConversationPolicy("Merhaba, elektrikli araç almak istiyorum", 0)).toEqual({ kind: "CONTINUE", greeting: "Merhaba!" });
  });
  it("closes the twenty-turn conversation deterministically", async () => {
    const state = { ...createV3ConversationState("turn-limit"), revision: 20 };
    const output = await runV3Turn({ conversationId: "turn-limit", messageId: "21", message: "Bir araç daha soracağım", expectedRevision: 20, state });
    expect(output.state.ended).toBe(true);
    expect(output.message).toContain("20 mesajlık sınıra");
  });
});
