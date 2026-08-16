import type { RecommendedCar } from "@/types/recommendation";
import type { VehiclePersonaTrait } from "@/types/vehiclePersona";

export interface CarsConversationOption {
  readonly id: string;
  readonly label: string;
  readonly semanticValue: string;
}

export type CarsOptionSelectionSource = "button" | "text" | "paraphrase" | "confirmation" | "ordinal";

export type CarsQuestionPurpose =
  | `CATALOG_FACET:${string}`
  | "PRIMARY_USAGE"
  | "USAGE_DETAIL"
  | "BUDGET_MAX"
  | "MIN_SEATS"
  | "MIN_CARGO"
  | "PARTY_CONFIRMATION"
  | "DAILY_VS_OFFROAD"
  | "EQUIPMENT_SCOPE"
  | "BODY_TYPE"
  | "DRIVETRAIN"
  | "TRANSMISSION"
  | "FUEL"
  | "FUEL_EXCLUDED"
  | "MAX_ACCELERATION_0_100_S"
  | "MIN_POWER_KW"
  | "MAX_CONSUMPTION_L_100KM"
  | "SIZE"
  | "REJECTION_DIAGNOSTIC"
  | "OFF_TOPIC_REDIRECT"
  | "FINAL_PRIORITY"
  | "ACQUISITION_MARKET"
  | "PERSONA";

export interface CarsActiveOptionSet {
  readonly id: string;
  readonly purpose: CarsQuestionPurpose;
  readonly options: readonly CarsConversationOption[];
  readonly sourceAssistantTurn: number;
  readonly active: boolean;
  readonly selectedOptionId?: string;
  readonly selectionSource?: CarsOptionSelectionSource;
}

export interface CarsConversationMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly recommendations?: readonly RecommendedCar[];
  readonly recommendationIds?: readonly string[];
  readonly quickReplies?: readonly string[];
  readonly optionSet?: CarsActiveOptionSet;
  readonly discriminatorChoices?: readonly CarsFinalDiscriminatorChoice[];
  readonly satisfaction?: "HELPFUL" | "NOT_HELPFUL";
  readonly sellerResearchRequest?: {
    readonly province: string;
    readonly district: string;
    readonly status: "PLANNED_V0_2";
  };
}

export interface PersistedCarsConversation {
  readonly version: 4 | 5;
  readonly conversationId: string;
  readonly messages: readonly CarsConversationMessage[];
  readonly conversation?: CarsConversationTrace;
}

export interface CarsConversationRequest {
  readonly conversationId: string;
  readonly messages: readonly CarsConversationMessage[];
  readonly choiceId?: CarsFinalDiscriminatorChoiceId;
  readonly selectedOptionId?: string;
  readonly conversation?: CarsConversationTrace;
}

export type CarsConversationPhase =
  | "SOCIAL_OPEN"
  | "DISCOVERING"
  | "CLARIFYING"
  | "READY_TO_EVALUATE"
  | "EVALUATING"
  | "FINAL_TRADEOFF"
  | "OFFERING"
  | "DECISION_READY"
  | "RECOMMENDATION_SHOWN"
  | "RECOMMENDATION_DECLINED"
  | "RECOMMENDATION_REJECTED"
  | "SOCIAL_DETOUR"
  | "PAUSED"
  | "LIMITED_BY_EVIDENCE"
  | "RECOVERING";

export type CarsConversationState =
  | "SOCIAL_OPEN"
  | "COLLECTING_CONTEXT"
  | "CLARIFICATION_REQUIRED"
  | "FINAL_DISCRIMINATOR_REQUIRED"
  | "OFFER_AWAITING_CONSENT"
  | "DECISION_READY"
  | "RECOMMENDATION_SHOWN"
  | "SOCIAL_DETOUR"
  | "INSUFFICIENT_SUPPORTED_EVIDENCE"
  | "NO_SUPPORTED_CANDIDATE"
  | "SYSTEM_FAILURE";

export type CarsAdvisorStage =
  | "SOCIAL_OPEN"
  | "VEHICLE_INTENT"
  | "CONTEXT_UNDERSTANDING"
  | "TRADEOFF_RESOLUTION"
  | "HUMAN_READY"
  | "NOT_RECOMMENDABLE"
  | "AUTHORIZED_CANDIDATE_HELD"
  | "OFFER_AWAITING_CONSENT"
  | "RECOMMENDATION_SHOWN"
  | "RECOMMENDATION_DECLINED"
  | "RECOMMENDATION_REJECTED"
  | "SOCIAL_DETOUR"
  | "RECOVERY"
  | "PAUSED"
  | "SYSTEM_LIMITED";

export type CarsRecommendationOfferStatus =
  | "NONE"
  | "AWAITING_CONSENT"
  | "DECLINED"
  | "REVEALED"
  | "INVALIDATED";

export type CarsRequirementKey =
  | `CATALOG_FACET:${string}`
  | "USAGE_CAMP"
  | "USAGE_SERIOUS_OFF_ROAD"
  | "USAGE_ROUGH_ROAD"
  | "USAGE_STABILIZED_ROAD"
  | "USAGE_CITY"
  | "USAGE_HIGHWAY"
  | "USAGE_FAMILY"
  | "BUDGET_MAX_TRY"
  | "DRIVETRAIN"
  | "BODY_TYPE"
  | "EQUIPMENT_LEVEL"
  | "SIZE_PREFERENCE"
  | "TRANSMISSION"
  | "FUEL"
  | "FUEL_EXCLUDED"
  | "MAX_ACCELERATION_0_100_S"
  | "MIN_POWER_KW"
  | "MAX_CONSUMPTION_L_100KM"
  | "PARTY_SIZE"
  | "MIN_SEATS"
  | "MIN_CARGO_L"
  | "ACQUISITION_MARKET";

export type CarsRequirementCategory =
  | "HARD_CONSTRAINT"
  | "HARD_UNEVALUATED_CONSTRAINT"
  | "SOFT_PREFERENCE"
  | "SOFT_CONTEXT"
  | "USAGE_CONTEXT"
  | "BUDGET_CONTEXT"
  | "REJECTION"
  | "CORRECTION"
  | "UNRESOLVED"
  | "CONVERSATIONAL_REPAIR";

export type CarsRequirementEvaluability =
  | "EVALUABLE_NOW"
  | "UNDERSTOOD_NOT_EVALUABLE"
  | "NEEDS_CLARIFICATION"
  | "CONFLICTING"
  | "SUPERSEDED";

export type CarsRequirementStatus =
  | "SUPPORTED_EVALUABLE"
  | "SUPPORTED_NOT_YET_EVALUABLE"
  | "UNDERSTOOD_BUT_UNSUPPORTED"
  | "NEEDS_CLARIFICATION";

export interface CarsRequirementLedgerEntry {
  readonly key: CarsRequirementKey;
  readonly value: string | number;
  readonly status: CarsRequirementStatus;
  readonly category: CarsRequirementCategory;
  readonly evaluability: CarsRequirementEvaluability;
  readonly sourceTurn: number;
  readonly sourceText: string;
  readonly previousValue?: string | number;
  readonly usedInDecision: boolean;
  readonly confirmedFromAssistantTurn?: number;
}

export interface CarsPendingQuestion {
  readonly purpose: CarsQuestionPurpose;
  readonly prompt: string;
  readonly pendingValue?: string | number;
  readonly yesImplies?: { readonly key: CarsRequirementKey; readonly value: string | number };
  readonly noImplies?: { readonly key: CarsRequirementKey; readonly value: string | number };
}

export type CarsQuestionStatus = "OPEN" | "ANSWERED" | "DEFERRED" | "SUPERSEDED" | "NO_LONGER_MATERIAL";

export interface CarsQuestionMemoryEntry {
  readonly purpose: CarsQuestionPurpose;
  readonly prompt: string;
  readonly status: CarsQuestionStatus;
  readonly sourceAssistantTurn: number;
  readonly updatedOnUserTurn?: number;
  readonly transitionReason?: string;
}

export type CarsAddressForm = "SEN" | "SIZ";

export type CarsAcquisitionMarket = "UNRESOLVED" | "NEW_ONLY" | "USED_ONLY" | "NEW_OR_USED";

export type CarsRecommendationLevel =
  | "MODEL_FIT_GUIDANCE"
  | "NEW_CONFIGURATION_RECOMMENDATION"
  | "USED_MODEL_GUIDANCE"
  | "LISTING_ANALYSIS_ONLY"
  | "PURCHASABLE_UNIT_RECOMMENDATION";

export type CarsDecisionKind = "VEHICLE_FIT" | "ACQUISITION_FIT";

export type CarsAffordabilityState =
  | "AFFORDABILITY_NOT_REQUESTED"
  | "AFFORDABILITY_MARKET_UNRESOLVED"
  | "AFFORDABILITY_EVALUATION_UNAVAILABLE"
  | "AFFORDABILITY_PASS"
  | "AFFORDABILITY_FAIL"
  | "AFFORDABILITY_UNKNOWN";

export type CarsOfferPurpose =
  | "MODEL_FIT_OFFER"
  | "NEW_CONFIGURATION_OFFER"
  | "PURCHASE_OPTION_OFFER"
  | "NO_AFFORDABLE_MATCH";

/** Phase 1 active market is always NEW_ONLY. USED_ONLY and NEW_OR_USED remain dormant Phase 2 states. */
export const PHASE1_ACTIVE_ACQUISITION_MARKET: CarsAcquisitionMarket = "NEW_ONLY";

export type CarsPriceEvaluationResult = "PASS" | "FAIL" | "UNKNOWN" | "NOT_REQUESTED";

export type CarsNoAffordableMatchStatus =
  | "NO_AFFORDABLE_EXACT_MATCH"
  | "NEAREST_OVER_BUDGET_AVAILABLE"
  | "PRICE_UNKNOWN_FOR_TECHNICAL_MATCH";

export type CarsCampaignApplicability = "NOT_CAMPAIGN" | "GENERALLY_APPLICABLE" | "CONDITIONAL" | "UNKNOWN";

export type CarsPriceValidityStatus = "CURRENT" | "EXPIRED" | "NOT_YET_VALID" | "ABSENT" | "NOT_EVALUATED";

export type CarsPriceReasonCode =
  | "NO_BUDGET"
  | "SOFT_BUDGET_NOT_APPLIED"
  | "EXACT_MAPPING_MISSING"
  | "CONDITION_NOT_NEW"
  | "PRICE_ABSENT"
  | "PRICE_STALE_OR_EXPIRED"
  | "IDENTITY_NOT_EXACT"
  | "PRICE_CONFLICT"
  | "CAMPAIGN_ELIGIBILITY_UNKNOWN"
  | "MANDATORY_FEE_UNCERTAINTY"
  | "SOURCE_INSUFFICIENT"
  | "AMOUNT_ABOVE_CEILING"
  | "AMOUNT_WITHIN_CEILING"
  | "ESTIMATED_AMOUNT_ABOVE_CEILING"
  | "ESTIMATED_AMOUNT_WITHIN_CEILING"
  | "MARKET_NOT_TR"
  | "NOT_CURRENT_SALE";

export interface CarsCandidatePriceEvaluation {
  readonly candidateId: string;
  readonly catalogVariantId: string;
  readonly priceObservationId?: string;
  readonly amountTry?: number;
  readonly priceType?: "LIST" | "CAMPAIGN" | "ASKING" | "TRANSACTION" | "VALUATION" | "ESTIMATE";
  readonly validityStatus: CarsPriceValidityStatus;
  readonly sourceAuthorityResult: "AUTHORITATIVE" | "INSUFFICIENT";
  readonly campaignApplicabilityResult: CarsCampaignApplicability;
  readonly feeInclusionUncertainty: boolean;
  readonly budgetCeilingTry?: number;
  readonly result: CarsPriceEvaluationResult;
  readonly reasonCode: CarsPriceReasonCode;
}

export interface CarsShownCandidateState {
  readonly runtimeVehicleCandidateId: string;
  readonly vehicleVariantId: string;
  readonly revealedOnUserTurn: number;
}

export type CarsForwardProgressType =
  | "ANSWERED_DIRECT_QUESTION"
  | "NEW_DISTINCTION"
  | "SUPPORTED_RECOMMENDATION_ACTION"
  | "STATED_LIMITATION"
  | "ASKED_MATERIAL_QUESTION"
  | "REPAIRED_MISUNDERSTANDING"
  | "CHANGED_STATE"
  | "NONE";

export type CarsDirectRecommendationCoverage =
  | "DIRECT_RECOMMENDATION_SUPPORTED"
  | "DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE"
  | "DIRECT_RECOMMENDATION_NEEDS_ONE_MATERIAL_FACT";

export interface CarsTurnProvenance {
  readonly modelAttempted: boolean;
  readonly requestedModel?: string;
  readonly selectedModel?: string;
  readonly structuredPlan: boolean;
  readonly parseOutcome?: "SUCCESS" | "EMPTY" | "SCHEMA_FAILURE" | "UNAVAILABLE" | "NOT_ATTEMPTED";
  readonly userFacingOrigin: "MODEL" | "DETERMINISTIC_EVIDENCE" | "BOUNDED_FALLBACK" | "DETERMINISTIC_REPAIR";
  readonly deterministicOverride: boolean;
  readonly fallbackReason?: string;
  readonly conversationMove?: string;
  readonly nextQuestionPurpose?: CarsQuestionPurpose;
  readonly latestMessageAcknowledged: boolean;
  readonly latestPrimaryAct?: string;
  readonly advisorStage?: CarsAdvisorStage;
  readonly forwardProgressType?: CarsForwardProgressType;
  readonly newInformationComparedWithRecentTurns?: boolean;
  readonly directQuestionAnswered?: boolean;
  readonly semanticRepetitionDetected?: boolean;
  readonly repairApplied?: boolean;
  readonly directRecommendationCoverage?: CarsDirectRecommendationCoverage;
  readonly budgetEvaluated?: boolean;
  readonly unevaluatedBudgetPresent?: boolean;
  readonly heldDespiteUnevaluatedBudget?: boolean;
  readonly hardUnevaluatedConstraints?: readonly string[];
  readonly recommendationBlockedByHardConstraint?: boolean;
  readonly blockedConstraintKinds?: readonly string[];
  readonly candidateHeld?: boolean;
  readonly offerAuthorized?: boolean;
  readonly cardRevealAuthorized?: boolean;
  readonly acquisitionMarket?: CarsAcquisitionMarket;
  readonly recommendationLevel?: CarsRecommendationLevel;
  readonly affordabilityState?: CarsAffordabilityState;
  readonly offerPurpose?: CarsOfferPurpose;
  readonly decisionKind?: CarsDecisionKind;
  readonly affordabilityClaimAuthorized?: boolean;
  readonly purchasableUnitAuthorized?: boolean;
  readonly modelFitAuthorized?: boolean;
  readonly listingClaimDetected?: boolean;
  readonly usedPurchaseRequestDetected?: boolean;
  readonly listingUrlSubmissionDetected?: boolean;
  readonly directAffordabilityQuestionDetected?: boolean;
  readonly priceEvaluationRequested?: boolean;
  readonly budgetCeilingTry?: number;
  readonly candidateSetBeforePriceFilter?: readonly string[];
  readonly candidateSetAfterPriceFilter?: readonly string[];
  readonly selectedDeterministicCandidate?: string;
  readonly noAffordableMatchStatus?: CarsNoAffordableMatchStatus;
  readonly nearestVerifiedPriceGapTry?: number;
  readonly nearestVerifiedPriceGapPercent?: number;
  readonly shownCandidateKnown?: boolean;
  readonly activePhase1Market?: CarsAcquisitionMarket;
  readonly directRecommendationRequested?: boolean;
  readonly governedEvaluationAttempted?: boolean;
  readonly candidateCount?: number;
  readonly candidateFilters?: readonly { readonly kind: string; readonly before: readonly string[]; readonly after: readonly string[] }[];
  readonly discriminator?: string;
  readonly questionMaterial?: boolean;
  readonly candidateIdsBeforeQuestion?: readonly string[];
  readonly candidatePartitionsByAnswer?: Readonly<Record<string, readonly string[]>>;
  readonly alreadyAnswered?: boolean;
  readonly whyQuestionNow?: string;
  readonly offerState?: CarsRecommendationOfferStatus;
  readonly cardState?: "HIDDEN" | "REVEALED";
  readonly personaActivated?: boolean;
  readonly activationSource?: "USER_EXPLICIT" | "ADVISOR_PROMPT_RESPONSE";
  readonly requestedPersonaTraits?: readonly VehiclePersonaTrait[];
  readonly matchedPersonaTraits?: readonly VehiclePersonaTrait[];
  readonly personaScore?: number;
  readonly affectedRanking?: boolean;
  readonly sourceAuthority?: "OWNER_EDITORIAL";
  readonly decisionUse?: "SOFT_PREFERENCE_ONLY";
}

export interface CarsPersonaPreferenceState {
  readonly activated: boolean;
  readonly activationSource?: "USER_EXPLICIT" | "ADVISOR_PROMPT_RESPONSE";
  readonly requestedTraits: readonly VehiclePersonaTrait[];
  readonly sourceTurn?: number;
}

export interface CarsConversationTrace {
  readonly version: 1;
  readonly state: CarsConversationState;
  readonly phase: CarsConversationPhase;
  readonly advisorStage: CarsAdvisorStage;
  readonly vehicleIntentEstablished: boolean;
  readonly humanReady: boolean;
  readonly governedReady: boolean;
  readonly recommendationOfferStatus: CarsRecommendationOfferStatus;
  readonly heldAuthorization?: string;
  readonly requirements: readonly CarsRequirementLedgerEntry[];
  readonly askedQuestionPurposes: readonly CarsQuestionPurpose[];
  readonly answeredQuestionPurposes: readonly CarsQuestionPurpose[];
  readonly questionMemory?: readonly CarsQuestionMemoryEntry[];
  readonly latestUserTurn: number;
  readonly capturedOnLatestTurn: readonly CarsRequirementKey[];
  readonly didConversationProgress: boolean;
  readonly textInputAllowed: boolean;
  readonly lastAssistantQuestion?: CarsPendingQuestion;
  readonly activeOptionSet?: CarsActiveOptionSet;
  readonly optionHistory: readonly CarsActiveOptionSet[];
  readonly rejectedRecommendationIds: readonly string[];
  readonly lastProgressEvent?: string;
  readonly semanticFingerprint: string;
  readonly loopCount: number;
  readonly addressForm?: CarsAddressForm;
  readonly acquisitionMarket?: CarsAcquisitionMarket;
  readonly affordabilityState?: CarsAffordabilityState;
  readonly recommendationLevel?: CarsRecommendationLevel;
  readonly offerPurpose?: CarsOfferPurpose;
  readonly shownCandidate?: CarsShownCandidateState;
  readonly usedPurchaseRequestDetected?: boolean;
  readonly usedScopeBoundaryStated?: boolean;
  readonly noAffordableMatchStatus?: CarsNoAffordableMatchStatus;
  readonly priceEvaluations?: readonly CarsCandidatePriceEvaluation[];
  readonly personaPreference?: CarsPersonaPreferenceState;
  readonly turnProvenance?: CarsTurnProvenance;
}

export type CarsFinalDiscriminatorChoiceId = "MAX_SEATS" | "MAX_CARGO";

export interface CarsFinalDiscriminatorChoice {
  readonly id: CarsFinalDiscriminatorChoiceId;
  readonly label: string;
}

export interface CarsConversationEvidenceDecision {
  readonly conversationState: "FOLLOW_UP" | "FINAL_DISCRIMINATOR_REQUIRED" | "OFFER_AWAITING_CONSENT" | "DECISION_READY" | "EVIDENCE_INSUFFICIENT" | "NO_ELIGIBLE_CANDIDATE";
  readonly decisionStatus: "NEEDS_MORE_USER_CONTEXT" | "DECISION_READY" | "INSUFFICIENT_VEHICLE_EVIDENCE" | "NO_ELIGIBLE_CANDIDATE";
  readonly evidenceBacked: boolean;
  readonly recommendationOfferStatus?: CarsRecommendationOfferStatus;
  readonly selectedRuntimeVehicleCandidateId?: string;
  readonly selectedVehicle?: { readonly brand: string; readonly model: string; readonly trim: string };
  readonly requirements: readonly { readonly factKey: "seats" | "cargo_volume_l"; readonly predicate: "AT_LEAST"; readonly value: number }[];
  readonly candidateDispositions?: readonly { readonly runtimeVehicleCandidateId: string; readonly disposition: "ELIGIBLE" | "ELIMINATED_BY_MATERIAL_CONSTRAINT" | "NOT_EVALUABLE" }[];
  readonly evidenceTrace?: { readonly candidateIds: readonly string[]; readonly artifactVersion: string };
  readonly followUpQuestion?: string;
  readonly limitations?: readonly string[];
  readonly discriminatorChoices?: readonly CarsFinalDiscriminatorChoice[];
  readonly governedReasons?: readonly string[];
  readonly unverifiedPreferenceNote?: string;
}

export type CarsConversationResponse =
  | {
      readonly kind: "QUESTION";
      readonly message: string;
      readonly options?: readonly string[];
      readonly discriminatorChoices?: readonly CarsFinalDiscriminatorChoice[];
      readonly decision?: CarsConversationEvidenceDecision;
      readonly conversation?: CarsConversationTrace;
    }
  | {
      readonly kind: "RECOMMENDATIONS";
      readonly message: string;
      readonly recommendations: readonly RecommendedCar[];
      readonly decision?: CarsConversationEvidenceDecision;
      readonly conversation?: CarsConversationTrace;
    }
  | {
      readonly kind: "ERROR";
      readonly message: string;
      readonly conversation?: CarsConversationTrace;
    };
