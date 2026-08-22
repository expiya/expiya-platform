import { describe, expect, it } from "vitest";

import { CARS_CATALOG_CONVERSATION_PINNING_POLICY_V1 } from "./catalogConversationPolicy";
import type { ConversationEvent, ConversationEventBase } from "./conversationEvent";
import { classifyConversationEventDecisionImpact, eventInvalidatesOpenOffer } from "./eventDecisionImpact";

const base: ConversationEventBase = {
  schemaVersion: 1,
  conversationId: "conversation-1",
  id: "event-1",
  sourceMessageId: "message-1",
  sourceTurn: 1,
  sequence: 0,
  createdAt: "2026-08-16T10:00:00.000Z",
};

function classify(event: ConversationEvent) {
  return classifyConversationEventDecisionImpact(event);
}

describe("V2.1 decision-impact classification", () => {
  it("classifies conversation, safety, observability, and authorization events without invalidation", () => {
    const events: ConversationEvent[] = [
      { ...base, eventType: "SOCIAL_INTERACTION", interaction: "SHORT_SOCIAL" },
      { ...base, id: "turn", eventType: "TURN_RECORDED" },
      { ...base, id: "abuse", eventType: "ABUSE", transition: "BOUNDARY_SET" },
      { ...base, id: "answer", eventType: "DIRECT_ANSWER_FULFILLED", obligation: "MODEL_AVAILABILITY" },
      { ...base, id: "lookup", eventType: "MODEL_REFERENCE", referenceId: "reference-1", rawText: "named model", resolution: "NOT_FOUND", decisionEffect: "LOOKUP_ONLY", resolvedFamilyIds: [], resolvedVariantIds: [] },
    ];
    expect(events.map(classify)).toEqual(["CONVERSATION_ONLY", "CONVERSATION_ONLY", "SAFETY_ONLY", "OBSERVABILITY_ONLY", "OBSERVABILITY_ONLY"]);
    expect(events.every((event) => !eventInvalidatesOpenOffer(event))).toBe(true);
  });

  it("classifies candidate, affordability, and ranking mutations as invalidating", () => {
    const events: ConversationEvent[] = [
      { ...base, eventType: "BUDGET_MUTATION", operation: "SET", field: "AVAILABLE_CASH", value: { amount: 1, currency: "TRY" } },
      { ...base, id: "persona", eventType: "PERSONA_ACTIVATED", activationSource: "USER_EXPLICIT", requestedTraits: ["VALUE"] },
      { ...base, id: "preference", eventType: "MODEL_REFERENCE", referenceId: "reference-1", rawText: "named model", resolution: "EXACT_MODEL_FAMILY", decisionEffect: "PREFERENCE", resolvedFamilyIds: ["family-1"], resolvedVariantIds: [] },
    ];
    expect(events.map(classify)).toEqual(["AFFORDABILITY", "RANKING", "RANKING"]);
    expect(events.every(eventInvalidatesOpenOffer)).toBe(true);
  });

  it("records catalog snapshot pinning as a fail-closed domain policy", () => {
    expect(CARS_CATALOG_CONVERSATION_PINNING_POLICY_V1).toMatchObject({
      pinAtConversationStart: true,
      silentlyMigrateActiveConversation: false,
      unavailableSnapshotResult: "CATALOG_SNAPSHOT_UNAVAILABLE",
      userMayRestartWithActiveCatalog: true,
    });
  });
});
