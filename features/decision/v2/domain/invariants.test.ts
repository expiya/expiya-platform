import { describe, expect, it } from "vitest";

import type { AffordabilityEvaluation } from "./affordability";
import { recommendationEligibilityFor } from "./affordability";
import type { CandidateEvaluation, CandidateEvaluationSet } from "./candidate";
import type { ConstraintEvent } from "./constraint";
import { createConstraintEvent } from "./constraint";
import type { PersonaState } from "./conversationMemory";
import type { DecisionTurnResult } from "./decisionTurnResult";
import type { GovernedOffer } from "./offer";
import {
  validateAffordabilityEvaluation,
  validateCandidateEvaluations,
  validateCargoVolumeRequirement,
  validateConstraintEvents,
  validateDecisionTurnResult,
  validateGovernedOffer,
  validatePersonaState,
  validateRearSeatPreference,
  validateRejectionEvent,
} from "./invariants";
import { CARGO_CAPACITY_BAND_POLICY_V1 } from "./usageCargo";

const CREATED_AT = "2026-08-16T10:00:00.000Z";
const VALIDATION_NOW = new Date("2026-08-16T11:00:00.000Z");

function constraint(overrides: Partial<ConstraintEvent> = {}): ConstraintEvent {
  return {
    schemaVersion: 1,
    conversationId: "conversation-1",
    eventType: "CONSTRAINT",
    id: "constraint-1",
    kind: "SOFT_PREFERENCE",
    field: "usage",
    normalizedValue: "value",
    sourceMessageId: "message-1",
    sourceText: "source",
    sourceTurn: 1,
    sequence: 0,
    createdAt: CREATED_AT,
    confidence: 1,
    authority: "USER_EXPLICIT",
    decisionEffect: "SOFT_RANK",
    status: "ACTIVE",
    ...overrides,
  };
}

function affordability(overrides: Partial<AffordabilityEvaluation> = {}): AffordabilityEvaluation {
  return {
    priceAuthorityState: "VERIFIED_CURRENT",
    budgetDisposition: "CONFIRMED_WITHIN_BUDGET",
    recommendationEligibility: "FULLY_ELIGIBLE",
    affordabilityClaimAllowed: true,
    includedInMinimumBudgetIncrease: true,
    requiresUnverifiedGroupConsent: false,
    ...overrides,
  };
}

function candidate(overrides: Partial<CandidateEvaluation> = {}): CandidateEvaluation {
  return {
    exactVariantId: "variant-1",
    modelFamilyId: "family-1",
    technicalEligibility: "ELIGIBLE",
    affordability: affordability(),
    rankingContributions: [],
    eliminationReasonCodes: [],
    ...overrides,
  };
}

function candidateRef(index = 1, familyIndex = index) {
  return {
    exactVariantId: `variant-${index}`,
    modelFamilyId: `family-${familyIndex}`,
    authorizationId: `auth-${index}`,
    eligibility: "FULLY_ELIGIBLE" as const,
  };
}

function offer(overrides: Partial<GovernedOffer> = {}): GovernedOffer {
  return {
    offerId: "offer-1",
    mode: "FAMILY_DIVERSE",
    candidates: [candidateRef()],
    explicitTrimComparisonRequested: false,
    explicitPriceUnverifiedConsent: false,
    catalogFingerprint: "catalog-fingerprint",
    decisionFingerprint: "decision-fingerprint",
    expiresAt: "2026-08-16T12:00:00.000Z",
    lifecycleState: "CREATED",
    ...overrides,
  };
}

function evaluationSet(candidates: readonly CandidateEvaluation[] = []): CandidateEvaluationSet {
  return {
    evaluatedFromCatalogFingerprint: "catalog-fingerprint",
    initialCandidateIds: candidates.map((item) => item.exactVariantId),
    candidates,
    fullyEligibleCandidateIds: candidates.filter((item) => item.affordability.recommendationEligibility === "FULLY_ELIGIBLE").map((item) => item.exactVariantId),
    priceUnverifiedCandidateIds: candidates.filter((item) => item.affordability.recommendationEligibility === "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED").map((item) => item.exactVariantId),
    ineligibleCandidateIds: candidates.filter((item) => item.affordability.recommendationEligibility === "INELIGIBLE").map((item) => item.exactVariantId),
  };
}

function turn(overrides: Partial<DecisionTurnResult> = {}): DecisionTurnResult {
  return {
    state: "UNDERSTANDING_NEEDS",
    nextAction: { type: "ASK_MATERIAL_QUESTION" },
    directAnswerObligation: null,
    memoryEvents: [],
    candidateEvaluation: evaluationSet(),
    conflictAnalysis: null,
    materialQuestion: {
      id: "question-1",
      stableSemanticKey: "usage.primary",
      field: "usage",
      promptIntent: "CLARIFY_REQUIREMENT",
      options: [],
      answerCapabilities: ["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"],
      materialityReason: "The answer can change eligibility.",
    },
    offer: null,
    explanationFacts: [{
      id: "fact-1",
      kind: "LIMITATION",
      value: "bounded",
      authorityReference: "policy-1",
      userVisible: true,
    }],
    realization: {
      authorizedExplanationFactIds: ["fact-1"],
      prohibitedClaims: [],
      mentionableCandidateIds: [],
      revealableCandidateIds: [],
      directAnswerPlacement: "BEFORE_MATERIAL_QUESTION",
    },
    trace: {
      turn: 1,
      catalogFingerprint: "catalog-fingerprint",
      memoryFingerprint: "memory-fingerprint", decisionFingerprint: "decision-fingerprint",
      policyReferences: [],
    },
    ...overrides,
  };
}

function codes(value: { readonly ok: true } | { readonly ok: false; readonly errors: readonly { readonly code: string }[] }): readonly string[] {
  return value.ok ? [] : value.errors.map((error) => error.code);
}

describe("V2 constraint events", () => {
  it("deep-clones and deeply freezes nested normalized values", () => {
    const nested = { scenarios: [{ name: "delivery", weights: [1, 2] }] };
    const event = createConstraintEvent(constraint({ normalizedValue: nested }));
    nested.scenarios[0]!.weights.push(3);

    expect(event.normalizedValue).toEqual({ scenarios: [{ name: "delivery", weights: [1, 2] }] });
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen((event.normalizedValue as typeof nested).scenarios[0]!.weights)).toBe(true);
  });

  it("accepts a consistent append-only supersession chain", () => {
    const first = constraint({ id: "first", status: "SUPERSEDED", supersededById: "second" });
    const second = constraint({ id: "second", sourceTurn: 2, supersedesId: "first" });
    expect(validateConstraintEvents([first, second])).toEqual({ ok: true });
  });

  it("rejects duplicate event identity and supersession cycles", () => {
    const first = constraint({ id: "first", status: "SUPERSEDED", supersedesId: "second", supersededById: "second" });
    const second = constraint({ id: "second", status: "SUPERSEDED", supersedesId: "first", supersededById: "first" });
    const result = validateConstraintEvents([first, second, first]);
    expect(codes(result)).toContain("DUPLICATE_CONSTRAINT_EVENT_ID");
    expect(codes(result)).toContain("SUPERSESSION_CYCLE");
  });

  it("does not allow different fields to supersede each other", () => {
    const first = constraint({ id: "first", field: "body", status: "SUPERSEDED", supersededById: "second" });
    const second = constraint({ id: "second", field: "fuel", sourceTurn: 2, supersedesId: "first" });
    expect(codes(validateConstraintEvents([first, second]))).toContain("SUPERSESSION_FIELD_MISMATCH");
  });

  it("does not allow an older turn to supersede a newer turn", () => {
    const first = constraint({ id: "first", sourceTurn: 3, status: "SUPERSEDED", supersededById: "second" });
    const second = constraint({ id: "second", sourceTurn: 2, supersedesId: "first" });
    expect(codes(validateConstraintEvents([first, second]))).toContain("SUPERSESSION_TURN_REGRESSION");
  });

  it("requires superseded records to have SUPERSEDED status", () => {
    const first = constraint({ id: "first", status: "ACTIVE", supersededById: "second" });
    const second = constraint({ id: "second", sourceTurn: 2, supersedesId: "first" });
    expect(codes(validateConstraintEvents([first, second]))).toContain("SUPERSEDED_EVENT_STATUS_INVALID");
  });

  it("rejects mismatched bidirectional supersession links", () => {
    const first = constraint({ id: "first", status: "SUPERSEDED", supersededById: "third" });
    const second = constraint({ id: "second", sourceTurn: 2, supersedesId: "first" });
    expect(codes(validateConstraintEvents([first, second]))).toContain("SUPERSESSION_LINK_MISMATCH");
  });

  it("rejects multiple successors and keeps only the terminal record active", () => {
    const first = constraint({ id: "first", status: "SUPERSEDED", supersededById: "second" });
    const second = constraint({ id: "second", sourceTurn: 2, supersedesId: "first" });
    const third = constraint({ id: "third", sourceTurn: 3, supersedesId: "first" });
    expect(codes(validateConstraintEvents([first, second, third]))).toContain("MULTIPLE_SUPERSESSION_SUCCESSORS");
  });

  it("requires policy permission for hard functional preferences", () => {
    const unauthorized = constraint({ kind: "CONFIRMED_FUNCTIONAL_PREFERENCE", decisionEffect: "HARD_FILTER" });
    const authorized = constraint({
      kind: "CONFIRMED_FUNCTIONAL_PREFERENCE",
      decisionEffect: "HARD_FILTER",
      hardFilterPolicy: { allowed: true, policyId: "field-policy", policyVersion: "1", fieldAuthority: "CATALOG_VERIFIED" },
    });
    expect(codes(validateConstraintEvents([unauthorized]))).toContain("FUNCTIONAL_HARD_FILTER_NOT_AUTHORIZED");
    expect(validateConstraintEvents([authorized])).toEqual({ ok: true });
  });

  it("prevents guided, illustrative, and persona signals from forbidden effects", () => {
    const result = validateConstraintEvents([
      constraint({ id: "guided", kind: "GUIDED_APPROXIMATION", decisionEffect: "HARD_FILTER" }),
      constraint({ id: "illustrative", kind: "ILLUSTRATIVE_SIGNAL", decisionEffect: "SOFT_RANK" }),
      constraint({ id: "persona", kind: "PERSONA_PREFERENCE", decisionEffect: "HARD_FILTER" }),
    ]);
    expect(codes(result)).toEqual(expect.arrayContaining([
      "GUIDED_APPROXIMATION_HARD_FILTER",
      "ILLUSTRATIVE_SIGNAL_HAS_DECISION_EFFECT",
      "PERSONA_HARD_FILTER",
    ]));
  });
});

describe("V2 persona contracts", () => {
  it("requires an active persona to contain at least one trait", () => {
    const invalid = { activated: true, activationSource: "USER_EXPLICIT", requestedTraits: [], sourceTurn: 1 } as unknown as PersonaState;
    expect(codes(validatePersonaState(invalid))).toContain("PERSONA_ACTIVE_WITHOUT_TRAITS");
  });

  it("rejects a persona trait outside the closed vocabulary", () => {
    const invalid = { activated: true, activationSource: "USER_EXPLICIT", requestedTraits: ["FREE_TEXT_TRAIT"], sourceTurn: 1 } as unknown as PersonaState;
    expect(codes(validatePersonaState(invalid))).toContain("PERSONA_TRAIT_OUTSIDE_VOCABULARY");
  });

  it("accepts only explicitly sourced typed persona traits", () => {
    const active: PersonaState = { activated: true, activationSource: "ADVISOR_PROMPT_RESPONSE", requestedTraits: ["DESIGN"], sourceTurn: 1 };
    expect(validatePersonaState(active)).toEqual({ ok: true });
  });

  it("rejects a non-explicit persona activation source at the runtime boundary", () => {
    const invalid = { activated: true, activationSource: "INFERRED_FROM_TONE", requestedTraits: ["DESIGN"], sourceTurn: 1 } as unknown as PersonaState;
    expect(codes(validatePersonaState(invalid))).toContain("PERSONA_ACTIVATION_SOURCE_INVALID");
  });
});

describe("V2 affordability and candidate invariants", () => {
  it("does not infer within-budget from verified-current price authority", () => {
    expect(recommendationEligibilityFor({
      technicalEligibility: "ELIGIBLE",
      priceAuthorityState: "VERIFIED_CURRENT",
      budgetDisposition: "NOT_EVALUABLE",
    })).toBe("INELIGIBLE");
  });

  it.each(["UNKNOWN", "INTERNAL_ESTIMATE"] as const)("does not accept %s as confirmed within budget", (priceAuthorityState) => {
    const result = validateAffordabilityEvaluation({
      technicalEligibility: "ELIGIBLE",
      affordability: affordability({ priceAuthorityState, budgetDisposition: "CONFIRMED_WITHIN_BUDGET" }),
    });
    expect(codes(result)).toContain("PRICE_WITHOUT_AUTHORITY_MARKED_WITHIN_BUDGET");
  });

  it("keeps price-unverified technical eligibility distinct", () => {
    const unverified = candidate({
      affordability: affordability({
        priceAuthorityState: "UNKNOWN",
        budgetDisposition: "NOT_EVALUABLE",
        recommendationEligibility: "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED",
        affordabilityClaimAllowed: false,
        includedInMinimumBudgetIncrease: false,
        requiresUnverifiedGroupConsent: true,
      }),
    });
    expect(validateCandidateEvaluations([candidate(), unverified])).toEqual({ ok: true });
  });

  it("uses the general eliminated eligibility error without a false persona error", () => {
    const result = validateCandidateEvaluations([candidate({
      technicalEligibility: "ELIMINATED",
      affordability: affordability({ recommendationEligibility: "FULLY_ELIGIBLE" }),
    })]);
    expect(codes(result)).toContain("ELIMINATED_CANDIDATE_MARKED_ELIGIBLE");
    expect(codes(result)).not.toContain("PERSONA_CONTRIBUTION_ON_ELIMINATED_CANDIDATE");
  });

  it("reports persona contribution separately on an eliminated candidate", () => {
    const result = validateCandidateEvaluations([candidate({
      technicalEligibility: "ELIMINATED",
      affordability: affordability({ recommendationEligibility: "INELIGIBLE", affordabilityClaimAllowed: false }),
      rankingContributions: [{ source: "PERSONA", score: 0.5 }],
    })]);
    expect(codes(result)).toEqual(expect.arrayContaining([
      "ELIMINATED_CANDIDATE_HAS_RANKING_CONTRIBUTIONS",
      "PERSONA_CONTRIBUTION_ON_ELIMINATED_CANDIDATE",
    ]));
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("rejects non-finite ranking score %s", (score) => {
    expect(codes(validateCandidateEvaluations([candidate({ rankingContributions: [{ source: "VALUE", score }] })]))).toContain("RANKING_SCORE_NOT_FINITE");
  });

  it.each([-1.01, 1.01])("rejects out-of-range ranking score %s", (score) => {
    expect(codes(validateCandidateEvaluations([candidate({ rankingContributions: [{ source: "VALUE", score }] })]))).toContain("RANKING_SCORE_OUT_OF_RANGE");
  });

  it("rejects blank exact variant and family identifiers", () => {
    const result = validateCandidateEvaluations([candidate({ exactVariantId: " ", modelFamilyId: "" })]);
    expect(codes(result)).toEqual(expect.arrayContaining(["CANDIDATE_ID_EMPTY", "CANDIDATE_FAMILY_ID_EMPTY"]));
  });
});

describe("V2 offers and rejection scope", () => {
  it("accepts one to three unique exact variants with family diversity and fingerprints", () => {
    expect(validateGovernedOffer(offer({ candidates: [candidateRef(1), candidateRef(2), candidateRef(3)] }), VALIDATION_NOW)).toEqual({ ok: true });
  });

  it("rejects duplicate variants and repeated families in a normal offer", () => {
    const result = validateGovernedOffer(offer({ candidates: [candidateRef(1), { ...candidateRef(2, 1), exactVariantId: "variant-1" }] }), VALIDATION_NOW);
    expect(codes(result)).toEqual(expect.arrayContaining(["OFFER_DUPLICATE_VARIANT", "OFFER_FAMILY_DIVERSITY_VIOLATION"]));
  });

  it("allows same-family trims only after an explicit trim-comparison request", () => {
    const candidates = [candidateRef(1, 1), candidateRef(2, 1)];
    expect(validateGovernedOffer(offer({ mode: "TRIM_COMPARISON", candidates }), VALIDATION_NOW).ok).toBe(false);
    expect(validateGovernedOffer(offer({ mode: "TRIM_COMPARISON", candidates, explicitTrimComparisonRequested: true }), VALIDATION_NOW)).toEqual({ ok: true });
  });

  it("requires consent and eligibility references for price-unverified alternatives", () => {
    const unverified = [{ ...candidateRef(), eligibility: "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED" as const }];
    expect(validateGovernedOffer(offer({ mode: "PRICE_UNVERIFIED_ALTERNATIVES", candidates: unverified }), VALIDATION_NOW).ok).toBe(false);
    expect(validateGovernedOffer(offer({ mode: "PRICE_UNVERIFIED_ALTERNATIVES", candidates: unverified, explicitPriceUnverifiedConsent: true }), VALIDATION_NOW)).toEqual({ ok: true });
  });

  it("keeps price-unverified candidates out of normal offers", () => {
    const candidates = [{ ...candidateRef(), eligibility: "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED" as const }];
    expect(codes(validateGovernedOffer(offer({ candidates }), VALIDATION_NOW))).toContain("NORMAL_OFFER_ELIGIBILITY_INVALID");
  });

  it("rejects duplicate or blank authorization IDs", () => {
    const result = validateGovernedOffer(offer({ candidates: [candidateRef(1), { ...candidateRef(2), authorizationId: "auth-1" }, { ...candidateRef(3), authorizationId: " " }] }), VALIDATION_NOW);
    expect(codes(result)).toEqual(expect.arrayContaining(["OFFER_DUPLICATE_AUTHORIZATION_ID", "OFFER_AUTHORIZATION_ID_EMPTY"]));
  });

  it("rejects invalid and expired timestamps with an injected clock", () => {
    expect(codes(validateGovernedOffer(offer({ expiresAt: "not-an-iso-date" }), VALIDATION_NOW))).toContain("OFFER_EXPIRY_INVALID");
    expect(codes(validateGovernedOffer(offer({ expiresAt: "2026-08-16T10:59:59.000Z" }), VALIDATION_NOW))).toContain("OFFER_EXPIRED");
  });

  it("rejects whitespace-only fingerprints", () => {
    expect(codes(validateGovernedOffer(offer({ catalogFingerprint: " ", decisionFingerprint: "\t" }), VALIDATION_NOW))).toContain("OFFER_FINGERPRINT_MISSING");
  });

  it("does not widen an exact rejection without explicit family or brand scope", () => {
    const exact = {
      schemaVersion: 1 as const,
      conversationId: "conversation-1",
      eventType: "CANDIDATE_REJECTION" as const,
      id: "reject-1",
      candidateId: "variant-1",
      scope: "EXACT_VARIANT" as const,
      reason: "UNSPECIFIED" as const,
      scopeExplicitlyRequested: false,
      sourceMessageId: "message-1",
      sourceTurn: 1,
      sequence: 0,
      createdAt: CREATED_AT,
    };
    expect(validateRejectionEvent(exact)).toEqual({ ok: true });
    expect(validateRejectionEvent({ ...exact, id: "reject-2", scope: "MODEL_FAMILY", familyId: "family-1" }).ok).toBe(false);
  });
});

describe("V2 usage, question, memory, and turn contracts", () => {
  it("keeps rear-seat need separate from physical presence", () => {
    expect(validateRearSeatPreference({ requirement: "NOT_NEEDED", presenceConstraint: "NO_CONSTRAINT" })).toEqual({ ok: true });
    expect(validateRearSeatPreference({ requirement: "NOT_NEEDED", presenceConstraint: "MUST_NOT_HAVE" }).ok).toBe(false);
  });

  it("keeps versioned cargo bands soft and exact minimum cargo hard", () => {
    expect(CARGO_CAPACITY_BAND_POLICY_V1).toMatchObject({ canonicalVehicleFact: false, ownerEditorialVehicleLabel: false });
    expect(validateCargoVolumeRequirement({
      mode: "POLICY_CLASS", capacityClass: "COMPACT_CARGO", decisionEffect: "STRONG_RANK",
      policyId: "cargo-capacity-bands", policyVersion: "1", policySource: "product-policy",
    })).toEqual({ ok: true });
    expect(validateCargoVolumeRequirement({
      mode: "EXACT_MINIMUM", minimumLitres: 4_000, decisionEffect: "HARD_FILTER",
      authority: "USER_EXPLICIT", catalogFieldAuthority: "CATALOG_VERIFIED",
    })).toEqual({ ok: true });
  });

  it("keeps available cash separate from a hard ceiling", () => {
    const budget: import("./budget").BudgetState = {
      availableCash: { amount: 2_000_000, currency: "TRY" },
      financeFlexibility: "POSSIBLE",
      unresolvedFinancedCeiling: true,
      budgetImportance: "IMPORTANT",
      budgetUnknown: false,
      budgetExcluded: false,
    };
    expect(budget.maximumHardCeiling).toBeUndefined();
  });

  it("carries stable question semantics and candidate-pool option provenance", () => {
    const question: import("./decisionState").MaterialQuestion = {
      id: "question-1",
      stableSemanticKey: "usage.cargo-orientation",
      field: "usageOrientation",
      promptIntent: "DISCRIMINATE_CANDIDATES",
      options: [{
        id: "cargo",
        semanticValue: "CARGO_PRIORITY", userFacingLabel: "Yük öncelikli",
        provenance: {
          source: "CURRENT_CANDIDATE_POOL",
          candidatePoolFingerprint: "pool-fingerprint",
          supportingCandidateIds: ["variant-1"],
          authorityReference: "catalog-fingerprint",
        },
      }],
      answerCapabilities: ["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"],
      materialityReason: "Changes ranking.",
    };
    expect(question.stableSemanticKey).toBe("usage.cargo-orientation");
    expect(question.options[0]?.provenance.source).toBe("CURRENT_CANDIDATE_POOL");
  });

  it("represents direct-answer obligation before any material question", () => {
    const result = turn({
      directAnswerObligation: {
        kind: "MODEL_AVAILABILITY",
        sourceMessageId: "message-1",
        authorizedExplanationFactIds: ["fact-1"],
        authorizedCandidateIds: [],
        placement: "BEFORE_MATERIAL_QUESTION",
      },
    });
    expect(validateDecisionTurnResult(result)).toEqual({ ok: true });
    expect(result.directAnswerObligation?.placement).toBe("BEFORE_MATERIAL_QUESTION");
  });

  it("represents inclusion-minimal conflict and relaxation references", () => {
    const result = turn({
      state: "CONFLICT",
      nextAction: { type: "EXPLAIN_CONFLICT" },
      materialQuestion: null,
      conflictAnalysis: {
        zeroingConstraintIds: ["constraint-2"],
        inclusionMinimalConflictConstraintIds: ["constraint-1", "constraint-2"],
        relaxationOptions: [{
          id: "relax-1",
          relaxConstraintIds: ["constraint-2"],
          resultingCandidateIds: ["variant-1"],
          explanationFactIds: ["fact-1"],
        }],
        authorizedConflictFactIds: ["fact-1"],
      },
    });
    expect(validateDecisionTurnResult(result)).toEqual({ ok: true });
    expect(result.conflictAnalysis?.relaxationOptions[0]?.resultingCandidateIds).toEqual(["variant-1"]);
  });

  it("carries lookup, social, off-topic, abuse, question, and offer lifecycle memory", () => {
    const memory: import("./conversationMemory").ConversationMemory = {
      conversationId: "conversation-1",
      turn: 1,
      state: "DIRECT_MODEL_LOOKUP",
      vehicleIntentEstablished: true,
      events: [{
        schemaVersion: 1,
        conversationId: "conversation-1",
        eventType: "OFFER_LIFECYCLE",
        id: "event-1",
        sourceMessageId: "message-1",
        sourceTurn: 1,
        sequence: 0,
        createdAt: CREATED_AT,
        offerId: "offer-1",
        lifecycleState: "CREATED",
        offer: offer(),
      }],
      budget: {
        financeFlexibility: "UNKNOWN", unresolvedFinancedCeiling: false,
        budgetImportance: "UNKNOWN", budgetUnknown: true, budgetExcluded: false,
      },
      modelReferences: [{
        id: "model-ref-1", sourceMessageId: "message-1", sourceTurn: 1, rawText: "referenced model",
        resolution: "UNRESOLVED", decisionEffect: "LOOKUP_ONLY", resolvedFamilyIds: [], resolvedVariantIds: [],
      }],
      currentOffer: {
        offerId: "offer-1", lifecycleState: "CREATED",
        catalogFingerprint: "catalog-fingerprint", decisionFingerprint: "decision-fingerprint",
        candidateIds: ["variant-1"], revealable: true,
      },
      revealedCandidateIds: [],
      socialState: { consecutiveSocialTurns: 0 },
      offTopicState: { consecutiveOffTopicTurns: 0, boundaryStated: false },
      abuseState: { level: "NONE", strikeCount: 0 },
      directAnswerHistory: [{
        obligation: "MODEL_AVAILABILITY", sourceMessageId: "message-1", sourceTurn: 1, fulfilledOnTurn: 1,
      }],
      materialQuestionHistory: [{
        questionId: "question-1", stableSemanticKey: "usage.primary", field: "usage",
        askedOnTurn: 1, answerStatus: "DEFERRED",
      }],
      persona: { activated: false, requestedTraits: [] },
      catalogAuthority: {
        market: "TR", releaseVersion: "release", catalogFingerprint: "catalog-fingerprint",
        manifestFingerprint: "manifest-fingerprint", activatedAt: CREATED_AT,
      },
      memoryFingerprint: "memory-fingerprint",
      decisionFingerprint: "decision-fingerprint",
    };
    expect(memory.modelReferences).toHaveLength(1);
    expect(memory.events[0]?.eventType).toBe("OFFER_LIFECYCLE");
    expect(memory.materialQuestionHistory[0]?.answerStatus).toBe("DEFERRED");
  });

  it("allows realization to use only authorized facts and offered candidates", () => {
    expect(validateDecisionTurnResult(turn())).toEqual({ ok: true });
    expect(validateDecisionTurnResult(turn({
      nextAction: { type: "ANSWER_DIRECTLY" }, materialQuestion: null,
      realization: {
        authorizedExplanationFactIds: ["hidden-fact"], prohibitedClaims: [],
        mentionableCandidateIds: [], revealableCandidateIds: [], directAnswerPlacement: "BEFORE_MATERIAL_QUESTION",
      },
    })).ok).toBe(false);
  });
});
