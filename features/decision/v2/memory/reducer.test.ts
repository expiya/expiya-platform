import { describe, expect, it } from "vitest";

import type { ConversationEvent, ConversationEventBase } from "../domain/conversationEvent";
import type { CatalogAuthoritySnapshot } from "../domain/conversationMemory";
import type { GovernedOffer } from "../domain/offer";
import { CARS_MEMORY_FINGERPRINT_POLICY_V1 } from "../fingerprint/policy";
import { validateConversationMemoryV2 } from "./invariants";
import {
  ConversationMemoryReductionError,
  reduceConversationMemoryV2,
  replayConversationMemoryV2,
} from "./reducer";

const catalogAuthority: CatalogAuthoritySnapshot = {
  market: "TR",
  releaseVersion: "release-1",
  catalogFingerprint: "catalog-fingerprint-1",
  manifestFingerprint: "manifest-fingerprint-1",
  activatedAt: "2026-08-16T09:00:00.000Z",
};

function base(id: string, sourceTurn: number, sequence: number): ConversationEventBase {
  return {
    schemaVersion: 1,
    conversationId: "conversation-1",
    id,
    sourceMessageId: `message-${sourceTurn}`,
    sourceTurn,
    sequence,
    createdAt: `2026-08-16T10:0${Math.min(sourceTurn, 9)}:${String(sequence).padStart(2, "0")}.000Z`,
  };
}

function replay(events: readonly ConversationEvent[], authority = catalogAuthority) {
  return replayConversationMemoryV2({
    conversationId: "conversation-1",
    events,
    catalogAuthority: authority,
    fingerprintPolicy: CARS_MEMORY_FINGERPRINT_POLICY_V1,
  });
}

function cashEvent(id: string, sourceTurn: number, sequence: number, amount: number): ConversationEvent {
  return {
    ...base(id, sourceTurn, sequence),
    eventType: "BUDGET_MUTATION",
    operation: "SET",
    field: "AVAILABLE_CASH",
    value: { amount, currency: "TRY" },
  };
}

function hardCeilingEvent(id: string, sourceTurn: number, sequence: number, amount: number, supersedesEventId?: string): ConversationEvent {
  return {
    ...base(id, sourceTurn, sequence),
    eventType: "BUDGET_MUTATION",
    operation: supersedesEventId ? "CORRECT" : "SET",
    field: "MAXIMUM_HARD_CEILING",
    value: { amount, currency: "TRY" },
    supersedesEventId,
  };
}

describe("V2 event-sourced conversation memory", () => {
  it("produces the same result for incremental reduce and full replay", () => {
    const events: ConversationEvent[] = [
      { ...base("intent", 1, 0), eventType: "VEHICLE_INTENT_ESTABLISHED" },
      cashEvent("cash", 1, 1, 2_000_000),
      { ...base("model", 2, 0), eventType: "MODEL_REFERENCE", referenceId: "reference-1", rawText: "named model", resolution: "NOT_FOUND", decisionEffect: "LOOKUP_ONLY", resolvedFamilyIds: [], resolvedVariantIds: [] },
      { ...base("answer", 2, 1), eventType: "DIRECT_ANSWER_FULFILLED", obligation: "MODEL_AVAILABILITY" },
    ];
    const halfway = replay(events.slice(0, 2));
    const incremental = reduceConversationMemoryV2({
      conversationId: "conversation-1",
      previousMemory: halfway,
      appendedEvents: events.slice(2),
      catalogAuthority,
      fingerprintPolicy: CARS_MEMORY_FINGERPRINT_POLICY_V1,
    });
    expect(incremental).toEqual(replay(events));
  });

  it("is deterministic for the same event sequence", () => {
    const events = [cashEvent("cash", 1, 0, 2_000_000)];
    expect(replay(events).memoryFingerprint).toBe(replay(structuredClone(events)).memoryFingerprint);
  });

  it("binds the decision fingerprint to the pinned catalog fingerprint", () => {
    const changedAuthority = { ...catalogAuthority, catalogFingerprint: "catalog-fingerprint-2" };
    expect(replay([]).decisionFingerprint).not.toBe(replay([], changedAuthority).decisionFingerprint);
  });

  it("validates replay-derived memory and detects derived-state drift", () => {
    const memory = replay([cashEvent("cash", 1, 0, 2_000_000)]);
    expect(validateConversationMemoryV2(memory, CARS_MEMORY_FINGERPRINT_POLICY_V1)).toEqual({ ok: true });
    expect(validateConversationMemoryV2({ ...memory, turn: 99 }, CARS_MEMORY_FINGERPRINT_POLICY_V1)).toMatchObject({ ok: false });
  });

  it("rejects duplicate event IDs, position collisions, and turn regression", () => {
    const first = cashEvent("event-1", 2, 0, 2_000_000);
    expect(() => replay([first, { ...cashEvent("event-1", 2, 1, 3_000_000) }])).toThrowError(ConversationMemoryReductionError);
    expect(() => replay([first, cashEvent("event-2", 2, 0, 3_000_000)])).toThrow(/EVENT_SEQUENCE_NOT_MONOTONIC|EVENT_POSITION_DUPLICATE/u);
    expect(() => replay([first, cashEvent("event-2", 1, 0, 3_000_000)])).toThrow(/EVENT_TURN_REGRESSION/u);
  });

  it("does not mutate caller-owned events", () => {
    const events = [cashEvent("cash", 1, 0, 2_000_000)];
    const before = structuredClone(events);
    replay(events);
    expect(events).toEqual(before);
    expect(Object.isFrozen(replay(events).events[0])).toBe(true);
  });

  it("fails closed for missing or field-mismatched supersession references", () => {
    expect(() => replay([{ ...hardCeilingEvent("ceiling-2", 2, 0, 5_000_000, "missing") }])).toThrow(/SUPERSESSION_REFERENCE_INVALID/u);
    expect(() => replay([
      cashEvent("cash", 1, 0, 2_000_000),
      { ...hardCeilingEvent("ceiling", 2, 0, 5_000_000, "cash") },
    ])).toThrow(/SUPERSESSION_FIELD_MISMATCH/u);
  });

  it("keeps cash separate from a hard ceiling and financing does not invent one", () => {
    const memory = replay([
      cashEvent("cash", 1, 0, 2_000_000),
      { ...base("finance", 1, 1), eventType: "BUDGET_MUTATION", operation: "SET", field: "FINANCE_FLEXIBILITY", value: "POSSIBLE" },
    ]);
    expect(memory.budget.availableCash?.amount).toBe(2_000_000);
    expect(memory.budget.maximumHardCeiling).toBeUndefined();
  });

  it("corrects a hard ceiling without deleting its event history", () => {
    const events = [
      hardCeilingEvent("ceiling-1", 1, 0, 3_000_000),
      hardCeilingEvent("ceiling-2", 2, 0, 5_000_000, "ceiling-1"),
    ];
    const memory = replay(events);
    expect(memory.budget.maximumHardCeiling?.amount).toBe(5_000_000);
    expect(memory.events).toHaveLength(2);
  });

  it("excludes budget without deleting history and a later budget event re-enables it", () => {
    const memory = replay([
      hardCeilingEvent("ceiling", 1, 0, 3_000_000),
      { ...base("exclude", 2, 0), eventType: "BUDGET_MUTATION", operation: "EXCLUDE_FROM_DECISION" },
      hardCeilingEvent("new-ceiling", 3, 0, 5_000_000, "ceiling"),
    ]);
    expect(memory.events).toHaveLength(3);
    expect(memory.budget.budgetExcluded).toBe(false);
    expect(memory.budget.maximumHardCeiling?.amount).toBe(5_000_000);
  });

  it("replays persona activation, canonical change, and deactivation", () => {
    const active = replay([{
      ...base("persona-1", 1, 0), eventType: "PERSONA_ACTIVATED",
      activationSource: "USER_EXPLICIT", requestedTraits: ["TECHNOLOGY", "DESIGN", "DESIGN"],
    }]);
    expect(active.persona).toMatchObject({ activated: true, requestedTraits: ["DESIGN", "TECHNOLOGY"] });
    const changed = replay([
      active.events[0]!,
      { ...base("persona-2", 2, 0), eventType: "PERSONA_ACTIVATED", activationSource: "ADVISOR_PROMPT_RESPONSE", requestedTraits: ["VALUE"] },
      { ...base("persona-3", 3, 0), eventType: "PERSONA_DEACTIVATED", reason: "USER_CLEARED", supersedesEventId: "persona-2" },
    ]);
    expect(changed.persona).toEqual({ activated: false, requestedTraits: [] });
  });

  it("revokes an offer when an active persona is deactivated", () => {
    const activation = {
      ...base("persona-active", 1, 0), eventType: "PERSONA_ACTIVATED" as const,
      activationSource: "USER_EXPLICIT" as const, requestedTraits: ["VALUE"] as const,
    };
    const active = replay([activation]);
    const offer: GovernedOffer = {
      offerId: "persona-offer", mode: "FAMILY_DIVERSE",
      candidates: [{ exactVariantId: "variant-1", modelFamilyId: "family-1", authorizationId: "auth-1", eligibility: "FULLY_ELIGIBLE" }],
      explicitTrimComparisonRequested: false, explicitPriceUnverifiedConsent: false,
      catalogFingerprint: catalogAuthority.catalogFingerprint, decisionFingerprint: active.decisionFingerprint,
      expiresAt: "2026-08-17T10:00:00.000Z", lifecycleState: "CREATED",
    };
    const memory = replay([
      activation,
      { ...base("persona-offer-created", 2, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CREATED", offer },
      { ...base("persona-cleared", 3, 0), eventType: "PERSONA_DEACTIVATED", reason: "USER_CLEARED", supersedesEventId: activation.id },
    ]);
    expect(memory.currentOffer).toMatchObject({ lifecycleState: "REVOKED", revealable: false });
  });

  it("revokes a revealed offer when a later decision mutation changes the shortlist", () => {
    const initial = replay([]);
    const offer: GovernedOffer = {
      offerId: "revealed-offer", mode: "FAMILY_DIVERSE",
      candidates: [{ exactVariantId: "variant-1", modelFamilyId: "family-1", authorizationId: "auth-1", eligibility: "FULLY_ELIGIBLE" }],
      explicitTrimComparisonRequested: false, explicitPriceUnverifiedConsent: false,
      catalogFingerprint: catalogAuthority.catalogFingerprint, decisionFingerprint: initial.decisionFingerprint,
      expiresAt: "2026-08-17T10:00:00.000Z", lifecycleState: "CREATED",
    };
    const memory = replay([
      { ...base("offer-created", 1, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CREATED", offer },
      { ...base("offer-consented", 2, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CONSENTED" },
      { ...base("offer-revealed", 3, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "REVEALED" },
      hardCeilingEvent("new-budget", 4, 0, 3_500_000),
    ]);
    expect(memory.currentOffer).toMatchObject({ lifecycleState: "REVOKED", revealable: false });
    expect(memory.revealedCandidateIds).toEqual(["variant-1"]);
  });

  it("does not activate persona from social interaction", () => {
    const memory = replay([{ ...base("social", 1, 0), eventType: "SOCIAL_INTERACTION", interaction: "SHORT_SOCIAL" }]);
    expect(memory.persona.activated).toBe(false);
  });

  it("tracks answered, declined, and deferred material questions", () => {
    const memory = replay([
      { ...base("ask-1", 1, 0), eventType: "MATERIAL_QUESTION_ASKED", questionId: "question-1", stableSemanticKey: "usage.primary", field: "usage" },
      { ...base("defer-1", 1, 1), eventType: "MATERIAL_QUESTION_DISPOSITION", questionId: "question-1", stableSemanticKey: "usage.primary", status: "DEFERRED" },
      { ...base("ask-2", 3, 0), eventType: "MATERIAL_QUESTION_ASKED", questionId: "question-2", stableSemanticKey: "usage.primary", field: "usage" },
      { ...base("answer-2", 3, 1), eventType: "MATERIAL_QUESTION_DISPOSITION", questionId: "question-2", stableSemanticKey: "usage.primary", status: "ANSWERED" },
      { ...base("ask-3", 4, 0), eventType: "MATERIAL_QUESTION_ASKED", questionId: "question-3", stableSemanticKey: "persona.optional", field: "persona" },
      { ...base("decline-3", 4, 1), eventType: "MATERIAL_QUESTION_DISPOSITION", questionId: "question-3", stableSemanticKey: "persona.optional", status: "DECLINED" },
    ]);
    expect(memory.materialQuestionHistory.map((item) => item.answerStatus)).toEqual(["DEFERRED", "ANSWERED", "DECLINED"]);
    expect(() => replay([...memory.events, { ...base("ask-4", 5, 0), eventType: "MATERIAL_QUESTION_ASKED", questionId: "question-4", stableSemanticKey: "usage.primary", field: "usage" }])).toThrow(/QUESTION_SEMANTIC_KEY_CLOSED/u);
  });

  it("replays model references and fulfilled direct answers", () => {
    const memory = replay([
      { ...base("model", 1, 0), eventType: "MODEL_REFERENCE", referenceId: "reference-1", rawText: "named model", resolution: "EXACT_MODEL_FAMILY", decisionEffect: "LOOKUP_ONLY", resolvedFamilyIds: ["family-1"], resolvedVariantIds: [] },
      { ...base("answer", 1, 1), eventType: "DIRECT_ANSWER_FULFILLED", obligation: "MODEL_SUITABILITY" },
    ]);
    expect(memory.modelReferences[0]?.resolvedFamilyIds).toEqual(["family-1"]);
    expect(memory.directAnswerHistory[0]?.obligation).toBe("MODEL_SUITABILITY");
  });

  it("tracks social/off-topic reset behavior without creating persona", () => {
    const memory = replay([
      { ...base("social-1", 1, 0), eventType: "SOCIAL_INTERACTION", interaction: "SHORT_SOCIAL" },
      { ...base("off-1", 1, 1), eventType: "OFF_TOPIC", transition: "DETECTED" },
      { ...base("off-2", 2, 0), eventType: "OFF_TOPIC", transition: "DETECTED" },
      { ...base("intent", 3, 0), eventType: "VEHICLE_INTENT_ESTABLISHED" },
      { ...base("return", 3, 1), eventType: "OFF_TOPIC", transition: "RETURNED_TO_VEHICLE" },
    ]);
    expect(memory.socialState.consecutiveSocialTurns).toBe(0);
    expect(memory.offTopicState.consecutiveOffTopicTurns).toBe(0);
    expect(memory.persona.activated).toBe(false);
  });

  it("produces the abuse ladder and does not reset it on normal vehicle intent", () => {
    const memory = replay([
      { ...base("abuse-1", 1, 0), eventType: "ABUSE", transition: "BOUNDARY_SET" },
      { ...base("intent", 2, 0), eventType: "VEHICLE_INTENT_ESTABLISHED" },
      { ...base("abuse-2", 3, 0), eventType: "ABUSE", transition: "WARNED" },
      { ...base("abuse-3", 4, 0), eventType: "ABUSE", transition: "ENDED" },
    ]);
    expect(memory.abuseState).toEqual({ level: "ENDED", strikeCount: 3 });
  });
});

describe("V2 offer lifecycle", () => {
  function governedOffer(decisionFingerprint: string): GovernedOffer {
    return {
      offerId: "offer-1",
      mode: "FAMILY_DIVERSE",
      candidates: [{ exactVariantId: "variant-1", modelFamilyId: "family-1", authorizationId: "auth-1", eligibility: "FULLY_ELIGIBLE" }],
      explicitTrimComparisonRequested: false,
      explicitPriceUnverifiedConsent: false,
      catalogFingerprint: catalogAuthority.catalogFingerprint,
      decisionFingerprint,
      expiresAt: "2026-08-17T10:00:00.000Z",
      lifecycleState: "CREATED",
    };
  }

  function createdOfferEvent(offer: GovernedOffer): ConversationEvent {
    return { ...base("offer-created", 1, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CREATED", offer };
  }

  function activeConstraint(id: string, sourceTurn: number, sequence: number): ConversationEvent {
    return {
      ...base(id, sourceTurn, sequence), eventType: "CONSTRAINT", kind: "SOFT_PREFERENCE", field: "usage",
      normalizedValue: "urban", sourceText: "urban use", confidence: 1, authority: "USER_EXPLICIT",
      decisionEffect: "SOFT_RANK", status: "ACTIVE",
    };
  }

  it("accepts CREATED → CONSENTED → REVEALED", () => {
    const initial = replay([]);
    const offer = governedOffer(initial.decisionFingerprint);
    const memory = replay([
      { ...base("offer-created", 1, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CREATED", offer },
      { ...base("offer-consented", 2, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CONSENTED" },
      { ...base("offer-revealed", 3, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "REVEALED" },
    ]);
    expect(memory.currentOffer?.lifecycleState).toBe("REVEALED");
    expect(memory.revealedCandidateIds).toEqual(["variant-1"]);
  });

  it("rejects invalid transitions and unknown offers", () => {
    expect(() => replay([{ ...base("consent", 1, 0), eventType: "OFFER_LIFECYCLE", offerId: "missing", lifecycleState: "CONSENTED" }])).toThrow(/UNKNOWN_OFFER_ID/u);
    const initial = replay([]);
    const offer = governedOffer(initial.decisionFingerprint);
    expect(() => replay([
      { ...base("created", 1, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CREATED", offer },
      { ...base("expired", 2, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "EXPIRED" },
      { ...base("consented", 3, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CONSENTED" },
    ])).toThrow(/INVALID_OFFER_TRANSITION/u);
  });

  it("makes an old offer unrevealable after a decision-memory mutation", () => {
    const initial = replay([]);
    const offer = governedOffer(initial.decisionFingerprint);
    expect(() => replay([
      { ...base("created", 1, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CREATED", offer },
      { ...base("consented", 2, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CONSENTED" },
      cashEvent("cash", 3, 0, 2_000_000),
      { ...base("revealed", 4, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "REVEALED" },
    ])).toThrow(/INVALID_OFFER_TRANSITION|OFFER_NOT_REVEALABLE/u);
  });

  it("changes audit fingerprint but preserves decision fingerprint and offer for social events", () => {
    const initial = replay([]);
    const offer = governedOffer(initial.decisionFingerprint);
    const created = replay([createdOfferEvent(offer)]);
    const social = replay([
      created.events[0]!,
      { ...base("social", 2, 0), eventType: "SOCIAL_INTERACTION", interaction: "SHORT_SOCIAL" },
    ]);
    expect(social.memoryFingerprint).not.toBe(created.memoryFingerprint);
    expect(social.decisionFingerprint).toBe(created.decisionFingerprint);
    expect(social.currentOffer).toMatchObject({ lifecycleState: "CREATED", revealable: true });
  });

  it.each([
    { name: "direct answer", event: { ...base("answer", 2, 0), eventType: "DIRECT_ANSWER_FULFILLED", obligation: "MODEL_AVAILABILITY" } as const },
    { name: "state transition", event: { ...base("state", 2, 0), eventType: "CONVERSATION_STATE_TRANSITION", from: "SOCIAL", to: "OFFERING" } as const },
    { name: "question asked", event: { ...base("ask", 2, 0), eventType: "MATERIAL_QUESTION_ASKED", questionId: "question-1", stableSemanticKey: "usage.primary", field: "usage" } as const },
  ])("does not revoke an offer for $name", ({ event }) => {
    const initial = replay([]);
    const offer = governedOffer(initial.decisionFingerprint);
    expect(replay([createdOfferEvent(offer), event]).currentOffer).toMatchObject({ lifecycleState: "CREATED", revealable: true });
  });

  it("does not revoke an offer for question disposition alone", () => {
    const beforeOffer = replay([{ ...base("ask", 1, 0), eventType: "MATERIAL_QUESTION_ASKED", questionId: "question-1", stableSemanticKey: "usage.primary", field: "usage" }]);
    const offer = governedOffer(beforeOffer.decisionFingerprint);
    const memory = replay([
      beforeOffer.events[0]!,
      { ...base("offer-created", 2, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CREATED", offer },
      { ...base("answer", 3, 0), eventType: "MATERIAL_QUESTION_DISPOSITION", questionId: "question-1", stableSemanticKey: "usage.primary", status: "ANSWERED" },
    ]);
    expect(memory.currentOffer).toMatchObject({ lifecycleState: "CREATED", revealable: true });
  });

  it.each([
    { name: "constraint", event: activeConstraint("constraint", 2, 0) },
    { name: "budget", event: cashEvent("cash", 2, 0, 2_000_000) },
    { name: "persona", event: { ...base("persona", 2, 0), eventType: "PERSONA_ACTIVATED", activationSource: "USER_EXPLICIT", requestedTraits: ["VALUE"] } as const },
    { name: "rejection", event: { ...base("rejection", 2, 0), eventType: "CANDIDATE_REJECTION", candidateId: "variant-1", scope: "EXACT_VARIANT", reason: "MODEL_DISLIKE", scopeExplicitlyRequested: true } as const },
  ])("revokes an offer for $name decision mutations", ({ event }) => {
    const initial = replay([]);
    const offer = governedOffer(initial.decisionFingerprint);
    const memory = replay([createdOfferEvent(offer), event]);
    expect(memory.currentOffer).toMatchObject({ lifecycleState: "REVOKED", revealable: false });
    expect(memory.decisionFingerprint).not.toBe(initial.decisionFingerprint);
  });

  it("distinguishes lookup-only and preference model references", () => {
    const initial = replay([]);
    const offer = governedOffer(initial.decisionFingerprint);
    const lookup = { ...base("lookup", 2, 0), eventType: "MODEL_REFERENCE", referenceId: "ref-1", rawText: "named model", resolution: "NOT_FOUND", decisionEffect: "LOOKUP_ONLY", resolvedFamilyIds: [], resolvedVariantIds: [] } as const;
    expect(replay([createdOfferEvent(offer), lookup]).currentOffer?.lifecycleState).toBe("CREATED");
    const preference = { ...lookup, ...base("preference", 2, 0), referenceId: "ref-2", decisionEffect: "PREFERENCE" } as const;
    expect(replay([createdOfferEvent(offer), preference]).currentOffer?.lifecycleState).toBe("REVOKED");
  });

  it("allows reveal after consent and social activity", () => {
    const initial = replay([]);
    const offer = governedOffer(initial.decisionFingerprint);
    const memory = replay([
      createdOfferEvent(offer),
      { ...base("consent", 2, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "CONSENTED" },
      { ...base("social", 3, 0), eventType: "SOCIAL_INTERACTION", interaction: "SHORT_SOCIAL" },
      { ...base("reveal", 4, 0), eventType: "OFFER_LIFECYCLE", offerId: offer.offerId, lifecycleState: "REVEALED" },
    ]);
    expect(memory.currentOffer?.lifecycleState).toBe("REVEALED");
  });

  it("keeps an offer open when a same-turn state transition follows creation", () => {
    const initial = replay([]);
    const offer = governedOffer(initial.decisionFingerprint);
    const memory = replay([
      createdOfferEvent(offer),
      { ...base("state", 1, 1), eventType: "CONVERSATION_STATE_TRANSITION", from: "SOCIAL", to: "OFFERING" },
    ]);
    expect(memory.currentOffer).toMatchObject({ lifecycleState: "CREATED", revealable: true });
  });

  it("changes the decision fingerprint for a constraint without depending on audit metadata", () => {
    const initial = replay([]);
    const constrained = replay([activeConstraint("constraint", 1, 0)]);
    expect(constrained.decisionFingerprint).not.toBe(initial.decisionFingerprint);
    expect(constrained.memoryFingerprint).not.toBe(constrained.decisionFingerprint);
  });
});
