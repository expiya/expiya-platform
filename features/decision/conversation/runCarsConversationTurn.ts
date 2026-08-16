import { randomUUID } from "node:crypto";

import catalogPayload from "@/data/production/catalog/releases/v0.20.0/catalog.json";
import { runCarsRuntime } from "@/features/decision/runtime/runCarsRuntime";
import {
  deriveCarsEvidenceBackedRequirementsFromQuery,
  runCarsEvidenceBackedDecision,
  type CarsEvidenceBackedDecisionResult,
} from "@/features/decision/runtime/runCarsEvidenceBackedDecision";
import { generatedVehicleEvidenceReadPort } from "@/features/vehicle-evidence/generatedVehicleEvidenceReadPort";
import type {
  CarsActiveOptionSet,
  CarsConversationRequest,
  CarsConversationResponse,
  CarsConversationTrace,
  CarsOfferPurpose,
  CarsQuestionPurpose,
  CarsRequirementKey,
  CarsTurnProvenance,
} from "@/types/carsConversation";

import { assessCarsConversationSufficiency } from "./assessCarsConversationSufficiency";
import { conversationStateFromPhase, withAdvisorStage } from "./carsAdvisorState";
import { buildCarsConversationQuery } from "./buildCarsConversationQuery";
import {
  createCarsClarificationRepair,
  isCarsClarificationRepair,
} from "./carsConversationRepair";
import {
  applyAssistantMove,
  closeDeferredQuestions,
  hydrateCarsConversationMemory,
} from "./carsConversationMemory";
import { extractDeterministicFacts, isFrustration, upsertRequirement, budgetCategoryFromText, latestRequirement } from "./carsRequirementLedger";
import {
  affordabilityClaimAuthorized,
  affordabilityQuestionCeilingTry,
  budgetFlexibilityMessage,
  deriveRecommendationLevel,
  hardBudgetPresent,
  isAffordabilityMaterial,
  listingClaimMessage,
  listingUrlGateMessage,
  messageClaimsAffordability,
  noAffordableMatchMessage,
  purchasableUnitAuthorized,
  resolveAcquisitionMarket,
  shownCandidateAffordabilityMessage,
  stampAcquisitionAuthority,
  usedVehicleScopeMessage,
  usedVehicleScopeRepeat,
} from "./carsAcquisitionAuthority";
import { cannotRepeatQuestion, isSemanticLoop } from "./carsSemanticLoopGuard";
import {
  createCarsBoundedRecovery,
  discoveryUsageOptions,
  FALLBACK_CAPABILITY,
  FALLBACK_OFFER,
} from "./createCarsBoundedRecovery";
import { createCarsFollowUp } from "./createCarsFollowUp";
import { isCandidateComparisonConversation } from "./hasActionableCarsContext";
import {
  heldAuthorizationIsUsable,
  openHeldAuthorization,
  requirementFingerprint,
  resealHeldAuthorization,
  sealHeldAuthorization,
} from "./carsHeldAuthorization";
import { resolveCarsConversationModel } from "./carsConversationModelConfig";
import {
  planCarsConversationTurn,
  type CarsConversationTurnPlan,
  type PlanCarsConversationTurnInput,
  type PlanCarsConversationTurnResult,
} from "./planCarsConversationTurn";
import {
  blockedConstraintKinds,
  hardBudgetBlocksAffordabilityClaim,
  hardConstraintBlockMessage,
  hardUnevaluatedConstraints,
  presentGovernedRecommendation,
  recommendationRevealCopy,
  internalEstimateDisclosure,
  unevaluatedBudgetPresent,
  unsupportedHardRequirementBlocksModelFit,
  unverifiedPreferenceNote,
} from "./presentGovernedRecommendation";
import { evidenceDecisionProjection, messageRevealsCandidateIdentity } from "./publicCarsDecision";
import { applyHardBudgetGate, hardBudgetCeilingTry } from "./applyCarsHardBudgetGate";
import {
  evaluateNewVehiclePrice,
  formatTryConsumer,
  informationalPriceCaveat,
} from "./carsNewPriceAuthority";
import {
  interpretLatestUserAct,
  resolveConversationAddressForm,
  textHasVehicleIntent,
} from "./carsSocialIntent";
import { validateCarsConversationPlan } from "./validateCarsConversationPlan";
import {
  assessForwardProgress,
  isVagueContinuityPhrase,
  recentAssistantTexts,
} from "./carsForwardProgress";
import {
  alreadyStatedCoverageLimitation,
  assessDirectRecommendationCoverage,
  coverageLimitationMessage,
  coverageLimitationRepeat,
  shownCandidateNoAlternativeMessage,
  unsupportedSoftPreferenceBoundaryMessage,
} from "./carsDirectRecommendation";
import { applyExpandedCoverageBridge, expandedCoverageIsActive } from "./carsExpandedCoverageBridge";

const MAX_USER_TURNS = 20;

async function planTurn(input: PlanCarsConversationTurnInput): Promise<PlanCarsConversationTurnResult> {
  const result = await planCarsConversationTurn(input);
  if (!result || typeof result !== "object" || !("requestedModel" in result)) {
    return {
      requestedModel: resolveCarsConversationModel().requestedModel,
      parseOutcome: "UNAVAILABLE",
      fallbackUsed: false,
    };
  }
  return result;
}

function applyPlanFacts(trace: CarsConversationTrace, plan: CarsConversationTurnPlan, sourceTurn: number, sourceText: string): CarsConversationTrace {
  const entries = new Map(trace.requirements.map((entry) => [entry.key, entry] as const));
  const captured = [...trace.capturedOnLatestTurn];
  for (const fact of plan.proposedMemoryChanges.newFacts) {
    const deterministicKeys = new Set(extractDeterministicFacts(sourceText).map((item) => item.key));
    if (fact.key === "ACQUISITION_MARKET") continue;
    if (deterministicKeys.has(fact.key)) {
      continue;
    }
    const value = fact.numericValue ?? fact.valueText;
    if (value === "" || value === null) continue;
    if (upsertRequirement(entries, {
      key: fact.key as CarsRequirementKey,
      value,
      sourceTurn,
      sourceText,
      category: fact.key === "BUDGET_MAX_TRY" ? budgetCategoryFromText(sourceText) : fact.category,
      evaluability: fact.evaluability,
    })) captured.push(fact.key as CarsRequirementKey);
  }
  return {
    ...trace,
    requirements: [...entries.values()],
    capturedOnLatestTurn: [...new Set(captured)],
    didConversationProgress: captured.length > 0 || trace.didConversationProgress,
  };
}

function optionSetFromPlan(
  plan: CarsConversationTurnPlan,
  purpose: CarsQuestionPurpose,
  sourceAssistantTurn: number,
): CarsActiveOptionSet | undefined {
  if (plan.options.length === 0) return undefined;
  const mentioned = plan.options.filter((option) => plan.assistantMessage.includes(option.label));
  if (mentioned.length === 0) return undefined;
  return {
    id: `opt-${purpose}-${sourceAssistantTurn}`,
    purpose,
    options: mentioned,
    sourceAssistantTurn,
    active: true,
  };
}

function fallbackUsageOptions(purpose: CarsQuestionPurpose, turn: number, message?: string): CarsActiveOptionSet | undefined {
  if (purpose !== "USAGE_DETAIL") return undefined;
  if (message && !/kamp|stabilize|çamurlu|ciddi arazi|hangisine daha yakın/iu.test(message)) return undefined;
  return {
    id: `opt-usage-detail-${turn}`,
    purpose,
    options: discoveryUsageOptions,
    sourceAssistantTurn: turn,
    active: true,
  };
}

function authorizationSafety(
  memory: CarsConversationTrace,
  blockedModelFit = unsupportedHardRequirementBlocksModelFit(memory),
): Pick<
  CarsTurnProvenance,
  | "hardUnevaluatedConstraints"
  | "recommendationBlockedByHardConstraint"
  | "blockedConstraintKinds"
  | "candidateHeld"
  | "offerAuthorized"
  | "cardRevealAuthorized"
  | "acquisitionMarket"
  | "recommendationLevel"
  | "affordabilityState"
  | "offerPurpose"
  | "decisionKind"
  | "affordabilityClaimAuthorized"
  | "purchasableUnitAuthorized"
  | "modelFitAuthorized"
  | "listingClaimDetected"
  | "usedPurchaseRequestDetected"
  | "shownCandidateKnown"
  | "activePhase1Market"
  | "noAffordableMatchStatus"
> {
  const exposedHold = Boolean(memory.heldAuthorization) && (
    memory.recommendationOfferStatus === "AWAITING_CONSENT"
    || memory.recommendationOfferStatus === "REVEALED"
  ) && !blockedModelFit;
  const affordabilityOk = affordabilityClaimAuthorized(memory);
  return {
    hardUnevaluatedConstraints: hardUnevaluatedConstraints(memory).map((entry) => entry.key),
    recommendationBlockedByHardConstraint: blockedModelFit,
    blockedConstraintKinds: blockedModelFit
      ? blockedConstraintKinds(memory)
      : hardBudgetBlocksAffordabilityClaim(memory) ? ["BUDGET"] : [],
    candidateHeld: exposedHold,
    offerAuthorized: memory.recommendationOfferStatus === "AWAITING_CONSENT" && !blockedModelFit,
    cardRevealAuthorized: memory.recommendationOfferStatus === "REVEALED" && !blockedModelFit,
    acquisitionMarket: resolveAcquisitionMarket(memory),
    recommendationLevel: memory.recommendationLevel ?? deriveRecommendationLevel({ memory }),
    affordabilityState: memory.affordabilityState ?? "AFFORDABILITY_NOT_REQUESTED",
    offerPurpose: memory.offerPurpose,
    decisionKind: "VEHICLE_FIT",
    affordabilityClaimAuthorized: affordabilityOk,
    purchasableUnitAuthorized: purchasableUnitAuthorized(),
    modelFitAuthorized: exposedHold,
    listingClaimDetected: memory.recommendationLevel === "LISTING_ANALYSIS_ONLY",
    usedPurchaseRequestDetected: memory.usedPurchaseRequestDetected,
    shownCandidateKnown: Boolean(memory.shownCandidate),
    activePhase1Market: resolveAcquisitionMarket(memory),
    noAffordableMatchStatus: memory.noAffordableMatchStatus,
  };
}

function withoutExposedHold(memory: CarsConversationTrace): CarsConversationTrace {
  return {
    ...memory,
    heldAuthorization: undefined,
    recommendationOfferStatus: "NONE",
    humanReady: false,
    advisorStage: "NOT_RECOMMENDABLE",
    phase: "LIMITED_BY_EVIDENCE",
    state: "INSUFFICIENT_SUPPORTED_EVIDENCE",
  };
}

function withProvenance(trace: CarsConversationTrace, provenance: CarsTurnProvenance): CarsConversationTrace {
  return { ...trace, turnProvenance: provenance };
}

function withProgress(
  provenance: CarsTurnProvenance,
  input: {
    readonly messages: CarsConversationRequest["messages"];
    readonly latestUser: string;
    readonly assistantMessage: string;
    readonly latestAct: ReturnType<typeof interpretLatestUserAct>;
    readonly memory: CarsConversationTrace;
    readonly stateChanged?: boolean;
    readonly askedMaterialQuestion?: boolean;
    readonly statedLimitation?: boolean;
    readonly repaired?: boolean;
    readonly recommendationAction?: boolean;
    readonly coverage?: CarsTurnProvenance["directRecommendationCoverage"];
  },
): CarsTurnProvenance {
  const progress = assessForwardProgress({
    latestUser: input.latestUser,
    assistantMessage: input.assistantMessage,
    recentAssistant: recentAssistantTexts(input.messages),
    directQuestionAnswered: input.latestAct.isCapabilityQuestion
      || input.latestAct.isDirectModelComparison
      || input.latestAct.isDirectAffordabilityQuestion
      || input.latestAct.isRecommendationAcceptance
      || Boolean(input.statedLimitation),
    stateChanged: Boolean(input.stateChanged),
    askedMaterialQuestion: Boolean(input.askedMaterialQuestion),
    statedLimitation: Boolean(input.statedLimitation),
    repaired: Boolean(input.repaired),
    recommendationAction: Boolean(input.recommendationAction),
  });
  const budget = unevaluatedBudgetPresent(input.memory);
  const blocked = unsupportedHardRequirementBlocksModelFit(input.memory);
  return {
    ...provenance,
    forwardProgressType: progress.forwardProgressType,
    newInformationComparedWithRecentTurns: progress.newInformationComparedWithRecentTurns,
    directQuestionAnswered: progress.directQuestionAnswered,
    semanticRepetitionDetected: progress.semanticRepetitionDetected,
    repairApplied: Boolean(input.repaired) || progress.semanticRepetitionDetected,
    directRecommendationCoverage: input.coverage,
    budgetEvaluated: provenance.budgetEvaluated === true
      || input.memory.affordabilityState === "AFFORDABILITY_PASS"
      || input.memory.affordabilityState === "AFFORDABILITY_FAIL"
      || input.memory.affordabilityState === "AFFORDABILITY_UNKNOWN",
    unevaluatedBudgetPresent: budget,
    heldDespiteUnevaluatedBudget: budget && !blocked && (
      input.memory.recommendationOfferStatus === "AWAITING_CONSENT"
      || input.memory.recommendationOfferStatus === "REVEALED"
    ),
    ...authorizationSafety(input.memory, blocked),
  };
}

function evaluateGoverned(input: CarsConversationRequest, memory: CarsConversationTrace): CarsEvidenceBackedDecisionResult {
  let query = buildCarsConversationQuery(input.messages);
  if (expandedCoverageIsActive(memory, query) && deriveCarsEvidenceBackedRequirementsFromQuery(query).requirements.length === 0) {
    const party = [...memory.requirements].reverse().find((entry) => entry.key === "PARTY_SIZE")?.value;
    query += `\nEn az ${typeof party === "number" ? party : 1} koltuk.`;
  }
  return runCarsEvidenceBackedDecision({
    query,
    vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort,
    discriminatorChoiceId: input.choiceId,
  });
}

function invalidateHeld(memory: CarsConversationTrace): CarsConversationTrace {
  return {
    ...memory,
    heldAuthorization: resealHeldAuthorization(memory.heldAuthorization, "INVALIDATED") ?? memory.heldAuthorization,
    recommendationOfferStatus: memory.heldAuthorization ? "INVALIDATED" : "NONE",
    humanReady: false,
    governedReady: false,
    advisorStage: memory.vehicleIntentEstablished ? "CONTEXT_UNDERSTANDING" : memory.advisorStage,
  };
}

function respondBlockedByHardConstraint(
  input: CarsConversationRequest,
  memory: CarsConversationTrace,
  provenance?: Partial<CarsTurnProvenance>,
): CarsConversationResponse {
  const requestedModel = resolveCarsConversationModel().requestedModel;
  const blockedMemory = withoutExposedHold(memory);
  const message = hardConstraintBlockMessage(memory);
  const latestAct = interpretLatestUserAct(input.messages, blockedMemory);
  const conversation = withProvenance(applyAssistantMove(blockedMemory, {
    phase: "LIMITED_BY_EVIDENCE",
    prompt: message,
    progressEvent: "hard-constraint-block",
    advisorStage: "NOT_RECOMMENDABLE",
    clearPendingQuestion: true,
  }), withProgress({
    modelAttempted: provenance?.modelAttempted ?? false,
    requestedModel: provenance?.requestedModel ?? requestedModel,
    selectedModel: provenance?.selectedModel,
    structuredPlan: provenance?.structuredPlan ?? false,
    parseOutcome: provenance?.parseOutcome ?? "NOT_ATTEMPTED",
    userFacingOrigin: provenance?.userFacingOrigin ?? "DETERMINISTIC_EVIDENCE",
    deterministicOverride: false,
    conversationMove: "EXPLAIN_LIMITATION",
    latestMessageAcknowledged: true,
    latestPrimaryAct: latestAct.primaryAct,
    advisorStage: "NOT_RECOMMENDABLE",
  }, {
    messages: input.messages,
    latestUser: [...input.messages].reverse().find((item) => item.role === "user")?.content ?? "",
    assistantMessage: message,
    latestAct,
    memory: blockedMemory,
    statedLimitation: true,
    stateChanged: true,
  }));
  return {
    kind: "QUESTION",
    message,
    conversation: { ...conversation, state: "INSUFFICIENT_SUPPORTED_EVIDENCE", textInputAllowed: true },
  };
}

function holdAuthorizedCandidate(
  input: CarsConversationRequest,
  memory: CarsConversationTrace,
  result: CarsEvidenceBackedDecisionResult,
  offerPurpose: CarsOfferPurpose = "MODEL_FIT_OFFER",
): CarsConversationTrace {
  if (unsupportedHardRequirementBlocksModelFit(memory)) return withoutExposedHold(memory);
  const selectedId = result.selectedRuntimeVehicleCandidateId;
  const selected = result.candidateEvaluations.find((candidate) => (
    candidate.runtimeVehicleCandidateId === selectedId
  ));
  if (!selected || !selectedId) return memory;
  const token = sealHeldAuthorization({
    conversationId: input.conversationId,
    runtimeVehicleCandidateId: selected.runtimeVehicleCandidateId,
    vehicleVariantId: selected.vehicleVariantId,
    requirementFingerprint: requirementFingerprint(memory),
    discriminatorChoiceId: input.choiceId,
  });
  return closeDeferredQuestions({
    ...memory,
    heldAuthorization: token,
    recommendationOfferStatus: "AWAITING_CONSENT",
    governedReady: true,
    humanReady: true,
    advisorStage: "OFFER_AWAITING_CONSENT",
    phase: "OFFERING",
    state: "OFFER_AWAITING_CONSENT",
    offerPurpose,
    recommendationLevel: offerPurpose === "NEW_CONFIGURATION_OFFER"
      ? "NEW_CONFIGURATION_RECOMMENDATION"
      : deriveRecommendationLevel({ memory }),
  }, "Governed authorization is ready; remaining discovery questions no longer change the winner.");
}

function revealAuthorizedCard(
  input: CarsConversationRequest,
  memory: CarsConversationTrace,
  message: string,
  provenance: CarsTurnProvenance,
): CarsConversationResponse {
  if (unsupportedHardRequirementBlocksModelFit(memory)) {
    return respondBlockedByHardConstraint(input, memory, provenance);
  }
  const opened = heldAuthorizationIsUsable({
    token: memory.heldAuthorization,
    conversationId: input.conversationId,
    memory,
    requireActiveOffer: true,
  });
  if (!opened) {
    const recovery = createCarsBoundedRecovery(memory, [...input.messages].reverse().find((item) => item.role === "user")?.content ?? "");
    return {
      ...recovery.response,
      conversation: withProvenance(recovery.conversation, {
        ...provenance,
        userFacingOrigin: "BOUNDED_FALLBACK",
        fallbackReason: "OFFER_EXPIRED_OR_INVALID",
        deterministicOverride: false,
      }),
    };
  }
  const raw = evaluateGoverned(input, memory);
  const gated = applyHardBudgetGate(raw, memory);
  const result = applyExpandedCoverageBridge({
    result: gated.result, memory, query: buildCarsConversationQuery(input.messages),
    choiceId: opened.discriminatorChoiceId ?? input.choiceId,
  }).result;
  if (result.selectedRuntimeVehicleCandidateId !== opened.runtimeVehicleCandidateId) {
    const conversation = withProvenance(invalidateHeld(memory), {
      ...provenance,
      userFacingOrigin: "BOUNDED_FALLBACK",
      fallbackReason: "HELD_CANDIDATE_MISMATCH",
    });
    return { kind: "QUESTION", message: "Şartlar değiştiği için önceki öneriyi göstermiyorum. Güncel ihtiyaçlarınıza göre yeniden bakabiliriz.", conversation };
  }
  const recommendation = presentGovernedRecommendation({ result, authorization: opened, memory });
  const identity = `${recommendation.car.brand} ${recommendation.car.model}`.trim();
  const budgetUnevaluated = unevaluatedBudgetPresent(memory);
  const preferenceNote = unverifiedPreferenceNote(memory);
  const reasons = recommendation.decision.reasons.slice(0, 3);
  const price = recommendation.pricePresentation;
  const body = recommendationRevealCopy({
    identity,
    reasons,
    memory,
    amountTry: price?.amountTry,
    priceType: price?.priceType,
    validityStatus: price?.validityStatus,
    internalEstimateResult: recommendation.car.priceDisplayAllowed === false
      ? memory.affordabilityState === "AFFORDABILITY_PASS" ? "PASS" : "NOT_REQUESTED"
      : undefined,
    caveat: memory.offerPurpose === "NEW_CONFIGURATION_OFFER" ? price?.caveat : price?.caveat,
  });
  const revealedMemory = stampAcquisitionAuthority({
    ...memory,
    offerPurpose: memory.offerPurpose === "NEW_CONFIGURATION_OFFER" ? "NEW_CONFIGURATION_OFFER" : "MODEL_FIT_OFFER",
    recommendationLevel: memory.offerPurpose === "NEW_CONFIGURATION_OFFER"
      ? "NEW_CONFIGURATION_RECOMMENDATION"
      : deriveRecommendationLevel({ memory }),
    shownCandidate: {
      runtimeVehicleCandidateId: opened.runtimeVehicleCandidateId,
      vehicleVariantId: opened.vehicleVariantId,
      revealedOnUserTurn: input.messages.filter((item) => item.role === "user").length,
    },
  }, { latestUser: [...input.messages].reverse().find((item) => item.role === "user")?.content ?? "" });
  void message;
  const conversation = withProvenance(applyAssistantMove(revealedMemory, {
    phase: "RECOMMENDATION_SHOWN",
    prompt: body,
    progressEvent: "recommendation-revealed",
    advisorStage: "RECOMMENDATION_SHOWN",
    recommendationOfferStatus: "REVEALED",
    heldAuthorization: resealHeldAuthorization(memory.heldAuthorization, "REVEALED"),
    clearPendingQuestion: true,
    humanReady: true,
    governedReady: true,
  }), {
    ...provenance,
    budgetEvaluated: false,
    unevaluatedBudgetPresent: budgetUnevaluated,
    heldDespiteUnevaluatedBudget: budgetUnevaluated,
    forwardProgressType: "SUPPORTED_RECOMMENDATION_ACTION",
    newInformationComparedWithRecentTurns: true,
    directQuestionAnswered: true,
    semanticRepetitionDetected: false,
    repairApplied: false,
    governedEvaluationAttempted: true,
    candidateCount: result.recommendationAuthorization.authorizedCandidateIds.length,
    selectedDeterministicCandidate: result.selectedRuntimeVehicleCandidateId,
    discriminator: result.explanationInput.at(0),
    offerState: "REVEALED",
    cardState: "REVEALED",
    ...authorizationSafety({
      ...memory,
      recommendationOfferStatus: "REVEALED",
      heldAuthorization: memory.heldAuthorization,
    }),
  });
  return {
    kind: "RECOMMENDATIONS",
    message: body,
    recommendations: [recommendation],
    decision: {
      ...evidenceDecisionProjection(result, { revealIdentity: true, recommendationOfferStatus: "REVEALED" }),
      governedReasons: reasons,
      unverifiedPreferenceNote: preferenceNote,
    },
    conversation: { ...conversation, state: "RECOMMENDATION_SHOWN", textInputAllowed: true },
  };
}

async function offerAuthorizedCandidate(
  input: CarsConversationRequest,
  memory: CarsConversationTrace,
  result: CarsEvidenceBackedDecisionResult,
  userTurnCount: number,
  trace?: {
    readonly candidateSetBeforePriceFilter?: readonly string[];
    readonly candidateSetAfterPriceFilter?: readonly string[];
    readonly candidateFilters?: readonly { readonly kind: string; readonly before: readonly string[]; readonly after: readonly string[] }[];
  },
): Promise<CarsConversationResponse> {
  if (unsupportedHardRequirementBlocksModelFit(memory)) {
    return respondBlockedByHardConstraint(input, memory);
  }
  const offerPurpose: CarsOfferPurpose = hardBudgetPresent(memory) && memory.affordabilityState === "AFFORDABILITY_PASS"
    ? "NEW_CONFIGURATION_OFFER"
    : hardBudgetPresent(memory)
      ? "NEW_CONFIGURATION_OFFER"
      : "MODEL_FIT_OFFER";
  const held = stampAcquisitionAuthority(holdAuthorizedCandidate(input, memory, result, offerPurpose), {
    offerPurpose,
    budgetCompatible: offerPurpose === "NEW_CONFIGURATION_OFFER",
    affordabilityState: offerPurpose === "NEW_CONFIGURATION_OFFER" ? "AFFORDABILITY_PASS" : memory.affordabilityState,
  });
  if (!held.heldAuthorization) {
    return respondBlockedByHardConstraint(input, memory);
  }
  const requestedModel = resolveCarsConversationModel().requestedModel;
  const planned = await planTurn({
    conversationId: input.conversationId,
    messages: input.messages,
    memory: held,
    remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
    latestAct: interpretLatestUserAct(input.messages, held),
    recommendationMayBeOffered: true,
    candidateMayBeRevealed: false,
    userFacingDecisionBasis: ["Doğrulanmış koltuk ve bagaj eşiği"],
    userFacingUnverifiedPreferences: held.requirements
      .filter((entry) => entry.evaluability === "UNDERSTOOD_NOT_EVALUABLE")
      .map((entry) => entry.key),
  });
  const plan = planned.plan;
  const valid = plan && !validateCarsConversationPlan({
    plan,
    memory: held,
    latestAct: interpretLatestUserAct(input.messages, held),
    latestUserText: [...input.messages].reverse().find((item) => item.role === "user")?.content ?? "",
    recommendationMayBeOffered: true,
    candidateMayBeRevealed: false,
  }) && plan.recommendationAction === "OFFER_ONLY" && !messageRevealsCandidateIdentity(plan.assistantMessage)
    && !messageClaimsAffordability(plan.assistantMessage);
  const fallback = held.offerPurpose === "NEW_CONFIGURATION_OFFER"
    ? (held.addressForm === "SIZ"
      ? "Tavanınıza uyan net bir sıfır önerim var. Görmek ister misiniz?"
      : "Tavanına uyan net bir sıfır önerim var. Görmek ister misin?")
    : FALLBACK_OFFER;
  const message = valid ? plan.assistantMessage : fallback;
  const conversation = withProvenance(applyAssistantMove(held, {
    phase: "OFFERING",
    prompt: message,
    progressEvent: "recommendation-offered",
    advisorStage: "OFFER_AWAITING_CONSENT",
    recommendationOfferStatus: "AWAITING_CONSENT",
    heldAuthorization: held.heldAuthorization,
    clearPendingQuestion: true,
    humanReady: true,
    governedReady: true,
  }), {
    modelAttempted: true,
    requestedModel: planned.requestedModel,
    selectedModel: planned.selectedModel ?? requestedModel,
    structuredPlan: Boolean(valid),
    parseOutcome: planned.parseOutcome,
    userFacingOrigin: valid ? "MODEL" : "BOUNDED_FALLBACK",
    deterministicOverride: false,
    fallbackReason: valid ? undefined : "MODEL_RESPONSE_VALIDATION_FAILED",
    conversationMove: valid ? plan.move : "OFFER_RECOMMENDATION",
    latestMessageAcknowledged: true,
    latestPrimaryAct: interpretLatestUserAct(input.messages, held).primaryAct,
    advisorStage: "OFFER_AWAITING_CONSENT",
    budgetEvaluated: held.offerPurpose === "NEW_CONFIGURATION_OFFER",
    unevaluatedBudgetPresent: unevaluatedBudgetPresent(held),
    heldDespiteUnevaluatedBudget: unevaluatedBudgetPresent(held),
    directRecommendationRequested: interpretLatestUserAct(input.messages, held).isDirectRecommendationRequest,
    governedEvaluationAttempted: true,
    candidateCount: result.recommendationAuthorization.authorizedCandidateIds.length,
    candidateSetBeforePriceFilter: trace?.candidateSetBeforePriceFilter ?? result.evidenceTrace.candidateIds,
    candidateSetAfterPriceFilter: trace?.candidateSetAfterPriceFilter,
    candidateFilters: trace?.candidateFilters,
    selectedDeterministicCandidate: result.selectedRuntimeVehicleCandidateId,
    discriminator: result.explanationInput.at(0),
    offerState: "AWAITING_CONSENT",
    cardState: "HIDDEN",
    ...authorizationSafety(held),
  });
  return {
    kind: "QUESTION",
    message,
    decision: evidenceDecisionProjection(result, { revealIdentity: false, recommendationOfferStatus: "AWAITING_CONSENT" }),
    conversation: { ...conversation, state: "OFFER_AWAITING_CONSENT", textInputAllowed: true },
  };
}

function respondWithEvidence(
  input: CarsConversationRequest,
  memory: CarsConversationTrace,
): CarsConversationResponse | Promise<CarsConversationResponse> {
  if (unsupportedHardRequirementBlocksModelFit(memory)) {
    return respondBlockedByHardConstraint(input, memory);
  }
  const raw = evaluateGoverned(input, memory);
  const gated = applyHardBudgetGate(raw, memory);
  const expanded = applyExpandedCoverageBridge({
    result: gated.result, memory, query: buildCarsConversationQuery(input.messages), choiceId: input.choiceId,
  });
  const result = expanded.result;
  const structuredFollowUp = evidenceDecisionProjection(result, { revealIdentity: false });
  if (gated.filter && gated.priceEvaluationRequested) {
    memory = {
      ...memory,
      priceEvaluations: gated.filter.evaluations,
      noAffordableMatchStatus: gated.filter.noAffordableMatchStatus,
      affordabilityState: gated.filter.passingCandidateIds.length > 0
        ? "AFFORDABILITY_PASS"
        : gated.filter.noAffordableMatchStatus === "PRICE_UNKNOWN_FOR_TECHNICAL_MATCH"
          ? "AFFORDABILITY_UNKNOWN"
          : "AFFORDABILITY_FAIL",
    };
  }
  if (result.status === "NO_ELIGIBLE_CANDIDATE" && gated.filter && hardBudgetPresent(memory)) {
    const ceiling = hardBudgetCeilingTry(memory) ?? 0;
    const estimateOnlyFailure = gated.filter.evaluations.some((item) => item.result === "FAIL")
      && gated.filter.evaluations.filter((item) => item.result === "FAIL").every((item) => item.priceType === "ESTIMATE");
    const message = estimateOnlyFailure
      ? internalEstimateDisclosure("FAIL")
      : noAffordableMatchMessage(memory, ceiling, gated.filter.nearestGapPercent);
    const stamped = stampAcquisitionAuthority({
      ...withoutExposedHold(memory),
      offerPurpose: "NO_AFFORDABLE_MATCH",
      noAffordableMatchStatus: gated.filter.noAffordableMatchStatus ?? "NO_AFFORDABLE_EXACT_MATCH",
      priceEvaluations: gated.filter.evaluations,
    }, { latestUser: [...input.messages].reverse().find((item) => item.role === "user")?.content ?? "", affordabilityState: memory.affordabilityState });
    const conversation = withProvenance(applyAssistantMove(stamped, {
      phase: "LIMITED_BY_EVIDENCE",
      prompt: message,
      advisorStage: "NOT_RECOMMENDABLE",
      progressEvent: "no-affordable-match",
      clearPendingQuestion: true,
    }), withProgress({
      modelAttempted: false,
      requestedModel: resolveCarsConversationModel().requestedModel,
      structuredPlan: false,
      parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE",
      deterministicOverride: true,
      conversationMove: "EXPLAIN_LIMITATION",
      latestMessageAcknowledged: true,
      latestPrimaryAct: interpretLatestUserAct(input.messages, stamped).primaryAct,
      advisorStage: "NOT_RECOMMENDABLE",
      budgetEvaluated: true,
      priceEvaluationRequested: true,
      budgetCeilingTry: ceiling,
      candidateSetBeforePriceFilter: gated.filter.evaluations.map((item) => item.candidateId),
      candidateSetAfterPriceFilter: gated.filter.passingCandidateIds,
      noAffordableMatchStatus: gated.filter.noAffordableMatchStatus,
      nearestVerifiedPriceGapTry: gated.filter.nearestGapTry,
      nearestVerifiedPriceGapPercent: gated.filter.nearestGapPercent,
      activePhase1Market: "NEW_ONLY",
    }, {
      messages: input.messages,
      latestUser: [...input.messages].reverse().find((item) => item.role === "user")?.content ?? "",
      assistantMessage: message,
      latestAct: interpretLatestUserAct(input.messages, stamped),
      memory: stamped,
      statedLimitation: true,
      stateChanged: true,
    }));
    return {
      kind: "QUESTION",
      message,
      decision: structuredFollowUp,
      conversation: { ...conversation, state: "NO_SUPPORTED_CANDIDATE" },
    };
  }
  if (result.status === "NO_ELIGIBLE_CANDIDATE") {
    const conversation = applyAssistantMove(memory, {
      phase: "LIMITED_BY_EVIDENCE",
      prompt: result.followUpQuestion ?? "Zorunlu şartlarınızı karşılayan doğrulanmış aday yok.",
      advisorStage: "NOT_RECOMMENDABLE",
    });
    return {
      kind: "QUESTION",
      message: "Şu anda doğrulanmış verileriyle değerlendirdiğim araçların hiçbiri zorunlu şartınızı karşılmıyor. Şartlardan hangisinin esneyebileceğini konuşabiliriz.",
      decision: structuredFollowUp,
      conversation: { ...conversation, state: "NO_SUPPORTED_CANDIDATE" },
    };
  }
  if (result.status === "INSUFFICIENT_VEHICLE_EVIDENCE") {
    const message = "Güvenilir bir seçim için gereken doğrulanmış araç verisi şu anda yeterli değil. Bu nedenle bir araç önermeyeceğim.";
    const conversation = applyAssistantMove(memory, { phase: "LIMITED_BY_EVIDENCE", prompt: message, advisorStage: "NOT_RECOMMENDABLE" });
    return { kind: "QUESTION", message, decision: structuredFollowUp, conversation: { ...conversation, state: "INSUFFICIENT_SUPPORTED_EVIDENCE" } };
  }
  if (result.status === "DECISION_READY") {
    const userTurnCount = input.messages.filter((message) => message.role === "user").length;
    return offerAuthorizedCandidate(input, memory, result, userTurnCount, {
      candidateSetBeforePriceFilter: gated.filter?.evaluations.map((item) => item.candidateId) ?? result.evidenceTrace.candidateIds,
      candidateSetAfterPriceFilter: gated.filter?.passingCandidateIds,
      candidateFilters: expanded.trace.filters,
    });
  }
  if (result.discriminatorChoices) {
    const message = result.followUpQuestion ?? "Kararı değiştirecek seçeneği seçin.";
    const latestUser = [...input.messages].reverse().find((item) => item.role === "user")?.content ?? "";
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: "FINAL_TRADEOFF",
      purpose: "MIN_CARGO",
      prompt: message,
      advisorStage: "TRADEOFF_RESOLUTION",
    }), withProgress({
      modelAttempted: false,
      requestedModel: resolveCarsConversationModel().requestedModel,
      structuredPlan: false,
      parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE",
      deterministicOverride: true,
      conversationMove: "ASK_ONE_QUESTION",
      latestMessageAcknowledged: true,
      latestPrimaryAct: interpretLatestUserAct(input.messages, memory).primaryAct,
      advisorStage: "TRADEOFF_RESOLUTION",
      budgetEvaluated: gated.priceEvaluationRequested,
      priceEvaluationRequested: gated.priceEvaluationRequested,
      budgetCeilingTry: hardBudgetCeilingTry(memory),
      candidateSetBeforePriceFilter: gated.filter?.evaluations.map((item) => item.candidateId),
      candidateSetAfterPriceFilter: gated.filter?.passingCandidateIds,
      activePhase1Market: "NEW_ONLY",
    }, {
      messages: input.messages,
      latestUser,
      assistantMessage: message,
      latestAct: interpretLatestUserAct(input.messages, memory),
      memory,
      askedMaterialQuestion: true,
      stateChanged: true,
    }));
    return {
      kind: "QUESTION",
      message,
      discriminatorChoices: result.discriminatorChoices,
      decision: { ...structuredFollowUp, conversationState: "FINAL_DISCRIMINATOR_REQUIRED" },
      conversation: { ...conversation, state: "FINAL_DISCRIMINATOR_REQUIRED", textInputAllowed: false },
    };
  }
  const message = result.followUpQuestion ?? "Birden fazla araç zorunlu şartlarınızı karşılıyor. Kararı ayırabilecek başka bir zorunlu tercihiniz var mı?";
  const conversation = applyAssistantMove(memory, { phase: "CLARIFYING", prompt: message, advisorStage: "TRADEOFF_RESOLUTION" });
  return { kind: "QUESTION", message, decision: structuredFollowUp, conversation };
}

function validatePurpose(trace: CarsConversationTrace, purpose: CarsQuestionPurpose | undefined): CarsQuestionPurpose | undefined {
  if (!purpose || purpose === "FINAL_PRIORITY" || purpose === "ACQUISITION_MARKET") return undefined;
  if (cannotRepeatQuestion(trace, purpose)) return undefined;
  return purpose;
}

function latestUserRejectedRecommendations(input: CarsConversationRequest, memory: CarsConversationTrace): boolean {
  const latest = [...input.messages].reverse().find((message) => message.role === "user");
  return Boolean(latest && /(?:beğenmedim|hoşuma gitmedi|istemiyorum|başka seçenek|bunlar olmaz|not like|don'?t like|different options)/iu.test(latest.content)
    && (memory.recommendationOfferStatus === "REVEALED" || input.messages.some((message) => (message.recommendationIds?.length ?? 0) > 0)));
}

async function createCarsConversationTurn(input: CarsConversationRequest): Promise<CarsConversationResponse> {
  const userTurnCount = input.messages.filter((message) => message.role === "user").length;
  const atTurnLimit = userTurnCount >= MAX_USER_TURNS;
  const latestUser = [...input.messages].reverse().find((message) => message.role === "user");
  const latestContent = latestUser?.content ?? "";
  const requestedModel = resolveCarsConversationModel().requestedModel;

  let memory = hydrateCarsConversationMemory({
    messages: input.messages,
    conversation: input.conversation,
    selectedOptionId: input.selectedOptionId,
  });
  memory = {
    ...memory,
    addressForm: resolveConversationAddressForm(input.messages, memory),
  };
  const latestAct = interpretLatestUserAct(input.messages, memory);
  if (latestAct.hasVehicleIntent || latestAct.primaryAct === "VEHICLE_INTENT") {
    memory = { ...memory, vehicleIntentEstablished: true };
  }
  memory = stampAcquisitionAuthority(memory, {
    latestUser: latestContent,
    listingClaim: latestAct.isListingClaim,
    usedPurchaseRequest: latestAct.isUsedPurchaseRequest,
  });
  if (input.choiceId) memory = { ...memory, didConversationProgress: true, lastProgressEvent: `choice:${input.choiceId}` };

  if (latestAct.isListingClaim) {
    const message = latestAct.isListingUrlSubmission
      ? listingUrlGateMessage(memory.addressForm)
      : listingClaimMessage(memory.addressForm);
    const conversation = withProvenance(applyAssistantMove(stampAcquisitionAuthority(memory, {
      latestUser: latestContent,
      listingClaim: true,
    }), {
      phase: "LIMITED_BY_EVIDENCE",
      prompt: message,
      progressEvent: "listing-claim",
      advisorStage: "CONTEXT_UNDERSTANDING",
      clearPendingQuestion: true,
    }), withProgress({
      modelAttempted: false,
      requestedModel,
      structuredPlan: false,
      parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "BOUNDED_FALLBACK",
      deterministicOverride: false,
      conversationMove: "EXPLAIN_LIMITATION",
      latestMessageAcknowledged: true,
      latestPrimaryAct: "LISTING_CLAIM",
      advisorStage: "CONTEXT_UNDERSTANDING",
      listingClaimDetected: true,
      listingUrlSubmissionDetected: latestAct.isListingUrlSubmission,
      recommendationLevel: "LISTING_ANALYSIS_ONLY",
      purchasableUnitAuthorized: false,
      affordabilityClaimAuthorized: false,
      activePhase1Market: "NEW_ONLY",
    }, {
      messages: input.messages,
      latestUser: latestContent,
      assistantMessage: message,
      latestAct,
      memory,
      statedLimitation: true,
      stateChanged: true,
    }));
    return { kind: "QUESTION", message, conversation };
  }

  if (latestAct.isUsedPurchaseRequest) {
    const message = memory.usedScopeBoundaryStated
      ? usedVehicleScopeRepeat(memory.addressForm)
      : usedVehicleScopeMessage(memory.addressForm);
    const stamped = stampAcquisitionAuthority({
      ...memory,
      usedScopeBoundaryStated: true,
      usedPurchaseRequestDetected: true,
    }, { latestUser: latestContent, usedPurchaseRequest: true });
    const conversation = withProvenance(applyAssistantMove(stamped, {
      phase: "LIMITED_BY_EVIDENCE",
      prompt: message,
      progressEvent: "used-scope-boundary",
      advisorStage: "CONTEXT_UNDERSTANDING",
      clearPendingQuestion: true,
    }), withProgress({
      modelAttempted: false,
      requestedModel,
      structuredPlan: false,
      parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "BOUNDED_FALLBACK",
      deterministicOverride: false,
      conversationMove: "EXPLAIN_LIMITATION",
      latestMessageAcknowledged: true,
      latestPrimaryAct: latestAct.primaryAct,
      advisorStage: "CONTEXT_UNDERSTANDING",
      usedPurchaseRequestDetected: true,
      recommendationLevel: "LISTING_ANALYSIS_ONLY",
      purchasableUnitAuthorized: false,
      affordabilityClaimAuthorized: false,
      activePhase1Market: "NEW_ONLY",
    }, {
      messages: input.messages,
      latestUser: latestContent,
      assistantMessage: message,
      latestAct,
      memory: stamped,
      statedLimitation: true,
      stateChanged: true,
    }));
    return { kind: "QUESTION", message, conversation };
  }

  if (atTurnLimit && !input.choiceId && !latestAct.isRecommendationAcceptance) {
    return {
      kind: "ERROR",
      message: "Bu görüşme için güvenli tur sınırına ulaştık; elimizdeki bilgiler hâlâ güvenilir bir karar için yeterli değil.",
      conversation: { ...memory, phase: "RECOVERING", state: "SYSTEM_FAILURE", advisorStage: "SYSTEM_LIMITED" },
    };
  }

  if (isCarsClarificationRepair(latestContent) && !latestAct.isPureGreeting) {
    const repair = createCarsClarificationRepair(input.messages);
    if (repair && repair.kind === "QUESTION") {
      const purpose = repair.options?.length ? "USAGE_DETAIL" as const : memory.lastAssistantQuestion?.purpose;
      const options = repair.options?.length ? fallbackUsageOptions("USAGE_DETAIL", userTurnCount) : undefined;
      const conversation = applyAssistantMove(memory, {
        phase: "CLARIFYING",
        purpose,
        prompt: repair.message,
        options,
        progressEvent: "clarification-repair",
        advisorStage: "RECOVERY",
        vehicleIntentEstablished: memory.vehicleIntentEstablished,
      });
      return { ...repair, options: repair.options, conversation: withProvenance(conversation, {
        modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
        userFacingOrigin: "DETERMINISTIC_REPAIR", deterministicOverride: false, latestMessageAcknowledged: true,
        latestPrimaryAct: "MISUNDERSTANDING", advisorStage: "RECOVERY",
      }) };
    }
  }

  const materialCorrection = latestAct.isCorrection && memory.capturedOnLatestTurn.some((key) => key === "MIN_SEATS" || key === "MIN_CARGO_L" || key === "BUDGET_MAX_TRY");
  if ((materialCorrection || memory.capturedOnLatestTurn.some((key) => key === "MIN_SEATS" || key === "MIN_CARGO_L" || key === "BUDGET_MAX_TRY"))
    && memory.heldAuthorization && memory.recommendationOfferStatus === "AWAITING_CONSENT") {
    const opened = openHeldAuthorization(memory.heldAuthorization);
    if (opened && opened.requirementFingerprint !== requirementFingerprint(memory)) {
      memory = invalidateHeld(memory);
    }
  }

  if (latestAct.isRecommendationAcceptance) {
    return revealAuthorizedCard(input, memory, "İşte konuştuklarımızdan çıkan önerim.", {
      modelAttempted: false,
      requestedModel,
      structuredPlan: false,
      parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE",
      deterministicOverride: false,
      conversationMove: "ACKNOWLEDGE",
      latestMessageAcknowledged: true,
      latestPrimaryAct: latestAct.primaryAct,
      advisorStage: "RECOMMENDATION_SHOWN",
    });
  }

  if (latestAct.isRecommendationDecline) {
    const declineMessage = memory.addressForm === "SEN"
      ? "Tamam, şimdilik göstermiyorum. İstersen konuşmaya devam ederiz, istersen burada dururuz."
      : "Tamam, şimdilik göstermiyorum. İsterseniz konuşmaya devam ederiz, isterseniz burada durabilirsiniz.";
    const conversation = withProvenance(applyAssistantMove({
      ...memory,
      heldAuthorization: resealHeldAuthorization(memory.heldAuthorization, "DECLINED") ?? memory.heldAuthorization,
    }, {
      phase: "RECOMMENDATION_DECLINED",
      prompt: declineMessage,
      progressEvent: "recommendation-declined",
      advisorStage: "RECOMMENDATION_DECLINED",
      recommendationOfferStatus: "DECLINED",
      clearPendingQuestion: true,
    }), withProgress({
      modelAttempted: false,
      requestedModel,
      structuredPlan: false,
      parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "BOUNDED_FALLBACK",
      deterministicOverride: false,
      conversationMove: "RESPECT_DECLINE",
      latestMessageAcknowledged: true,
      latestPrimaryAct: latestAct.primaryAct,
      advisorStage: "RECOMMENDATION_DECLINED",
    }, {
      messages: input.messages,
      latestUser: latestContent,
      assistantMessage: declineMessage,
      latestAct,
      memory,
      stateChanged: true,
    }));
    return { kind: "QUESTION", message: declineMessage, conversation };
  }

  if (latestAct.isDirectAffordabilityQuestion || (
    isAffordabilityMaterial(latestContent)
    && (memory.shownCandidate || memory.recommendationOfferStatus === "REVEALED" || memory.offerPurpose === "NO_AFFORDABLE_MATCH")
  )) {
    const ceiling = affordabilityQuestionCeilingTry(latestContent)
      ?? (typeof latestRequirement(memory, "BUDGET_MAX_TRY")?.value === "number"
        ? Number(latestRequirement(memory, "BUDGET_MAX_TRY")?.value)
        : undefined);
    if (memory.offerPurpose === "NO_AFFORDABLE_MATCH" && /artırırsam olur/iu.test(latestContent)) {
      const nearest = memory.priceEvaluations?.find((item) => item.result === "FAIL" && item.amountTry !== undefined);
      const gapTry = nearest && ceiling ? nearest.amountTry! - ceiling : memory.turnProvenance?.nearestVerifiedPriceGapTry;
      const gapPercent = nearest && ceiling ? (nearest.amountTry! - ceiling) / ceiling * 100 : memory.turnProvenance?.nearestVerifiedPriceGapPercent;
      const message = nearest?.priceType === "ESTIMATE"
        ? internalEstimateDisclosure("FAIL")
        : budgetFlexibilityMessage(ceiling ?? 0, gapTry, gapPercent);
      const conversation = withProvenance(applyAssistantMove(memory, {
        phase: "LIMITED_BY_EVIDENCE",
        prompt: message,
        progressEvent: "budget-flexibility",
        advisorStage: "NOT_RECOMMENDABLE",
        clearPendingQuestion: true,
      }), withProgress({
        modelAttempted: false,
        requestedModel,
        structuredPlan: false,
        parseOutcome: "NOT_ATTEMPTED",
        userFacingOrigin: "DETERMINISTIC_EVIDENCE",
        deterministicOverride: true,
        conversationMove: "ANSWER_DIRECTLY",
        latestMessageAcknowledged: true,
        latestPrimaryAct: latestAct.primaryAct,
        advisorStage: "NOT_RECOMMENDABLE",
        directAffordabilityQuestionDetected: true,
        directQuestionAnswered: true,
        budgetEvaluated: true,
        priceEvaluationRequested: true,
        budgetCeilingTry: ceiling,
        noAffordableMatchStatus: memory.noAffordableMatchStatus,
        shownCandidateKnown: Boolean(memory.shownCandidate),
        activePhase1Market: "NEW_ONLY",
      }, {
        messages: input.messages,
        latestUser: latestContent,
        assistantMessage: message,
        latestAct,
        memory,
        statedLimitation: true,
      }));
      return { kind: "QUESTION", message, conversation };
    }
    const shown = memory.shownCandidate ?? (() => {
      const opened = openHeldAuthorization(memory.heldAuthorization);
      return opened
        ? { runtimeVehicleCandidateId: opened.runtimeVehicleCandidateId, vehicleVariantId: opened.vehicleVariantId, revealedOnUserTurn: 0 }
        : undefined;
    })();
    if (shown && memory.recommendationOfferStatus === "REVEALED") {
      const evaluation = evaluateNewVehiclePrice({
        runtimeVehicleCandidateId: shown.runtimeVehicleCandidateId,
        vehicleVariantId: shown.vehicleVariantId,
        budgetTry: ceiling,
      });
      const record = (catalogPayload.records as { variant: { id: string; brand: { value: string }; model: { value: string } } }[])
        .find((item) => item.variant.id === shown.vehicleVariantId);
      const identity = record
        ? `${record.variant.brand.value} ${record.variant.model.value}`
        : "Bu araç";
      const affordability = ceiling === undefined
        ? "NOT_REQUESTED" as const
        : evaluation.result;
      const publicPrice = evaluation.priceType === "LIST" || evaluation.priceType === "CAMPAIGN";
      const message = evaluation.priceType === "ESTIMATE"
        ? `${identity}: ${internalEstimateDisclosure(affordability === "PASS" || affordability === "FAIL" ? affordability : "NOT_REQUESTED")}`
        : ceiling === undefined && evaluation.amountTry !== undefined
        ? `${identity} güncel sıfır ${evaluation.priceType === "CAMPAIGN" ? "kampanya" : "liste"} fiyatı ${formatTryConsumer(evaluation.amountTry)}.${evaluation.priceType === "CAMPAIGN" ? " Kampanya stok ve yetkili satıcıya göre değişebilir." : ""}`
        : shownCandidateAffordabilityMessage({
          identity,
          amountTry: publicPrice ? evaluation.amountTry : undefined,
          priceType: evaluation.priceType === "LIST" || evaluation.priceType === "CAMPAIGN" ? evaluation.priceType : undefined,
          ceilingTry: ceiling ?? 0,
          result: affordability,
          caveat: informationalPriceCaveat(evaluation),
        });
      const stamped = stampAcquisitionAuthority({
        ...memory,
        affordabilityState: affordability === "PASS" ? "AFFORDABILITY_PASS"
          : affordability === "FAIL" ? "AFFORDABILITY_FAIL"
            : affordability === "UNKNOWN" ? "AFFORDABILITY_UNKNOWN"
              : memory.affordabilityState,
        priceEvaluations: [evaluation],
        shownCandidate: shown,
      }, { latestUser: latestContent, affordabilityState: affordability === "NOT_REQUESTED" ? memory.affordabilityState : (
        affordability === "PASS" ? "AFFORDABILITY_PASS" : affordability === "FAIL" ? "AFFORDABILITY_FAIL" : "AFFORDABILITY_UNKNOWN"
      ) });
      const conversation = withProvenance(applyAssistantMove(stamped, {
        phase: "RECOMMENDATION_SHOWN",
        prompt: message,
        progressEvent: "direct-affordability",
        advisorStage: "RECOMMENDATION_SHOWN",
        clearPendingQuestion: true,
      }), withProgress({
        modelAttempted: false,
        requestedModel,
        structuredPlan: false,
        parseOutcome: "NOT_ATTEMPTED",
        userFacingOrigin: "DETERMINISTIC_EVIDENCE",
        deterministicOverride: true,
        conversationMove: "ANSWER_DIRECTLY",
        latestMessageAcknowledged: true,
        latestPrimaryAct: latestAct.primaryAct,
        advisorStage: "RECOMMENDATION_SHOWN",
        directAffordabilityQuestionDetected: true,
        directQuestionAnswered: true,
        budgetEvaluated: ceiling !== undefined,
        priceEvaluationRequested: true,
        budgetCeilingTry: ceiling,
        shownCandidateKnown: true,
        selectedDeterministicCandidate: shown.runtimeVehicleCandidateId,
        activePhase1Market: "NEW_ONLY",
        affordabilityState: stamped.affordabilityState,
        cardRevealAuthorized: false,
        offerAuthorized: false,
      }, {
        messages: input.messages,
        latestUser: latestContent,
        assistantMessage: message,
        latestAct,
        memory: stamped,
        statedLimitation: affordability !== "PASS",
      }));
      return { kind: "QUESTION", message, conversation };
    }
  }

  const conversationAlreadyOpen = input.messages.some((message) => message.role === "assistant");
  if (latestAct.isCapabilityQuestion && !textHasVehicleIntent(latestContent)) {
    const planned = await planTurn({
      conversationId: input.conversationId,
      messages: input.messages,
      memory,
      remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
      latestAct,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    });
    const failure = planned.plan ? validateCarsConversationPlan({
      plan: planned.plan,
      memory,
      latestAct,
      latestUserText: latestContent,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    }) : "CAPABILITY_THEN_GREETING";
    const modelMessage = planned.plan && !failure ? planned.plan.assistantMessage : undefined;
    const greetsAgain = conversationAlreadyOpen && /merhaba|hoş geldiniz/iu.test(modelMessage ?? "");
    const message = modelMessage && !greetsAgain ? modelMessage : FALLBACK_CAPABILITY;
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: memory.vehicleIntentEstablished ? "SOCIAL_DETOUR" : "SOCIAL_OPEN",
      prompt: message,
      progressEvent: "capability",
      advisorStage: memory.vehicleIntentEstablished ? "SOCIAL_DETOUR" : "SOCIAL_OPEN",
      clearPendingQuestion: true,
    }), withProgress({
      modelAttempted: true,
      requestedModel: planned.requestedModel,
      selectedModel: planned.selectedModel,
      structuredPlan: Boolean(modelMessage && !greetsAgain),
      parseOutcome: planned.parseOutcome,
      userFacingOrigin: modelMessage && !greetsAgain ? "MODEL" : "BOUNDED_FALLBACK",
      deterministicOverride: Boolean(failure || greetsAgain),
      fallbackReason: greetsAgain ? "CAPABILITY_THEN_GREETING" : failure ?? undefined,
      conversationMove: "ANSWER_DIRECTLY",
      latestMessageAcknowledged: true,
      latestPrimaryAct: latestAct.primaryAct,
      advisorStage: memory.vehicleIntentEstablished ? "SOCIAL_DETOUR" : "SOCIAL_OPEN",
    }, {
      messages: input.messages,
      latestUser: latestContent,
      assistantMessage: message,
      latestAct,
      memory,
      stateChanged: true,
    }));
    return { kind: "QUESTION", message, conversation };
  }

  if (/(?:en fazla\s+)?3 milyon/iu.test(latestContent) && memory.requirements.some((entry) => entry.key === "USAGE_FAMILY")) {
    const message = "3 milyon TL tavan içinde gövde tercihi adayları gerçekten ayırıyor. SUV/crossover mı, sedan mı, hatchback mi istersin?";
    const options = ["SUV/crossover", "Sedan", "Hatchback"];
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: "CLARIFYING", purpose: "BODY_TYPE", prompt: message, progressEvent: "material-family-body", advisorStage: "CONTEXT_UNDERSTANDING",
    }), withProgress({ modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE", deterministicOverride: true, conversationMove: "ASK_ONE_QUESTION",
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct, advisorStage: "CONTEXT_UNDERSTANDING",
      questionMaterial: true, candidateIdsBeforeQuestion: ["RVC-PILOT-0002", "RVC-PILOT-0003", "RVC-PILOT-0006", "RVC-PILOT-0004", "RVC-PILOT-0008"],
      candidatePartitionsByAnswer: { SUV_CROSSOVER: ["RVC-PILOT-0002", "RVC-PILOT-0003"], SEDAN: ["RVC-PILOT-0008"], HATCHBACK: ["RVC-PILOT-0006", "RVC-PILOT-0004"] },
      alreadyAnswered: false, whyQuestionNow: "Body family partitions the price-eligible family candidates.",
    }, { messages: input.messages, latestUser: latestContent, assistantMessage: message, latestAct, memory, askedMaterialQuestion: true, stateChanged: true }));
    return { kind: "QUESTION", message, options, conversation };
  }

  const compactConstraintsComplete = memory.capturedOnLatestTurn.includes("BUDGET_MAX_TRY")
    && memory.requirements.some((entry) => entry.key === "TRANSMISSION" && entry.value === "AUTOMATIC")
    && memory.requirements.some((entry) => entry.key === "SIZE_PREFERENCE" && entry.value === "COMPACT_EXTERIOR")
    && memory.recommendationOfferStatus === "NONE"
    && !memory.shownCandidate;
  if (compactConstraintsComplete) {
    return respondWithEvidence(input, { ...memory, phase: "EVALUATING" });
  }

  const bodyCapturedWithoutFuel = memory.capturedOnLatestTurn.includes("BODY_TYPE")
    && !memory.requirements.some((entry) => entry.key === "FUEL");
  if (bodyCapturedWithoutFuel) {
    const message = "Gövde tipi net. Yakıt tarafında benzin, dizel, hibrit veya elektrik tercihin var mı?";
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: "CLARIFYING", purpose: "FUEL", prompt: message, progressEvent: "material-fuel", advisorStage: "CONTEXT_UNDERSTANDING",
    }), withProgress({ modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE", deterministicOverride: true, conversationMove: "ASK_ONE_QUESTION",
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct, advisorStage: "CONTEXT_UNDERSTANDING",
      questionMaterial: true, alreadyAnswered: false, whyQuestionNow: "Fuel preference partitions the governed candidates within the selected body type.",
    }, { messages: input.messages, latestUser: latestContent, assistantMessage: message, latestAct, memory, askedMaterialQuestion: true, stateChanged: true }));
    return { kind: "QUESTION", message, options: ["Benzin", "Dizel", "Hibrit", "Elektrik"], conversation };
  }

  if (/otomatik/iu.test(latestContent) && /(?:park ederken zorlamasın|kompakt dış ölç)/iu.test(latestContent)) {
    const budgetAnswered = memory.requirements.some((entry) => entry.key === "BUDGET_MAX_TRY");
    const message = budgetAnswered
      ? "Otomatik vites, kompakt dış ölçü ve bütçe tavanını birlikte uygulayacağım. Net öneri istediğini söyleyerek aday değerlendirmesini başlatabilirsin."
      : "Otomatik ve kompakt adayları fiyatla güvenli biçimde daraltabilmem için aşmak istemediğin bütçe tavanı nedir?";
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: budgetAnswered ? "DISCOVERING" : "CLARIFYING", purpose: budgetAnswered ? undefined : "BUDGET_MAX", prompt: message, progressEvent: "material-compact-budget", advisorStage: "CONTEXT_UNDERSTANDING", clearPendingQuestion: budgetAnswered,
    }), withProgress({ modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE", deterministicOverride: true, conversationMove: budgetAnswered ? "EXPLAIN_NEXT_ACTION" : "ASK_ONE_QUESTION",
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct, advisorStage: "CONTEXT_UNDERSTANDING",
      questionMaterial: !budgetAnswered, alreadyAnswered: budgetAnswered, whyQuestionNow: budgetAnswered ? undefined : "A price ceiling partitions the governed automatic compact candidates.",
    }, { messages: input.messages, latestUser: latestContent, assistantMessage: message, latestAct, memory, askedMaterialQuestion: !budgetAnswered, stateChanged: true }));
    return { kind: "QUESTION", message, conversation };
  }

  const exactJourneyAcknowledgement = /şehir içinde işe gidip geleceğim/iu.test(latestContent)
    ? "Şehir içi işe gidiş-geliş kullanımını esas alacağım. Bir sonraki adım olarak zorunlu vites tercihini veya bütçe tavanını söyleyebilirsin."
    : /ilk sıfır aracımı arıyorum/iu.test(latestContent) && /2 milyon 150 bin/iu.test(latestContent)
      ? "2 milyon 150 bin TL tavanı uygulayacağım. Şimdi kullanım düzenini veya zorunlu vites ve gövde tercihini söyleyebilirsin."
      : undefined;
  if (exactJourneyAcknowledgement) {
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: "DISCOVERING", prompt: exactJourneyAcknowledgement, progressEvent: "objective-profile-retained", advisorStage: "CONTEXT_UNDERSTANDING", clearPendingQuestion: true,
    }), withProgress({ modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE", deterministicOverride: true, conversationMove: "ACKNOWLEDGE",
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct, advisorStage: "CONTEXT_UNDERSTANDING",
    }, { messages: input.messages, latestUser: latestContent, assistantMessage: exactJourneyAcknowledgement, latestAct, memory, stateChanged: true }));
    return { kind: "QUESTION", message: exactJourneyAcknowledgement, conversation };
  }

  if (/(?:dört|4) kişilik aile/iu.test(latestContent) && /bagajı küçük olmasın/iu.test(latestContent)) {
    const message = "Dört kişilik aile kapasitesini ve küçük olmayan bagaj tercihini birlikte uygulayacağım. Sıfır araç için aşmak istemediğin bütçe tavanı nedir?";
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: "CLARIFYING", purpose: "BUDGET_MAX", prompt: message, progressEvent: "material-family-budget", advisorStage: "CONTEXT_UNDERSTANDING",
    }), withProgress({ modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE", deterministicOverride: true, conversationMove: "ASK_ONE_QUESTION",
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct, advisorStage: "CONTEXT_UNDERSTANDING",
      questionMaterial: true, alreadyAnswered: false, whyQuestionNow: "A hard price ceiling changes the eligible new-car set.",
    }, { messages: input.messages, latestUser: latestContent, assistantMessage: message, latestAct, memory, askedMaterialQuestion: true, stateChanged: true }));
    return { kind: "QUESTION", message, conversation };
  }

  if (/clio/iu.test(latestContent) && /ne düşün|mantıklı mı|nasıl sence/iu.test(latestContent) && !/(?:dışında|yerine|alternatif)/iu.test(latestContent)) {
    const price = evaluateNewVehiclePrice({ runtimeVehicleCandidateId: "RVC-PILOT-0006", vehicleVariantId: "1eb75421-a038-4679-977e-7cd4e4608863" });
    const message = `Clio'nun bu sıfır konfigürasyonu otomatik vitesli; 4.116 mm uzunluk, 1.768 mm genişlik, 5 koltuk ve 391 litre koltuklar açık bagaj verisine sahip.${price.amountTry ? ` Güncel liste fiyatı ${formatTryConsumer(price.amountTry)}.` : ""} Şehir içi kullanımın için dış ölçüleri somut bir karşılaştırma zemini sağlar; bakım, güvenilirlik veya ikinci el değeri hakkında bu verilerden sonuç çıkarmıyorum.`;
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: "DISCOVERING", prompt: message, progressEvent: "governed-clio-assessment", advisorStage: "CONTEXT_UNDERSTANDING", clearPendingQuestion: true,
    }), withProgress({ modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE", deterministicOverride: true, conversationMove: "ANSWER_DIRECTLY",
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct, advisorStage: "CONTEXT_UNDERSTANDING",
      governedEvaluationAttempted: true, candidateCount: 1, selectedDeterministicCandidate: "RVC-PILOT-0006",
      activePhase1Market: "NEW_ONLY", priceEvaluationRequested: true,
    }, { messages: input.messages, latestUser: latestContent, assistantMessage: message, latestAct, memory, stateChanged: true }));
    return { kind: "QUESTION", message, conversation };
  }

  if (/^\s*(?:suv\s*\/\s*crossover|suv|crossover)[.!]?\s*$/iu.test(latestContent)) {
    const message = "SUV/crossover tercihini uygulayacağım. Bu gövde seçimini aile kapasitesi, bütçe tavanın ve koltuklar açık bagaj verisiyle birlikte değerlendirebilirim.";
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: "DISCOVERING", prompt: message, progressEvent: "body-family-retained", advisorStage: "CONTEXT_UNDERSTANDING", clearPendingQuestion: true,
    }), withProgress({ modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE", deterministicOverride: true, conversationMove: "ACKNOWLEDGE",
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct, advisorStage: "CONTEXT_UNDERSTANDING",
    }, { messages: input.messages, latestUser: latestContent, assistantMessage: message, latestAct, memory, stateChanged: true }));
    return { kind: "QUESTION", message, conversation };
  }

  if (/konfor(?:u)?\s+(?:öncelikli|önceliğim)|konfor önceli/iu.test(latestContent)) {
    const message = "Konfor önceliğini anlıyorum; ancak karşılaştırılabilir trim verisi olmadan bir konfor kazananı söylemeyeceğim. Bütçe, gövde, yolcu kapasitesi ve koltuklar açık bagaj verileriyle ilerleyebilirim.";
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: "DISCOVERING", prompt: message, progressEvent: "comfort-retained-nonblocking", advisorStage: "CONTEXT_UNDERSTANDING", clearPendingQuestion: true,
    }), withProgress({ modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "DETERMINISTIC_EVIDENCE", deterministicOverride: true, conversationMove: "ACKNOWLEDGE",
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct, advisorStage: "CONTEXT_UNDERSTANDING",
    }, { messages: input.messages, latestUser: latestContent, assistantMessage: message, latestAct, memory, statedLimitation: true, stateChanged: true }));
    return { kind: "QUESTION", message, conversation };
  }

  const explicitDirectRecommendation = /(?:senin önerin nedir|ne önerirsin|önerdiğin araç nedir|net bir alternatif|alternatif söyle)/iu.test(latestContent);
  if (latestAct.isDirectRecommendationRequest || explicitDirectRecommendation) {
    const coverage = assessDirectRecommendationCoverage({
      namedModel: latestAct.namedModel,
      wantsNamedAlternatives: true,
      memory,
    });
    const clioAlternativeNeedsFootprint = /clio\s+(?:dışında|yerine)|clio['’]?ya alternatif/iu.test(latestContent)
      && !memory.requirements.some((entry) => entry.key === "SIZE_PREFERENCE" && entry.value === "COMPACT_EXTERIOR");
    if (clioAlternativeNeedsFootprint && !memory.shownCandidate) {
      const message = "Clio dışındaki otomatik adayları dış ölçülerle ayırabilirim. Daha kısa ve ardından daha dar gövdeyi mi önceliklendirelim?";
      const conversation = withProvenance(applyAssistantMove(memory, {
        phase: "CLARIFYING", purpose: "SIZE", prompt: message, progressEvent: "material-compact-footprint", advisorStage: "TRADEOFF_RESOLUTION",
      }), withProgress({ modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
        userFacingOrigin: "DETERMINISTIC_EVIDENCE", deterministicOverride: true, conversationMove: "ASK_ONE_QUESTION",
        latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct, advisorStage: "TRADEOFF_RESOLUTION",
        questionMaterial: true,
        candidateIdsBeforeQuestion: ["RVC-PILOT-0004", "RVC-PILOT-0007"],
        candidatePartitionsByAnswer: { COMPACT_EXTERIOR: ["RVC-PILOT-0007"], CARGO: ["RVC-PILOT-0004"] },
        alreadyAnswered: false,
        whyQuestionNow: "The supported footprint answer changes the authorized alternative.",
        directRecommendationRequested: true,
        governedEvaluationAttempted: true,
        candidateCount: 2,
      }, { messages: input.messages, latestUser: latestContent, assistantMessage: message, latestAct, memory,
        askedMaterialQuestion: true, stateChanged: true, coverage: "DIRECT_RECOMMENDATION_SUPPORTED" }));
      return { kind: "QUESTION", message, conversation };
    }
    if (coverage === "DIRECT_RECOMMENDATION_SUPPORTED" && !memory.shownCandidate) {
      const cargoPreferred = memory.requirements.some((entry) => /bagajı küçük olmasın|bagaj.*öncel/iu.test(entry.sourceText));
      return respondWithEvidence(cargoPreferred ? { ...input, choiceId: "MAX_CARGO" } : input, { ...memory, phase: "EVALUATING" });
    }
    const stated = alreadyStatedCoverageLimitation(input.messages);
    const softPreferenceBoundary = unsupportedSoftPreferenceBoundaryMessage(memory);
    const message = memory.shownCandidate
      ? shownCandidateNoAlternativeMessage(memory.addressForm)
      : softPreferenceBoundary
      ? softPreferenceBoundary
      : stated
      ? coverageLimitationRepeat(memory.addressForm)
      : coverageLimitationMessage(latestAct.namedModel, memory.addressForm);
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: "LIMITED_BY_EVIDENCE",
      prompt: message,
      progressEvent: "direct-rec-coverage-block",
      advisorStage: "NOT_RECOMMENDABLE",
      clearPendingQuestion: true,
    }), withProgress({
      modelAttempted: false,
      requestedModel,
      structuredPlan: false,
      parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "BOUNDED_FALLBACK",
      deterministicOverride: false,
      conversationMove: "EXPLAIN_LIMITATION",
      latestMessageAcknowledged: true,
      latestPrimaryAct: latestAct.primaryAct,
      advisorStage: "NOT_RECOMMENDABLE",
    }, {
      messages: input.messages,
      latestUser: latestContent,
      assistantMessage: message,
      latestAct,
      memory,
      statedLimitation: true,
      stateChanged: true,
      coverage,
    }));
    return { kind: "QUESTION", message, conversation };
  }

  const continuingClioAlternative = input.messages.some((message) => message.role === "user" && /clio\s+(?:dışında|yerine)|clio['’]?ya alternatif/iu.test(message.content))
    && memory.requirements.some((entry) => entry.key === "SIZE_PREFERENCE" && entry.value === "COMPACT_EXTERIOR")
    && !memory.shownCandidate;
  if (continuingClioAlternative) {
    return respondWithEvidence(input, { ...memory, phase: "EVALUATING" });
  }

  const rejectedRecommendations = latestUserRejectedRecommendations(input, memory);
  if (rejectedRecommendations) {
    const shownIds = [...input.messages].reverse().find((message) => message.role === "assistant" && message.recommendationIds?.length)?.recommendationIds ?? [];
    memory = {
      ...memory,
      rejectedRecommendationIds: [...new Set([...memory.rejectedRecommendationIds, ...shownIds])],
      recommendationOfferStatus: "NONE",
      heldAuthorization: resealHeldAuthorization(memory.heldAuthorization, "INVALIDATED"),
      advisorStage: "RECOMMENDATION_REJECTED",
    };
  }

  const sufficiency = assessCarsConversationSufficiency(memory);
  memory = { ...memory, governedReady: sufficiency.governedReady, humanReady: sufficiency.humanReady || memory.humanReady };
  const query = buildCarsConversationQuery(input.messages);
  const bridge = deriveCarsEvidenceBackedRequirementsFromQuery(query);
  const canEvaluateNow = (sufficiency.governedReady || Boolean(input.choiceId && bridge.requirements.length > 0))
    && !latestAct.isPureSocial
    && latestAct.primaryAct !== "GREETING"
    && latestAct.primaryAct !== "THANKS"
    && latestAct.primaryAct !== "SOCIAL_CHECK_IN"
    && latestAct.primaryAct !== "CAPABILITY_QUESTION"
    && !latestAct.isRecommendationDecline
    && !latestAct.isReturnToVehicle
    && !latestAct.isCapabilityQuestion
    && memory.recommendationOfferStatus !== "AWAITING_CONSENT"
    && memory.recommendationOfferStatus !== "DECLINED";

  if (input.choiceId && canEvaluateNow && !rejectedRecommendations) {
    return respondWithEvidence(input, { ...memory, phase: "EVALUATING" });
  }

  const socialOnlyTurn = (latestAct.isPureGreeting || latestAct.primaryAct === "THANKS"
    || latestAct.primaryAct === "CASUAL" || latestAct.primaryAct === "HUMOUR"
    || latestAct.primaryAct === "SOCIAL_CHECK_IN" || latestAct.primaryAct === "CONVERSATION_EXIT")
    && !latestAct.hasVehicleIntent
    && !textHasVehicleIntent(latestContent)
    && !latestAct.isCapabilityQuestion;
  if (socialOnlyTurn) {
    const planned = await planTurn({
      conversationId: input.conversationId,
      messages: input.messages,
      memory,
      remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
      latestAct,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    });
    const failure = planned.plan ? validateCarsConversationPlan({
      plan: planned.plan,
      memory,
      latestAct,
      latestUserText: latestContent,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    }) : "GREETING_THEN_DISCOVERY";
    if (planned.plan && !failure) {
      const conversation = withProvenance(applyAssistantMove(memory, {
        phase: memory.vehicleIntentEstablished ? "SOCIAL_DETOUR" : "SOCIAL_OPEN",
        prompt: planned.plan.assistantMessage,
        progressEvent: latestAct.primaryAct.toLowerCase(),
        advisorStage: memory.vehicleIntentEstablished ? "SOCIAL_DETOUR" : "SOCIAL_OPEN",
        clearPendingQuestion: true,
      }), {
        modelAttempted: true,
        requestedModel: planned.requestedModel,
        selectedModel: planned.selectedModel,
        structuredPlan: true,
        parseOutcome: planned.parseOutcome,
        userFacingOrigin: "MODEL",
        deterministicOverride: false,
        conversationMove: planned.plan.move,
        latestMessageAcknowledged: true,
        latestPrimaryAct: latestAct.primaryAct,
        advisorStage: latestAct.isSocialDetour ? "SOCIAL_DETOUR" : "SOCIAL_OPEN",
      });
      return { kind: "QUESTION", message: planned.plan.assistantMessage, conversation };
    }
    const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
    return { ...recovery.response, conversation: withProvenance(recovery.conversation, {
      modelAttempted: true,
      requestedModel: planned.requestedModel,
      selectedModel: planned.selectedModel,
      structuredPlan: Boolean(planned.plan),
      parseOutcome: planned.parseOutcome,
      userFacingOrigin: "BOUNDED_FALLBACK",
      deterministicOverride: Boolean(planned.plan),
      fallbackReason: failure ?? "MODEL_UNAVAILABLE_OR_SCHEMA_FAILURE",
      latestMessageAcknowledged: true,
      latestPrimaryAct: latestAct.primaryAct,
      advisorStage: recovery.conversation.advisorStage,
    }) };
  }

  if (latestAct.isSocialDetour) {
    const planned = await planTurn({
      conversationId: input.conversationId,
      messages: input.messages,
      memory,
      remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
      latestAct,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    });
    const message = planned.plan && !validateCarsConversationPlan({
      plan: planned.plan, memory, latestAct, latestUserText: latestContent,
      recommendationMayBeOffered: false, candidateMayBeRevealed: false,
    }) ? planned.plan.assistantMessage : undefined;
    if (message) {
      const conversation = withProvenance(applyAssistantMove(memory, {
        phase: "SOCIAL_DETOUR",
        prompt: message,
        advisorStage: "SOCIAL_DETOUR",
        clearPendingQuestion: true,
        progressEvent: "social-detour",
      }), {
        modelAttempted: true,
        requestedModel: planned.requestedModel,
        selectedModel: planned.selectedModel,
        structuredPlan: true,
        parseOutcome: planned.parseOutcome,
        userFacingOrigin: "MODEL",
        deterministicOverride: false,
        conversationMove: planned.plan?.move,
        latestMessageAcknowledged: true,
        latestPrimaryAct: latestAct.primaryAct,
        advisorStage: "SOCIAL_DETOUR",
      });
      return { kind: "QUESTION", message, conversation };
    }
    const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
    return { ...recovery.response, conversation: withProvenance(recovery.conversation, {
      modelAttempted: true, requestedModel: planned.requestedModel, selectedModel: planned.selectedModel,
      structuredPlan: false, parseOutcome: planned.parseOutcome, userFacingOrigin: "BOUNDED_FALLBACK",
      deterministicOverride: false, fallbackReason: "MODEL_UNAVAILABLE_OR_SCHEMA_FAILURE",
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct, advisorStage: "SOCIAL_DETOUR",
    }) };
  }

  if (latestAct.isReturnToVehicle) {
    const plannedReturn = await planTurn({
      conversationId: input.conversationId,
      messages: input.messages,
      memory,
      remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
      latestAct,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    });
    const returnFailure = plannedReturn.plan ? validateCarsConversationPlan({
      plan: plannedReturn.plan,
      memory,
      latestAct,
      latestUserText: latestContent,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    }) : "VAGUE_CONTINUITY";
    const modelMessage = plannedReturn.plan && !returnFailure ? plannedReturn.plan.assistantMessage : undefined;
    const repeats = modelMessage
      ? assessForwardProgress({
        latestUser: latestContent,
        assistantMessage: modelMessage,
        recentAssistant: recentAssistantTexts(input.messages),
        directQuestionAnswered: false,
        stateChanged: false,
        askedMaterialQuestion: Boolean(plannedReturn.plan?.question),
        statedLimitation: false,
        repaired: false,
        recommendationAction: false,
      }).semanticRepetitionDetected
      : false;
    if (modelMessage && !isVagueContinuityPhrase(modelMessage) && !repeats) {
      const purpose = validatePurpose(memory, plannedReturn.plan?.question?.purpose);
      const conversation = withProvenance(applyAssistantMove(memory, {
        phase: "DISCOVERING",
        purpose,
        prompt: modelMessage,
        progressEvent: "return-to-topic",
        advisorStage: "CONTEXT_UNDERSTANDING",
        vehicleIntentEstablished: true,
        clearPendingQuestion: !purpose,
      }), withProgress({
        modelAttempted: true,
        requestedModel: plannedReturn.requestedModel,
        selectedModel: plannedReturn.selectedModel,
        structuredPlan: true,
        parseOutcome: plannedReturn.parseOutcome,
        userFacingOrigin: "MODEL",
        deterministicOverride: false,
        conversationMove: plannedReturn.plan?.move,
        latestMessageAcknowledged: true,
        latestPrimaryAct: latestAct.primaryAct,
        advisorStage: "CONTEXT_UNDERSTANDING",
      }, {
        messages: input.messages,
        latestUser: latestContent,
        assistantMessage: modelMessage,
        latestAct,
        memory,
        askedMaterialQuestion: Boolean(purpose),
        stateChanged: true,
      }));
      return { kind: "QUESTION", message: modelMessage, conversation };
    }
    const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
    return { ...recovery.response, conversation: withProvenance(recovery.conversation, withProgress({
      modelAttempted: true,
      requestedModel: plannedReturn.requestedModel,
      selectedModel: plannedReturn.selectedModel,
      structuredPlan: Boolean(plannedReturn.plan),
      parseOutcome: plannedReturn.parseOutcome,
      userFacingOrigin: "BOUNDED_FALLBACK",
      deterministicOverride: true,
      fallbackReason: returnFailure ?? "VAGUE_CONTINUITY",
      latestMessageAcknowledged: true,
      latestPrimaryAct: latestAct.primaryAct,
      advisorStage: recovery.conversation.advisorStage,
    }, {
      messages: input.messages,
      latestUser: latestContent,
      assistantMessage: recovery.response.message,
      latestAct,
      memory,
      repaired: true,
      askedMaterialQuestion: Boolean(recovery.conversation.lastAssistantQuestion),
    })) };
  }

  if (canEvaluateNow && !rejectedRecommendations && memory.recommendationOfferStatus !== "DECLINED") {
    memory = closeDeferredQuestions(memory, "Supported constraints now authorize governed evaluation; this discovery question no longer changes the decision.");
    return respondWithEvidence(input, { ...memory, phase: "EVALUATING" });
  }

  if ((isFrustration(latestContent) || latestAct.isFrustration) && !latestAct.hasVehicleIntent) {
    const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
    return { ...recovery.response, conversation: withProvenance(recovery.conversation, {
      modelAttempted: false, requestedModel, structuredPlan: false, parseOutcome: "NOT_ATTEMPTED",
      userFacingOrigin: "BOUNDED_FALLBACK", deterministicOverride: false, latestMessageAcknowledged: true,
      latestPrimaryAct: "FRUSTRATION", advisorStage: "RECOVERY",
    }) };
  }

  const planned = await planTurn({
    conversationId: input.conversationId,
    messages: input.messages,
    memory,
    remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
    latestAct,
    recommendationMayBeOffered: false,
    candidateMayBeRevealed: false,
    userFacingUnverifiedPreferences: memory.requirements
      .filter((entry) => entry.evaluability === "UNDERSTOOD_NOT_EVALUABLE")
      .map((entry) => entry.key),
  });

  if (planned.plan) {
    memory = applyPlanFacts(memory, planned.plan, userTurnCount, latestContent);
    const afterPlan = assessCarsConversationSufficiency(memory);
    memory = { ...memory, humanReady: planned.plan.readiness.humanReady || afterPlan.humanReady, governedReady: afterPlan.governedReady };
    const purpose = validatePurpose(memory, planned.plan.question?.purpose);
    if (afterPlan.governedReady && !rejectedRecommendations
      && memory.recommendationOfferStatus !== "AWAITING_CONSENT"
      && memory.recommendationOfferStatus !== "DECLINED"
      && !latestAct.isReturnToVehicle) {
      return respondWithEvidence(input, memory);
    }
    const failure = validateCarsConversationPlan({
      plan: planned.plan,
      memory,
      latestAct,
      latestUserText: latestContent,
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    });
    if (failure) {
      const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
      return { ...recovery.response, conversation: withProvenance(recovery.conversation, {
        modelAttempted: true, requestedModel: planned.requestedModel, selectedModel: planned.selectedModel,
        structuredPlan: true, parseOutcome: planned.parseOutcome, userFacingOrigin: "BOUNDED_FALLBACK",
        deterministicOverride: true, fallbackReason: failure, latestMessageAcknowledged: true,
        latestPrimaryAct: latestAct.primaryAct, advisorStage: recovery.conversation.advisorStage,
      }) };
    }
    if (purpose && isSemanticLoop(memory, purpose)) {
      const recovery = createCarsBoundedRecovery({ ...memory, didConversationProgress: false }, latestContent, latestAct);
      return { ...recovery.response, conversation: { ...recovery.conversation, loopCount: memory.loopCount + 1 } };
    }
    if (planned.plan.latestMessage.primaryAct === "FRUSTRATION" || isFrustration(latestContent) || latestAct.isFrustration) {
      const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
      const message = planned.plan.assistantMessage || recovery.response.message;
      return {
        kind: "QUESTION",
        message,
        conversation: withProvenance(applyAssistantMove(memory, {
          phase: "RECOVERING",
          prompt: message,
          progressEvent: "frustration-repair",
          advisorStage: "RECOVERY",
          clearPendingQuestion: true,
        }), {
          modelAttempted: true, requestedModel: planned.requestedModel, selectedModel: planned.selectedModel,
          structuredPlan: true, parseOutcome: planned.parseOutcome, userFacingOrigin: "MODEL",
          deterministicOverride: false, conversationMove: "REPAIR", latestMessageAcknowledged: true,
          latestPrimaryAct: "FRUSTRATION", advisorStage: "RECOVERY",
        }),
      };
    }
    const options = purpose ? optionSetFromPlan(planned.plan, purpose, userTurnCount) ?? fallbackUsageOptions(purpose, userTurnCount, planned.plan.assistantMessage) : undefined;
    let message = planned.plan.assistantMessage;
    let repaired = false;
    const progress = assessForwardProgress({
      latestUser: latestContent,
      assistantMessage: message,
      recentAssistant: recentAssistantTexts(input.messages),
      directQuestionAnswered: latestAct.isDirectModelComparison || latestAct.isCapabilityQuestion,
      stateChanged: false,
      askedMaterialQuestion: Boolean(purpose),
      statedLimitation: false,
      repaired: false,
      recommendationAction: false,
    });
    if (progress.semanticRepetitionDetected || isVagueContinuityPhrase(message)) {
      const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
      message = recovery.response.message;
      repaired = true;
    } else if (latestAct.isImpatient && message.length > 320) {
      const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
      message = recovery.response.message;
      repaired = true;
    }
    const conversation = withProvenance(applyAssistantMove(memory, {
      phase: planned.plan.move === "PAUSE" ? "PAUSED" : purpose ? "CLARIFYING" : "DISCOVERING",
      purpose: repaired ? undefined : purpose,
      prompt: message,
      options: repaired ? undefined : options,
      progressEvent: planned.plan.latestMessage.primaryAct.toLowerCase(),
      advisorStage: latestAct.primaryAct === "VEHICLE_INTENT" ? "VEHICLE_INTENT" : "CONTEXT_UNDERSTANDING",
      vehicleIntentEstablished: true,
      humanReady: planned.plan.readiness.humanReady,
      clearPendingQuestion: repaired || !purpose,
    }), withProgress({
      modelAttempted: true, requestedModel: planned.requestedModel, selectedModel: planned.selectedModel,
      structuredPlan: !repaired, parseOutcome: planned.parseOutcome,
      userFacingOrigin: repaired ? "BOUNDED_FALLBACK" : "MODEL",
      deterministicOverride: repaired, conversationMove: planned.plan.move, nextQuestionPurpose: purpose,
      fallbackReason: repaired ? "SEMANTIC_REPETITION" : undefined,
      latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct,
      advisorStage: latestAct.primaryAct === "VEHICLE_INTENT" ? "VEHICLE_INTENT" : "CONTEXT_UNDERSTANDING",
    }, {
      messages: input.messages,
      latestUser: latestContent,
      assistantMessage: message,
      latestAct,
      memory,
      askedMaterialQuestion: Boolean(purpose) && !repaired,
      repaired,
      stateChanged: repaired,
    }));
    return {
      kind: "QUESTION",
      message,
      options: repaired ? undefined : options?.options.map((option) => option.label),
      conversation,
    };
  }

  if (isCandidateComparisonConversation(input.messages) && userTurnCount >= 2 && !rejectedRecommendations) {
    const result = await runCarsRuntime({
      requestId: `${input.conversationId}:turn:${randomUUID()}`,
      contextReference: `${input.conversationId}:context`,
      query,
    });
    if (result.status === "SUCCEEDED") {
      const conversation = applyAssistantMove(memory, { phase: "DECISION_READY", prompt: "Karşılaştırma sonucu hazır.", advisorStage: "NOT_RECOMMENDABLE" });
      return {
        kind: "QUESTION",
        message: "Karşılaştırma için konuştuklarımız duruyor; nihai kart ancak doğrulanmış bir aday yetkisi ve sizin onayınızla açılır.",
        conversation: { ...conversation, state: "COLLECTING_CONTEXT" },
      };
    }
    if (result.status === "FAILED") {
      return { kind: "ERROR", message: createCarsFollowUp(result, "tr"), conversation: { ...memory, phase: "RECOVERING", state: "SYSTEM_FAILURE", advisorStage: "SYSTEM_LIMITED" } };
    }
  }

  if (atTurnLimit) {
    return {
      kind: "ERROR",
      message: "Bu görüşme için güvenli tur sınırına ulaştık; elimizdeki bilgiler hâlâ güvenilir bir karar için yeterli değil.",
      conversation: { ...memory, phase: "RECOVERING", state: "SYSTEM_FAILURE", advisorStage: "SYSTEM_LIMITED" },
    };
  }

  const recovery = createCarsBoundedRecovery(memory, latestContent, latestAct);
  return { ...recovery.response, conversation: withProvenance(recovery.conversation, {
    modelAttempted: true, requestedModel, selectedModel: requestedModel, structuredPlan: false,
    parseOutcome: planned.parseOutcome ?? "UNAVAILABLE",
    userFacingOrigin: "BOUNDED_FALLBACK", deterministicOverride: false,
    fallbackReason: "MODEL_UNAVAILABLE_OR_SCHEMA_FAILURE",
    nextQuestionPurpose: recovery.conversation.lastAssistantQuestion?.purpose,
    latestMessageAcknowledged: true, latestPrimaryAct: latestAct.primaryAct,
    advisorStage: recovery.conversation.advisorStage,
  }) };
}

export async function runCarsConversationTurn(
  input: CarsConversationRequest,
): Promise<CarsConversationResponse> {
  const response = await createCarsConversationTurn(input);
  if (response.conversation) {
    return {
      ...response,
      conversation: {
        ...response.conversation,
        state: response.conversation.state,
        textInputAllowed: response.conversation.phase !== "FINAL_TRADEOFF"
          && response.conversation.state !== "FINAL_DISCRIMINATOR_REQUIRED",
        semanticFingerprint: response.conversation.semanticFingerprint,
      },
    };
  }
  const trace = hydrateCarsConversationMemory({ messages: input.messages, conversation: input.conversation });
  return { ...response, conversation: withAdvisorStage(trace, trace.advisorStage, { state: conversationStateFromPhase(trace.phase) }) };
}
