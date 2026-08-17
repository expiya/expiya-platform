import { describe, expect, it } from "vitest";

import { parseConversationEvent } from "./conversationEventSchema";

function constraintEvent(normalizedValue: unknown = { usage: "city" }) {
  return {
    schemaVersion: 1,
    conversationId: "conversation-1",
    id: "event-1",
    sourceMessageId: "message-1",
    sourceTurn: 1,
    sequence: 0,
    createdAt: "2026-08-16T10:00:00.000Z",
    eventType: "CONSTRAINT",
    kind: "SOFT_PREFERENCE",
    field: "usage",
    normalizedValue,
    sourceText: "Şehir içinde kullanacağım.",
    confidence: 1,
    authority: "USER_EXPLICIT",
    decisionEffect: "SOFT_RANK",
    status: "ACTIVE",
  };
}

describe("V2 strict conversation event schema", () => {
  it("parses and freezes a valid event", () => {
    const parsed = parseConversationEvent(constraintEvent());
    expect(parsed.eventType).toBe("CONSTRAINT");
    expect(Object.isFrozen(parsed)).toBe(true);
    if (parsed.eventType === "CONSTRAINT") expect(Object.isFrozen(parsed.normalizedValue)).toBe(true);
  });

  it("rejects unknown schema keys", () => {
    expect(() => parseConversationEvent({ ...constraintEvent(), unexpected: true })).toThrow();
  });

  it("rejects prototype-pollution keys in normalized JSON", () => {
    const polluted = JSON.parse('{"safe":1,"__proto__":{"polluted":true}}') as unknown;
    expect(() => parseConversationEvent(constraintEvent(polluted))).toThrow(/forbidden key/iu);
  });

  it.each([
    new Date(),
    BigInt(1),
    Symbol("not-json"),
    undefined,
    new Map([["key", "value"]]),
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -0,
  ])("rejects non-JSON normalized value %#", (value) => {
    expect(() => parseConversationEvent({ ...constraintEvent(), normalizedValue: value })).toThrow();
  });

  it("rejects future or unknown schema versions", () => {
    expect(() => parseConversationEvent({ ...constraintEvent(), schemaVersion: 2 })).toThrow();
  });

  it("requires a closed decision effect for model references", () => {
    const reference = {
      schemaVersion: 1, conversationId: "conversation-1", id: "model-reference", sourceMessageId: "message-1",
      sourceTurn: 1, sequence: 0, createdAt: "2026-08-16T10:00:00.000Z", eventType: "MODEL_REFERENCE",
      referenceId: "reference-1", rawText: "named model", resolution: "NOT_FOUND",
      resolvedFamilyIds: [], resolvedVariantIds: [],
    };
    expect(() => parseConversationEvent(reference)).toThrow();
    expect(parseConversationEvent({ ...reference, decisionEffect: "LOOKUP_ONLY" }).eventType).toBe("MODEL_REFERENCE");
    expect(() => parseConversationEvent({ ...reference, decisionEffect: "UNBOUNDED" })).toThrow();
  });

  it("rejects invalid IDs, money, turns, confidence, and dates", () => {
    expect(() => parseConversationEvent({ ...constraintEvent(), id: " " })).toThrow();
    expect(() => parseConversationEvent({ ...constraintEvent(), sourceTurn: -1 })).toThrow();
    expect(() => parseConversationEvent({ ...constraintEvent(), confidence: 1.1 })).toThrow();
    expect(() => parseConversationEvent({ ...constraintEvent(), createdAt: "16-08-2026" })).toThrow();
    expect(() => parseConversationEvent({ ...constraintEvent(), createdAt: "2026-02-31T10:00:00.000Z" })).toThrow();
    expect(() => parseConversationEvent({
      ...constraintEvent(), eventType: "BUDGET_MUTATION", operation: "SET",
      field: "AVAILABLE_CASH", value: { amount: 0, currency: "TRY" },
    })).toThrow();
  });
});
