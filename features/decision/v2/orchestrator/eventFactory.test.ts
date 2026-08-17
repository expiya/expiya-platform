import { describe, expect, it } from "vitest";
import { createConversationEventsFromInterpretation } from "./eventFactory";

const turn = { conversationId: "conversation", messageId: "message", idempotencyKey: "key", expectedConversationRevision: 0, userMessage: "Sedan dedim", requestTime: "2026-08-19T00:00:00.000Z" } as const;

describe("deterministic interpretation event factory", () => {
  it("creates stable IDs/order and preserves abuse plus correction", () => {
    const interpretation = { authorityBoundary: "AUTHORITATIVE_SEMANTIC_PLAN", result: { acts: ["ABUSE", "CORRECTION"], modelReferences: [], abuseSignal: { detected: true } }, acceptedConstraintMutations: [{ operation: "CORRECT", fieldId: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "Sedan" }, explicitness: "EXPLICIT_REQUIREMENT", confidence: 1, sourceSpan: "Sedan dedim", deterministicDecisionUse: "HARD_CANDIDATE" }], acceptedBudgetMutations: [], acceptedPersonaMutations: [] } as never;
    const first = createConversationEventsFromInterpretation({ turn, interpretation, catalog: {} as never }); const second = createConversationEventsFromInterpretation({ turn, interpretation, catalog: {} as never });
    expect(second).toEqual(first); expect(first.map((event) => event.eventType)).toEqual(["CONSTRAINT", "ABUSE"]); expect(first.map((event) => event.sequence)).toEqual([0, 1]);
  });
});
