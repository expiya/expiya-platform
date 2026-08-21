import type { BudgetState } from "../domain/budget";
import type { ConversationEvent, OfferLifecycleEvent, VehiclePersonaTrait } from "../domain/conversationEvent";
import { eventInvalidatesOpenOffer } from "../domain/eventDecisionImpact";
import type {
  CatalogAuthoritySnapshot,
  ConversationMemory,
  CurrentOfferReference,
} from "../domain/conversationMemory";
import { validateGovernedOffer } from "../domain/invariants";
import type { GovernedOffer, OfferLifecycleState } from "../domain/offer";
import { canonicalize } from "../fingerprint/canonicalize";
import { calculateDecisionFingerprint } from "../fingerprint/decisionFingerprint";
import { calculateFingerprintForMemory } from "../fingerprint/memoryFingerprint";
import type { FingerprintPolicy } from "../fingerprint/policy";
import { parseConversationEvents } from "../schema/conversationEventSchema";

export class ConversationMemoryReductionError extends Error {
  constructor(readonly code: string, readonly referenceId?: string) {
    super(referenceId ? `${code}: ${referenceId}` : code);
    this.name = "ConversationMemoryReductionError";
  }
}

const EMPTY_BUDGET: BudgetState = Object.freeze({
  financeFlexibility: "UNKNOWN",
  unresolvedFinancedCeiling: false,
  budgetImportance: "UNKNOWN",
  budgetUnknown: true,
  budgetExcluded: false,
});

function fingerprint(memory: ConversationMemory, policy: FingerprintPolicy): ConversationMemory {
  const withDecisionFingerprint = { ...memory, decisionFingerprint: calculateDecisionFingerprint(memory) };
  return { ...withDecisionFingerprint, memoryFingerprint: calculateFingerprintForMemory(withDecisionFingerprint, policy) };
}

function emptyMemory(input: {
  readonly conversationId: string;
  readonly catalogAuthority: CatalogAuthoritySnapshot;
  readonly fingerprintPolicy: FingerprintPolicy;
}): ConversationMemory {
  return fingerprint({
    conversationId: input.conversationId,
    turn: 0,
    state: "SOCIAL",
    vehicleIntentEstablished: false,
    events: [],
    budget: EMPTY_BUDGET,
    modelReferences: [],
    revealedCandidateIds: [],
    socialState: { consecutiveSocialTurns: 0 },
    offTopicState: { consecutiveOffTopicTurns: 0, boundaryStated: false },
    abuseState: { level: "NONE", strikeCount: 0 },
    directAnswerHistory: [],
    materialQuestionHistory: [],
    persona: { activated: false, requestedTraits: [] },
    catalogAuthority: input.catalogAuthority,
    memoryFingerprint: "",
    decisionFingerprint: "",
  }, input.fingerprintPolicy);
}

function validateAppend(previous: ConversationMemory, events: readonly ConversationEvent[]): void {
  const existingById = new Map(previous.events.map((event) => [event.id, event] as const));
  let lastTurn = previous.events.at(-1)?.sourceTurn ?? 0;
  let lastSequence = previous.events.at(-1)?.sequence ?? -1;
  const positions = new Set(previous.events.map((event) => `${event.sourceTurn}:${event.sequence}`));
  for (const event of events) {
    if (event.schemaVersion !== 1) throw new ConversationMemoryReductionError("UNKNOWN_EVENT_SCHEMA_VERSION", event.id);
    if (event.conversationId !== previous.conversationId) throw new ConversationMemoryReductionError("EVENT_CONVERSATION_MISMATCH", event.id);
    const existing = existingById.get(event.id);
    if (existing) {
      const code = canonicalize(existing) === canonicalize(event) ? "DUPLICATE_EVENT_ID" : "EXISTING_EVENT_PAYLOAD_CHANGED";
      throw new ConversationMemoryReductionError(code, event.id);
    }
    if (event.sourceTurn < lastTurn) throw new ConversationMemoryReductionError("EVENT_TURN_REGRESSION", event.id);
    if (event.sourceTurn === lastTurn && event.sequence <= lastSequence) throw new ConversationMemoryReductionError("EVENT_SEQUENCE_NOT_MONOTONIC", event.id);
    const position = `${event.sourceTurn}:${event.sequence}`;
    if (positions.has(position)) throw new ConversationMemoryReductionError("EVENT_POSITION_DUPLICATE", event.id);
    positions.add(position);
    existingById.set(event.id, event);
    lastTurn = event.sourceTurn;
    lastSequence = event.sequence;
  }
}

function validateEventReference(memory: ConversationMemory, event: ConversationEvent): void {
  const byId = new Map(memory.events.map((prior) => [prior.id, prior] as const));
  if (event.eventType === "CONSTRAINT" && event.supersedesId) {
    const prior = byId.get(event.supersedesId);
    if (!prior || prior.eventType !== "CONSTRAINT") {
      throw new ConversationMemoryReductionError("SUPERSESSION_REFERENCE_INVALID", event.supersedesId);
    }
    if (prior.field !== event.field) throw new ConversationMemoryReductionError("SUPERSESSION_FIELD_MISMATCH", event.id);
  }
  if (event.eventType === "BUDGET_MUTATION" && event.operation === "CORRECT" && !event.supersedesEventId) {
    throw new ConversationMemoryReductionError("BUDGET_CORRECTION_REFERENCE_REQUIRED", event.id);
  }
  if (event.eventType === "BUDGET_MUTATION" && "supersedesEventId" in event && event.supersedesEventId) {
    const prior = byId.get(event.supersedesEventId);
    if (!prior || prior.eventType !== "BUDGET_MUTATION" || !("field" in prior) || !("field" in event)) {
      throw new ConversationMemoryReductionError("SUPERSESSION_REFERENCE_INVALID", event.supersedesEventId);
    }
    if (prior.field !== event.field) throw new ConversationMemoryReductionError("SUPERSESSION_FIELD_MISMATCH", event.id);
  }
  if (event.eventType === "PERSONA_DEACTIVATED" && event.supersedesEventId) {
    const prior = byId.get(event.supersedesEventId);
    if (!prior || prior.eventType !== "PERSONA_ACTIVATED") {
      throw new ConversationMemoryReductionError("SUPERSESSION_REFERENCE_INVALID", event.supersedesEventId);
    }
  }
}

function reduceBudget(budget: BudgetState, event: Extract<ConversationEvent, { eventType: "BUDGET_MUTATION" }>): BudgetState {
  if (event.operation === "EXCLUDE_FROM_DECISION") return { ...budget, budgetExcluded: true, budgetImportance: "NONE" };
  const next = { ...budget, budgetExcluded: event.operation === "SET" || event.operation === "CORRECT" ? false : budget.budgetExcluded };
  if (event.operation === "CLEAR") {
    if (event.field === "AVAILABLE_CASH") delete next.availableCash;
    if (event.field === "PREFERRED_BUDGET") delete next.preferredBudget;
    if (event.field === "MAXIMUM_HARD_CEILING") delete next.maximumHardCeiling;
    if (event.field === "FINANCE_FLEXIBILITY") next.financeFlexibility = "UNKNOWN";
    if (event.field === "UNRESOLVED_FINANCED_CEILING") next.unresolvedFinancedCeiling = false;
    if (event.field === "BUDGET_IMPORTANCE") next.budgetImportance = "UNKNOWN";
    if (event.field === "BUDGET_UNKNOWN") next.budgetUnknown = true;
    return next;
  }
  if (event.field === "AVAILABLE_CASH") next.availableCash = event.value;
  if (event.field === "PREFERRED_BUDGET") next.preferredBudget = event.value;
  if (event.field === "MAXIMUM_HARD_CEILING") next.maximumHardCeiling = event.value;
  if (event.field === "FINANCE_FLEXIBILITY") next.financeFlexibility = event.value;
  if (event.field === "UNRESOLVED_FINANCED_CEILING") next.unresolvedFinancedCeiling = event.value;
  if (event.field === "BUDGET_IMPORTANCE") next.budgetImportance = event.value;
  if (event.field === "BUDGET_UNKNOWN") next.budgetUnknown = event.value;
  return next;
}

const ALLOWED_OFFER_TRANSITIONS: Readonly<Record<OfferLifecycleState, readonly OfferLifecycleState[]>> = {
  CREATED: ["CONSENTED", "EXPIRED", "REVOKED"],
  CONSENTED: ["REVEALED", "EXPIRED", "REVOKED"],
  REVEALED: [],
  EXPIRED: [],
  REVOKED: [],
};

function offerReference(offer: GovernedOffer): CurrentOfferReference {
  return {
    offerId: offer.offerId,
    lifecycleState: "CREATED",
    catalogFingerprint: offer.catalogFingerprint,
    decisionFingerprint: offer.decisionFingerprint,
    candidateIds: offer.candidates.map((candidate) => candidate.exactVariantId),
    revealable: true,
  };
}

function reduceOffer(memory: ConversationMemory, event: OfferLifecycleEvent): Pick<ConversationMemory, "currentOffer" | "revealedCandidateIds"> {
  if (event.lifecycleState === "CREATED") {
    if (event.offerId !== event.offer.offerId) throw new ConversationMemoryReductionError("OFFER_ID_MISMATCH", event.id);
    if (event.offer.catalogFingerprint !== memory.catalogAuthority.catalogFingerprint) throw new ConversationMemoryReductionError("OFFER_CATALOG_FINGERPRINT_MISMATCH", event.offerId);
    if (event.offer.decisionFingerprint !== memory.decisionFingerprint) throw new ConversationMemoryReductionError("OFFER_DECISION_FINGERPRINT_MISMATCH", event.offerId);
    const validation = validateGovernedOffer(event.offer, new Date(event.createdAt));
    if (!validation.ok) throw new ConversationMemoryReductionError("OFFER_CONTRACT_INVALID", event.offerId);
    return { currentOffer: offerReference(event.offer), revealedCandidateIds: memory.revealedCandidateIds };
  }
  const current = memory.currentOffer;
  if (!current || current.offerId !== event.offerId) throw new ConversationMemoryReductionError("UNKNOWN_OFFER_ID", event.offerId);
  if (!ALLOWED_OFFER_TRANSITIONS[current.lifecycleState].includes(event.lifecycleState)) throw new ConversationMemoryReductionError("INVALID_OFFER_TRANSITION", event.offerId);
  if (event.lifecycleState === "REVEALED" && (!current.revealable || current.catalogFingerprint !== memory.catalogAuthority.catalogFingerprint)) {
    throw new ConversationMemoryReductionError("OFFER_NOT_REVEALABLE", event.offerId);
  }
  return {
    currentOffer: { ...current, lifecycleState: event.lifecycleState, revealable: current.revealable && !["EXPIRED", "REVOKED"].includes(event.lifecycleState) },
    revealedCandidateIds: event.lifecycleState === "REVEALED"
      ? [...new Set([...memory.revealedCandidateIds, ...current.candidateIds])]
      : memory.revealedCandidateIds,
  };
}

function invalidateOfferForDecisionMutation(currentOffer: CurrentOfferReference | undefined): CurrentOfferReference | undefined {
  if (!currentOffer || ["EXPIRED", "REVOKED"].includes(currentOffer.lifecycleState)) return currentOffer;
  return { ...currentOffer, lifecycleState: "REVOKED", revealable: false };
}

function reduceOne(memory: ConversationMemory, event: ConversationEvent, policy: FingerprintPolicy): ConversationMemory {
  validateEventReference(memory, event);
  let next: ConversationMemory = { ...memory, turn: event.sourceTurn, events: [...memory.events, event] };
  if (eventInvalidatesOpenOffer(event)) next = { ...next, currentOffer: invalidateOfferForDecisionMutation(memory.currentOffer) };

  if (event.eventType === "BUDGET_MUTATION") next = { ...next, budget: reduceBudget(memory.budget, event) };
  if (event.eventType === "MODEL_REFERENCE") next = { ...next, modelReferences: [...memory.modelReferences, {
    id: event.referenceId, sourceMessageId: event.sourceMessageId, sourceTurn: event.sourceTurn, rawText: event.rawText,
    normalizedBrand: event.normalizedBrand, normalizedModel: event.normalizedModel, resolution: event.resolution,
    decisionEffect: event.decisionEffect,
    resolvedFamilyIds: [...event.resolvedFamilyIds], resolvedVariantIds: [...event.resolvedVariantIds],
  }] };
  if (event.eventType === "PERSONA_ACTIVATED") {
    const traits = [...new Set(event.requestedTraits)].sort() as [VehiclePersonaTrait, ...VehiclePersonaTrait[]];
    next = { ...next, persona: { activated: true, activationSource: event.activationSource, requestedTraits: traits, sourceTurn: event.sourceTurn } };
  }
  if (event.eventType === "PERSONA_DEACTIVATED") next = { ...next, persona: { activated: false, requestedTraits: [] } };
  if (event.eventType === "MATERIAL_QUESTION_ASKED") {
    const prior = [...memory.materialQuestionHistory].reverse().find((item) => item.stableSemanticKey === event.stableSemanticKey);
    if (prior && ["ANSWERED", "DECLINED"].includes(prior.answerStatus)) throw new ConversationMemoryReductionError("QUESTION_SEMANTIC_KEY_CLOSED", event.stableSemanticKey);
    if (prior?.answerStatus === "DEFERRED" && event.sourceTurn <= prior.askedOnTurn + 1) throw new ConversationMemoryReductionError("QUESTION_DEFERRED_TOO_SOON", event.stableSemanticKey);
    next = { ...next, materialQuestionHistory: [...memory.materialQuestionHistory, {
      questionId: event.questionId, stableSemanticKey: event.stableSemanticKey, field: event.field,
      askedOnTurn: event.sourceTurn, answerStatus: "OPEN",
    }] };
  }
  if (event.eventType === "MATERIAL_QUESTION_DISPOSITION") {
    const index = [...memory.materialQuestionHistory].reverse().findIndex((item) => item.questionId === event.questionId);
    if (index < 0) throw new ConversationMemoryReductionError("QUESTION_NOT_FOUND", event.questionId);
    const actual = memory.materialQuestionHistory.length - 1 - index;
    const prior = memory.materialQuestionHistory[actual]!;
    if (prior.stableSemanticKey !== event.stableSemanticKey) throw new ConversationMemoryReductionError("QUESTION_SEMANTIC_KEY_MISMATCH", event.questionId);
    if (prior.answerStatus !== "OPEN" && prior.answerStatus !== "DEFERRED") throw new ConversationMemoryReductionError("QUESTION_ALREADY_DISPOSED", event.questionId);
    const history = [...memory.materialQuestionHistory];
    history[actual] = { ...prior, answerStatus: event.status, answeredOnTurn: event.sourceTurn };
    next = { ...next, materialQuestionHistory: history };
  }
  if (event.eventType === "DIRECT_ANSWER_FULFILLED") next = { ...next, directAnswerHistory: [...memory.directAnswerHistory, {
    obligation: event.obligation, sourceMessageId: event.sourceMessageId, sourceTurn: event.sourceTurn, fulfilledOnTurn: event.sourceTurn,
  }] };
  if (event.eventType === "SOCIAL_INTERACTION") next = { ...next, socialState: event.interaction === "SHORT_SOCIAL"
    ? { lastSocialTurn: event.sourceTurn, consecutiveSocialTurns: memory.socialState.consecutiveSocialTurns + 1 }
    : { lastSocialTurn: memory.socialState.lastSocialTurn, consecutiveSocialTurns: 0 } };
  if (event.eventType === "OFF_TOPIC") {
    if (event.transition === "DETECTED") next = { ...next, offTopicState: { ...memory.offTopicState, consecutiveOffTopicTurns: memory.offTopicState.consecutiveOffTopicTurns + 1 } };
    if (event.transition === "RETURNED_TO_VEHICLE") next = { ...next, offTopicState: { consecutiveOffTopicTurns: 0, boundaryStated: false } };
    if (event.transition === "BOUNDARY_STATED") next = { ...next, offTopicState: { ...memory.offTopicState, boundaryStated: true } };
  }
  if (event.eventType === "ABUSE") {
    const expected: Readonly<Record<typeof event.transition, ConversationMemory["abuseState"]["level"]>> = {
      BOUNDARY_SET: "BOUNDARY_SET", WARNED: "WARNED", ENDED: "ENDED", EXPLICIT_RESET: "NONE",
    };
    const allowed = event.transition === "BOUNDARY_SET" ? memory.abuseState.level === "NONE"
      : event.transition === "WARNED" ? memory.abuseState.level === "BOUNDARY_SET"
        : event.transition === "ENDED" ? memory.abuseState.level === "WARNED" : true;
    if (!allowed) throw new ConversationMemoryReductionError("INVALID_ABUSE_TRANSITION", event.id);
    next = { ...next, abuseState: event.transition === "EXPLICIT_RESET"
      ? { level: "NONE", strikeCount: 0 }
      : { level: expected[event.transition], strikeCount: memory.abuseState.strikeCount + 1 } };
  }
  if (event.eventType === "VEHICLE_INTENT_ESTABLISHED") next = {
    ...next, vehicleIntentEstablished: true, socialState: { lastSocialTurn: memory.socialState.lastSocialTurn, consecutiveSocialTurns: 0 },
  };
  if (event.eventType === "CONVERSATION_STATE_TRANSITION") {
    if (event.from !== memory.state) throw new ConversationMemoryReductionError("STATE_TRANSITION_SOURCE_MISMATCH", event.id);
    next = { ...next, state: event.to };
  }
  if (event.eventType === "OFFER_LIFECYCLE") next = { ...next, ...reduceOffer(memory, event) };
  return fingerprint(next, policy);
}

export function reduceConversationMemoryV2(input: {
  readonly conversationId: string;
  readonly previousMemory: ConversationMemory;
  readonly appendedEvents: readonly ConversationEvent[];
  readonly catalogAuthority: CatalogAuthoritySnapshot;
  readonly fingerprintPolicy: FingerprintPolicy;
}): ConversationMemory {
  if (input.previousMemory.conversationId !== input.conversationId) throw new ConversationMemoryReductionError("MEMORY_CONVERSATION_MISMATCH");
  if (canonicalize(input.previousMemory.catalogAuthority) !== canonicalize(input.catalogAuthority)) throw new ConversationMemoryReductionError("CATALOG_AUTHORITY_CHANGED_DURING_INCREMENTAL_REDUCE");
  if (calculateFingerprintForMemory(input.previousMemory, input.fingerprintPolicy) !== input.previousMemory.memoryFingerprint) throw new ConversationMemoryReductionError("PREVIOUS_MEMORY_FINGERPRINT_INVALID");
  if (calculateDecisionFingerprint(input.previousMemory) !== input.previousMemory.decisionFingerprint) throw new ConversationMemoryReductionError("PREVIOUS_DECISION_FINGERPRINT_INVALID");
  const normalizedEvents = parseConversationEvents(input.appendedEvents);
  validateAppend(input.previousMemory, normalizedEvents);
  return normalizedEvents.reduce((memory, event) => reduceOne(memory, event, input.fingerprintPolicy), input.previousMemory);
}

export function replayConversationMemoryV2(input: {
  readonly conversationId: string;
  readonly events: readonly ConversationEvent[];
  readonly catalogAuthority: CatalogAuthoritySnapshot;
  readonly fingerprintPolicy: FingerprintPolicy;
}): ConversationMemory {
  const initial = emptyMemory(input);
  return reduceConversationMemoryV2({ ...input, previousMemory: initial, appendedEvents: input.events });
}
