import { recommendationEligibilityFor, type AffordabilityEvaluation } from "./affordability";
import type { CandidateEvaluation, CandidateEvaluationSet } from "./candidate";
import type { ConstraintEvent } from "./constraint";
import { VEHICLE_PERSONA_TRAITS } from "./conversationEvent";
import type { PersonaState } from "./conversationMemory";
import type { DecisionTurnResult } from "./decisionTurnResult";
import type { GovernedOffer } from "./offer";
import type { CandidateRejectionEvent } from "./rejection";
import type { CargoVolumeRequirement, RearSeatPreference } from "./usageCargo";

export type DomainInvariantErrorCode =
  | "DUPLICATE_CONSTRAINT_EVENT_ID"
  | "SUPERSESSION_REFERENCE_MISSING"
  | "SUPERSESSION_CYCLE"
  | "SUPERSESSION_LINK_MISMATCH"
  | "SUPERSESSION_FIELD_MISMATCH"
  | "SUPERSESSION_TURN_REGRESSION"
  | "SUPERSEDED_EVENT_STATUS_INVALID"
  | "SUCCESSOR_EVENT_STATUS_INVALID"
  | "MULTIPLE_SUPERSESSION_SUCCESSORS"
  | "NON_TERMINAL_CONSTRAINT_ACTIVE"
  | "FUNCTIONAL_HARD_FILTER_NOT_AUTHORIZED"
  | "GUIDED_APPROXIMATION_HARD_FILTER"
  | "ILLUSTRATIVE_SIGNAL_HAS_DECISION_EFFECT"
  | "PERSONA_HARD_FILTER"
  | "PERSONA_ACTIVE_WITHOUT_TRAITS"
  | "PERSONA_ACTIVATION_SOURCE_INVALID"
  | "PERSONA_TRAIT_OUTSIDE_VOCABULARY"
  | "ELIMINATED_CANDIDATE_MARKED_ELIGIBLE"
  | "PERSONA_CONTRIBUTION_ON_ELIMINATED_CANDIDATE"
  | "ELIMINATED_CANDIDATE_HAS_RANKING_CONTRIBUTIONS"
  | "CANDIDATE_ID_EMPTY"
  | "CANDIDATE_FAMILY_ID_EMPTY"
  | "CANDIDATE_SET_DUPLICATE_VARIANT"
  | "CANDIDATE_BUCKET_OVERLAP"
  | "CANDIDATE_BUCKET_CONTENT_MISMATCH"
  | "CANDIDATE_BUCKET_TOTAL_MISMATCH"
  | "RANKING_SCORE_NOT_FINITE"
  | "RANKING_SCORE_OUT_OF_RANGE"
  | "AFFORDABILITY_COMBINATION_INVALID"
  | "PRICE_WITHOUT_AUTHORITY_MARKED_WITHIN_BUDGET"
  | "PRICE_UNVERIFIED_INCLUDED_IN_BUDGET_INCREASE"
  | "OFFER_CANDIDATE_COUNT_INVALID"
  | "OFFER_DUPLICATE_VARIANT"
  | "OFFER_FAMILY_DIVERSITY_VIOLATION"
  | "OFFER_AUTHORIZATION_ID_EMPTY"
  | "OFFER_DUPLICATE_AUTHORIZATION_ID"
  | "TRIM_COMPARISON_NOT_EXPLICIT"
  | "PRICE_UNVERIFIED_GROUP_NOT_CONSENTED"
  | "PRICE_UNVERIFIED_GROUP_ELIGIBILITY_INVALID"
  | "NORMAL_OFFER_ELIGIBILITY_INVALID"
  | "OFFER_FINGERPRINT_MISSING"
  | "OFFER_EXPIRY_INVALID"
  | "OFFER_EXPIRED"
  | "REJECTION_SCOPE_NOT_EXPLICIT"
  | "REJECTION_SCOPE_ID_MISSING"
  | "REAR_SEAT_SEMANTICS_CONFLATED"
  | "CARGO_POLICY_CLASS_HARD_FILTER"
  | "EXACT_CARGO_REQUIREMENT_INVALID"
  | "REALIZATION_FACT_NOT_AUTHORIZED"
  | "REALIZATION_CANDIDATE_NOT_AUTHORIZED"
  | "MENTIONABLE_CANDIDATE_NOT_SUPPORTED"
  | "REVEALABLE_CANDIDATE_OUTSIDE_OFFER"
  | "RECOMMENDATION_REVEAL_WITHOUT_OFFER"
  | "DIRECT_ANSWER_FACT_NOT_AUTHORIZED"
  | "DIRECT_ANSWER_CANDIDATE_NOT_AUTHORIZED"
  | "DIRECT_ANSWER_PLACEMENT_INVALID"
  | "CONFLICT_FACT_NOT_AUTHORIZED"
  | "MATERIAL_QUESTION_ACTION_MISMATCH";

export interface DomainInvariantError {
  readonly code: DomainInvariantErrorCode;
  readonly referenceId?: string;
}

export type DomainInvariantResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly errors: readonly DomainInvariantError[] };

function result(errors: readonly DomainInvariantError[]): DomainInvariantResult {
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function validateConstraintEvents(events: readonly ConstraintEvent[]): DomainInvariantResult {
  const errors: DomainInvariantError[] = [];
  const byId = new Map<string, ConstraintEvent>();
  const successors = new Map<string, ConstraintEvent[]>();

  for (const event of events) {
    if (byId.has(event.id)) errors.push({ code: "DUPLICATE_CONSTRAINT_EVENT_ID", referenceId: event.id });
    byId.set(event.id, event);
    if (event.supersedesId) successors.set(event.supersedesId, [...(successors.get(event.supersedesId) ?? []), event]);
    if (event.kind === "CONFIRMED_FUNCTIONAL_PREFERENCE" && event.decisionEffect === "HARD_FILTER" && !event.hardFilterPolicy?.allowed) {
      errors.push({ code: "FUNCTIONAL_HARD_FILTER_NOT_AUTHORIZED", referenceId: event.id });
    }
    if (event.kind === "GUIDED_APPROXIMATION" && event.decisionEffect === "HARD_FILTER") {
      errors.push({ code: "GUIDED_APPROXIMATION_HARD_FILTER", referenceId: event.id });
    }
    if (event.kind === "ILLUSTRATIVE_SIGNAL" && !["EXPLANATION_ONLY", "NONE"].includes(event.decisionEffect)) {
      errors.push({ code: "ILLUSTRATIVE_SIGNAL_HAS_DECISION_EFFECT", referenceId: event.id });
    }
    if (event.kind === "PERSONA_PREFERENCE" && event.decisionEffect === "HARD_FILTER") {
      errors.push({ code: "PERSONA_HARD_FILTER", referenceId: event.id });
    }
  }

  for (const [predecessorId, following] of successors) {
    if (following.length > 1) errors.push({ code: "MULTIPLE_SUPERSESSION_SUCCESSORS", referenceId: predecessorId });
  }

  for (const event of events) {
    const predecessor = event.supersedesId ? byId.get(event.supersedesId) : undefined;
    const successor = event.supersededById ? byId.get(event.supersededById) : undefined;
    if (event.supersedesId && !predecessor) errors.push({ code: "SUPERSESSION_REFERENCE_MISSING", referenceId: event.id });
    if (event.supersededById && !successor) errors.push({ code: "SUPERSESSION_REFERENCE_MISSING", referenceId: event.id });
    if (predecessor) {
      if (predecessor.supersededById !== event.id) errors.push({ code: "SUPERSESSION_LINK_MISMATCH", referenceId: event.id });
      if (predecessor.field !== event.field) errors.push({ code: "SUPERSESSION_FIELD_MISMATCH", referenceId: event.id });
      if (event.sourceTurn < predecessor.sourceTurn) errors.push({ code: "SUPERSESSION_TURN_REGRESSION", referenceId: event.id });
      if (predecessor.status !== "SUPERSEDED") errors.push({ code: "SUPERSEDED_EVENT_STATUS_INVALID", referenceId: predecessor.id });
      if (!["ACTIVE", "DECLINED"].includes(event.status)) errors.push({ code: "SUCCESSOR_EVENT_STATUS_INVALID", referenceId: event.id });
    }
    if (successor && successor.supersedesId !== event.id) errors.push({ code: "SUPERSESSION_LINK_MISMATCH", referenceId: event.id });
    if (event.supersededById && event.status !== "SUPERSEDED") errors.push({ code: "SUPERSEDED_EVENT_STATUS_INVALID", referenceId: event.id });
    if (!event.supersededById && event.status === "SUPERSEDED") errors.push({ code: "NON_TERMINAL_CONSTRAINT_ACTIVE", referenceId: event.id });

    const visited = new Set<string>();
    let cursor: ConstraintEvent | undefined = event;
    while (cursor?.supersedesId) {
      if (visited.has(cursor.id)) {
        errors.push({ code: "SUPERSESSION_CYCLE", referenceId: event.id });
        break;
      }
      visited.add(cursor.id);
      cursor = byId.get(cursor.supersedesId);
    }
  }
  return result(errors);
}

export function validatePersonaState(persona: PersonaState): DomainInvariantResult {
  if (!persona.activated) return { ok: true };
  const errors: DomainInvariantError[] = [];
  if (persona.requestedTraits.length === 0) errors.push({ code: "PERSONA_ACTIVE_WITHOUT_TRAITS" });
  if (!["USER_EXPLICIT", "ADVISOR_PROMPT_RESPONSE"].includes(persona.activationSource)) {
    errors.push({ code: "PERSONA_ACTIVATION_SOURCE_INVALID", referenceId: persona.activationSource });
  }
  const vocabulary = new Set<string>(VEHICLE_PERSONA_TRAITS);
  for (const trait of persona.requestedTraits) {
    if (!vocabulary.has(trait)) errors.push({ code: "PERSONA_TRAIT_OUTSIDE_VOCABULARY", referenceId: trait });
  }
  return result(errors);
}

export function validateAffordabilityEvaluation(input: {
  readonly technicalEligibility: CandidateEvaluation["technicalEligibility"];
  readonly affordability: AffordabilityEvaluation;
}): DomainInvariantResult {
  const errors: DomainInvariantError[] = [];
  const { affordability } = input;
  if (["UNKNOWN", "INTERNAL_ESTIMATE"].includes(affordability.priceAuthorityState)
    && affordability.budgetDisposition === "CONFIRMED_WITHIN_BUDGET") {
    errors.push({ code: "PRICE_WITHOUT_AUTHORITY_MARKED_WITHIN_BUDGET" });
  }
  if (["UNKNOWN", "INTERNAL_ESTIMATE"].includes(affordability.priceAuthorityState)
    && affordability.includedInMinimumBudgetIncrease) {
    errors.push({ code: "PRICE_UNVERIFIED_INCLUDED_IN_BUDGET_INCREASE" });
  }
  const expected = recommendationEligibilityFor({
    technicalEligibility: input.technicalEligibility,
    priceAuthorityState: affordability.priceAuthorityState,
    budgetDisposition: affordability.budgetDisposition,
  });
  if (affordability.recommendationEligibility !== expected) errors.push({ code: "AFFORDABILITY_COMBINATION_INVALID" });
  if (affordability.recommendationEligibility === "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED"
    && (affordability.affordabilityClaimAllowed || !affordability.requiresUnverifiedGroupConsent)) {
    errors.push({ code: "AFFORDABILITY_COMBINATION_INVALID" });
  }
  return result(errors);
}

export function validateCandidateEvaluations(candidates: readonly CandidateEvaluation[]): DomainInvariantResult {
  const errors: DomainInvariantError[] = [];
  for (const candidate of candidates) {
    if (isBlank(candidate.exactVariantId)) errors.push({ code: "CANDIDATE_ID_EMPTY" });
    if (isBlank(candidate.modelFamilyId)) errors.push({ code: "CANDIDATE_FAMILY_ID_EMPTY", referenceId: candidate.exactVariantId });
    if (candidate.technicalEligibility === "ELIMINATED") {
      if (candidate.affordability.recommendationEligibility !== "INELIGIBLE") {
        errors.push({ code: "ELIMINATED_CANDIDATE_MARKED_ELIGIBLE", referenceId: candidate.exactVariantId });
      }
      if (candidate.rankingContributions.length > 0) {
        errors.push({ code: "ELIMINATED_CANDIDATE_HAS_RANKING_CONTRIBUTIONS", referenceId: candidate.exactVariantId });
      }
      if (candidate.rankingContributions.some((contribution) => contribution.source === "PERSONA")) {
        errors.push({ code: "PERSONA_CONTRIBUTION_ON_ELIMINATED_CANDIDATE", referenceId: candidate.exactVariantId });
      }
    }
    for (const contribution of candidate.rankingContributions) {
      if (!Number.isFinite(contribution.score)) errors.push({ code: "RANKING_SCORE_NOT_FINITE", referenceId: candidate.exactVariantId });
      else if (contribution.score < -1 || contribution.score > 1) errors.push({ code: "RANKING_SCORE_OUT_OF_RANGE", referenceId: candidate.exactVariantId });
    }
    const affordabilityResult = validateAffordabilityEvaluation({
      technicalEligibility: candidate.technicalEligibility,
      affordability: candidate.affordability,
    });
    if (!affordabilityResult.ok) errors.push(...affordabilityResult.errors.map((error) => ({ ...error, referenceId: candidate.exactVariantId })));
  }
  return result(errors);
}

export function validateCandidateEvaluationSet(candidateSet: CandidateEvaluationSet): DomainInvariantResult {
  const errors: DomainInvariantError[] = [];
  const ids = candidateSet.candidates.map((candidate) => candidate.exactVariantId);
  if (new Set(ids).size !== ids.length) errors.push({ code: "CANDIDATE_SET_DUPLICATE_VARIANT" });
  const buckets = [candidateSet.fullyEligibleCandidateIds, candidateSet.priceUnverifiedCandidateIds, candidateSet.ineligibleCandidateIds];
  const flattened = buckets.flat();
  if (new Set(flattened).size !== flattened.length) errors.push({ code: "CANDIDATE_BUCKET_OVERLAP" });
  if (new Set(flattened).size !== new Set(ids).size || flattened.some((id) => !ids.includes(id))) errors.push({ code: "CANDIDATE_BUCKET_TOTAL_MISMATCH" });
  const byId = new Map(candidateSet.candidates.map((candidate) => [candidate.exactVariantId, candidate] as const));
  for (const id of candidateSet.fullyEligibleCandidateIds) if (byId.get(id)?.affordability.recommendationEligibility !== "FULLY_ELIGIBLE") errors.push({ code: "CANDIDATE_BUCKET_CONTENT_MISMATCH", referenceId: id });
  for (const id of candidateSet.priceUnverifiedCandidateIds) if (byId.get(id)?.affordability.recommendationEligibility !== "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED") errors.push({ code: "CANDIDATE_BUCKET_CONTENT_MISMATCH", referenceId: id });
  for (const id of candidateSet.ineligibleCandidateIds) if (byId.get(id)?.affordability.recommendationEligibility !== "INELIGIBLE") errors.push({ code: "CANDIDATE_BUCKET_CONTENT_MISMATCH", referenceId: id });
  const candidateResult = validateCandidateEvaluations(candidateSet.candidates);
  if (!candidateResult.ok) errors.push(...candidateResult.errors);
  return result(errors);
}

export function validateGovernedOffer(offer: GovernedOffer, now = new Date()): DomainInvariantResult {
  const errors: DomainInvariantError[] = [];
  if (offer.candidates.length < 1 || offer.candidates.length > 3) errors.push({ code: "OFFER_CANDIDATE_COUNT_INVALID", referenceId: offer.offerId });
  const variants = offer.candidates.map((candidate) => candidate.exactVariantId);
  if (new Set(variants).size !== variants.length) errors.push({ code: "OFFER_DUPLICATE_VARIANT", referenceId: offer.offerId });
  const authorizationIds = offer.candidates.map((candidate) => candidate.authorizationId);
  if (authorizationIds.some(isBlank)) errors.push({ code: "OFFER_AUTHORIZATION_ID_EMPTY", referenceId: offer.offerId });
  if (new Set(authorizationIds).size !== authorizationIds.length) errors.push({ code: "OFFER_DUPLICATE_AUTHORIZATION_ID", referenceId: offer.offerId });
  if (offer.mode === "FAMILY_DIVERSE") {
    const families = offer.candidates.map((candidate) => candidate.modelFamilyId);
    if (new Set(families).size !== families.length) errors.push({ code: "OFFER_FAMILY_DIVERSITY_VIOLATION", referenceId: offer.offerId });
  }
  if (offer.mode !== "PRICE_UNVERIFIED_ALTERNATIVES"
    && offer.candidates.some((candidate) => candidate.eligibility !== "FULLY_ELIGIBLE")) {
    errors.push({ code: "NORMAL_OFFER_ELIGIBILITY_INVALID", referenceId: offer.offerId });
  }
  if (offer.mode === "TRIM_COMPARISON" && !offer.explicitTrimComparisonRequested) errors.push({ code: "TRIM_COMPARISON_NOT_EXPLICIT", referenceId: offer.offerId });
  if (offer.mode === "PRICE_UNVERIFIED_ALTERNATIVES") {
    if (!offer.explicitPriceUnverifiedConsent) errors.push({ code: "PRICE_UNVERIFIED_GROUP_NOT_CONSENTED", referenceId: offer.offerId });
    if (offer.candidates.some((candidate) => candidate.eligibility !== "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED")) {
      errors.push({ code: "PRICE_UNVERIFIED_GROUP_ELIGIBILITY_INVALID", referenceId: offer.offerId });
    }
  }
  if (isBlank(offer.catalogFingerprint) || isBlank(offer.decisionFingerprint)) errors.push({ code: "OFFER_FINGERPRINT_MISSING", referenceId: offer.offerId });
  const expiresAt = new Date(offer.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.toISOString() !== offer.expiresAt) errors.push({ code: "OFFER_EXPIRY_INVALID", referenceId: offer.offerId });
  else if (expiresAt.getTime() <= now.getTime()) errors.push({ code: "OFFER_EXPIRED", referenceId: offer.offerId });
  return result(errors);
}

export function validateRejectionEvent(event: CandidateRejectionEvent): DomainInvariantResult {
  const errors: DomainInvariantError[] = [];
  if (event.scope !== "EXACT_VARIANT" && !event.scopeExplicitlyRequested) errors.push({ code: "REJECTION_SCOPE_NOT_EXPLICIT", referenceId: event.id });
  if (event.scope === "EXACT_VARIANT" && !event.candidateId) errors.push({ code: "REJECTION_SCOPE_ID_MISSING", referenceId: event.id });
  if (event.scope === "MODEL_FAMILY" && !event.familyId) errors.push({ code: "REJECTION_SCOPE_ID_MISSING", referenceId: event.id });
  if (event.scope === "BRAND" && !event.brandId) errors.push({ code: "REJECTION_SCOPE_ID_MISSING", referenceId: event.id });
  return result(errors);
}

export function validateRearSeatPreference(preference: RearSeatPreference): DomainInvariantResult {
  return preference.requirement === "NOT_NEEDED" && preference.presenceConstraint === "MUST_NOT_HAVE"
    ? { ok: false, errors: [{ code: "REAR_SEAT_SEMANTICS_CONFLATED" }] }
    : { ok: true };
}

export function validateCargoVolumeRequirement(requirement: CargoVolumeRequirement): DomainInvariantResult {
  if (requirement.mode === "POLICY_CLASS" && requirement.decisionEffect === ("HARD_FILTER" as never)) {
    return { ok: false, errors: [{ code: "CARGO_POLICY_CLASS_HARD_FILTER" }] };
  }
  if (requirement.mode === "EXACT_MINIMUM" && (!Number.isFinite(requirement.minimumLitres) || requirement.minimumLitres <= 0)) {
    return { ok: false, errors: [{ code: "EXACT_CARGO_REQUIREMENT_INVALID" }] };
  }
  return { ok: true };
}

export function validateDecisionTurnResult(turn: DecisionTurnResult): DomainInvariantResult {
  const errors: DomainInvariantError[] = [];
  const questionAction = turn.nextAction.type === "ASK_MATERIAL_QUESTION";
  if (questionAction !== (turn.materialQuestion !== null)) errors.push({ code: "MATERIAL_QUESTION_ACTION_MISMATCH" });
  const visibleFactIds = new Set(turn.explanationFacts.filter((fact) => fact.userVisible).map((fact) => fact.id));
  for (const id of turn.realization.authorizedExplanationFactIds) {
    if (!visibleFactIds.has(id)) errors.push({ code: "REALIZATION_FACT_NOT_AUTHORIZED", referenceId: id });
  }
  const offeredIds = new Set(turn.offer?.candidates.map((candidate) => candidate.exactVariantId) ?? []);
  const factCandidateIds = new Set(turn.explanationFacts.flatMap((fact) => fact.candidateIds ?? []));
  for (const id of turn.realization.mentionableCandidateIds) {
    if (!factCandidateIds.has(id) && !offeredIds.has(id)) errors.push({ code: "MENTIONABLE_CANDIDATE_NOT_SUPPORTED", referenceId: id });
  }
  for (const id of turn.realization.revealableCandidateIds) {
    if (!offeredIds.has(id)) errors.push({ code: "REVEALABLE_CANDIDATE_OUTSIDE_OFFER", referenceId: id });
  }
  if (turn.nextAction.type === "REVEAL_AUTHORIZED_CARDS" && !turn.offer) errors.push({ code: "RECOMMENDATION_REVEAL_WITHOUT_OFFER" });
  const direct = turn.directAnswerObligation;
  if (direct) {
    if (direct.placement !== "BEFORE_MATERIAL_QUESTION" || turn.realization.directAnswerPlacement !== "BEFORE_MATERIAL_QUESTION") {
      errors.push({ code: "DIRECT_ANSWER_PLACEMENT_INVALID" });
    }
    for (const id of direct.authorizedExplanationFactIds) {
      if (!visibleFactIds.has(id)) errors.push({ code: "DIRECT_ANSWER_FACT_NOT_AUTHORIZED", referenceId: id });
    }
    for (const id of direct.authorizedCandidateIds) {
      if (!turn.realization.mentionableCandidateIds.includes(id)) errors.push({ code: "DIRECT_ANSWER_CANDIDATE_NOT_AUTHORIZED", referenceId: id });
    }
  }
  for (const id of turn.conflictAnalysis?.authorizedConflictFactIds ?? []) {
    if (!visibleFactIds.has(id)) errors.push({ code: "CONFLICT_FACT_NOT_AUTHORIZED", referenceId: id });
  }
  return result(errors);
}
