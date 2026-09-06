import { describe, expect, it } from "vitest";
import { salesConversationGuidance, salesConversationPhase } from "./salesConversation";

describe("sales conversation phase policy", () => {
  it("allows three conversation turns, uses two intent-nurture turns, then ends", () => {
    expect([1, 2, 3].map((turn) => salesConversationPhase({ turn, vehicleIntentEstablished: false }))).toEqual(["OPEN_CONVERSATION", "OPEN_CONVERSATION", "OPEN_CONVERSATION"]);
    expect(salesConversationPhase({ turn: 4, vehicleIntentEstablished: false })).toBe("INTENT_NURTURE_1");
    expect(salesConversationPhase({ turn: 5, vehicleIntentEstablished: false })).toBe("INTENT_NURTURE_2");
    expect(salesConversationPhase({ turn: 6, vehicleIntentEstablished: false })).toBe("END_WITHOUT_PURCHASE_INTENT");
  });

  it("never applies the turn budget after purchase intent is established", () => {
    expect(salesConversationPhase({ turn: 99, vehicleIntentEstablished: true })).toBe("PURCHASE_INTENT_ESTABLISHED");
    expect(salesConversationGuidance("PURCHASE_INTENT_ESTABLISHED")).toBeUndefined();
  });
});
