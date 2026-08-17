import type { MoneyTry, BudgetImportance, FinanceFlexibility } from "./budget";
import type { ConstraintEvent } from "./constraint";
import type { DecisionState } from "./decisionState";
import type { GovernedOffer, OfferLifecycleState } from "./offer";
import type { CandidateRejectionEvent } from "./rejection";
import type { HumanContextKind } from "./humanContext";

export interface ConversationEventBase {
  readonly schemaVersion: 1;
  readonly conversationId: string;
  readonly id: string;
  readonly sourceMessageId: string;
  readonly sourceTurn: number;
  readonly sequence: number;
  readonly createdAt: string;
}

export const VEHICLE_PERSONA_TRAITS = [
  "DESIGN", "DRIVING_ENGAGEMENT", "COMFORT", "PRACTICALITY", "TECHNOLOGY",
  "PRESTIGE", "VALUE", "ADVENTURE", "FAMILY", "URBAN", "COMMERCIAL",
  "SUSTAINABILITY", "MINIMALISM",
] as const;

export type VehiclePersonaTrait = typeof VEHICLE_PERSONA_TRAITS[number];
export type PersonaActivationSource = "USER_EXPLICIT" | "ADVISOR_PROMPT_RESPONSE";

export type PersonaPreferenceEvent = ConversationEventBase & (
  | {
      readonly eventType: "PERSONA_ACTIVATED";
      readonly activationSource: PersonaActivationSource;
      readonly requestedTraits: readonly [VehiclePersonaTrait, ...VehiclePersonaTrait[]];
    }
  | {
      readonly eventType: "PERSONA_DEACTIVATED";
      readonly reason: "USER_DECLINED" | "USER_CLEARED" | "SUPERSEDED";
      readonly supersedesEventId?: string;
    }
);

export type BudgetField =
  | "AVAILABLE_CASH"
  | "PREFERRED_BUDGET"
  | "MAXIMUM_HARD_CEILING"
  | "FINANCE_FLEXIBILITY"
  | "UNRESOLVED_FINANCED_CEILING"
  | "BUDGET_IMPORTANCE"
  | "BUDGET_UNKNOWN";

export type BudgetEvent = ConversationEventBase & (
  | { readonly eventType: "BUDGET_MUTATION"; readonly operation: "SET" | "CORRECT"; readonly field: "AVAILABLE_CASH" | "PREFERRED_BUDGET" | "MAXIMUM_HARD_CEILING"; readonly value: MoneyTry; readonly supersedesEventId?: string }
  | { readonly eventType: "BUDGET_MUTATION"; readonly operation: "SET" | "CORRECT"; readonly field: "FINANCE_FLEXIBILITY"; readonly value: FinanceFlexibility; readonly supersedesEventId?: string }
  | { readonly eventType: "BUDGET_MUTATION"; readonly operation: "SET" | "CORRECT"; readonly field: "BUDGET_IMPORTANCE"; readonly value: BudgetImportance; readonly supersedesEventId?: string }
  | { readonly eventType: "BUDGET_MUTATION"; readonly operation: "SET" | "CORRECT"; readonly field: "UNRESOLVED_FINANCED_CEILING" | "BUDGET_UNKNOWN"; readonly value: boolean; readonly supersedesEventId?: string }
  | { readonly eventType: "BUDGET_MUTATION"; readonly operation: "CLEAR"; readonly field: BudgetField; readonly supersedesEventId?: string }
  | { readonly eventType: "BUDGET_MUTATION"; readonly operation: "EXCLUDE_FROM_DECISION" }
);

export type MaterialQuestionAnswerStatus = "ANSWERED" | "DECLINED" | "DEFERRED" | "SUPERSEDED";

export type MaterialQuestionEvent = ConversationEventBase & (
  | {
      readonly eventType: "MATERIAL_QUESTION_ASKED";
      readonly questionId: string;
      readonly stableSemanticKey: string;
      readonly field: string;
    }
  | {
      readonly eventType: "MATERIAL_QUESTION_DISPOSITION";
      readonly questionId: string;
      readonly stableSemanticKey: string;
      readonly status: MaterialQuestionAnswerStatus;
      readonly supersedesEventId?: string;
    }
);

export interface ModelReferenceEvent extends ConversationEventBase {
  readonly eventType: "MODEL_REFERENCE";
  readonly referenceId: string;
  readonly rawText: string;
  readonly normalizedBrand?: string;
  readonly normalizedModel?: string;
  readonly resolution: "UNRESOLVED" | "EXACT_MODEL_FAMILY" | "EXACT_VARIANT" | "BRAND_ONLY" | "NOT_FOUND" | "AMBIGUOUS";
  readonly decisionEffect: "LOOKUP_ONLY" | "COMPARISON_SCOPE" | "PREFERENCE" | "HARD_SCOPE";
  readonly resolvedFamilyIds: readonly string[];
  readonly resolvedVariantIds: readonly string[];
}

export interface DirectAnswerEvent extends ConversationEventBase {
  readonly eventType: "DIRECT_ANSWER_FULFILLED";
  readonly obligation: import("./decisionTurnResult").DirectAnswerObligationKind;
}

export type OfferLifecycleEvent = ConversationEventBase & (
  | { readonly eventType: "OFFER_LIFECYCLE"; readonly offerId: string; readonly lifecycleState: "CREATED"; readonly offer: GovernedOffer }
  | { readonly eventType: "OFFER_LIFECYCLE"; readonly offerId: string; readonly lifecycleState: Exclude<OfferLifecycleState, "CREATED"> }
);

export type SocialInteractionEvent = ConversationEventBase & {
  readonly eventType: "SOCIAL_INTERACTION";
  readonly interaction: "SHORT_SOCIAL" | "VEHICLE_CONTEXT_RESUMED";
  readonly humanContext?: HumanContextKind;
};

export type OffTopicEvent = ConversationEventBase & {
  readonly eventType: "OFF_TOPIC";
  readonly transition: "DETECTED" | "RETURNED_TO_VEHICLE" | "BOUNDARY_STATED";
};

export type AbuseEvent = ConversationEventBase & {
  readonly eventType: "ABUSE";
  readonly transition: "BOUNDARY_SET" | "WARNED" | "ENDED" | "EXPLICIT_RESET";
};

export interface VehicleIntentEvent extends ConversationEventBase {
  readonly eventType: "VEHICLE_INTENT_ESTABLISHED";
}

export interface ConversationStateTransitionEvent extends ConversationEventBase {
  readonly eventType: "CONVERSATION_STATE_TRANSITION";
  readonly from: DecisionState;
  readonly to: DecisionState;
}

export type ConversationEvent =
  | ConstraintEvent
  | BudgetEvent
  | CandidateRejectionEvent
  | PersonaPreferenceEvent
  | MaterialQuestionEvent
  | ModelReferenceEvent
  | DirectAnswerEvent
  | OfferLifecycleEvent
  | SocialInteractionEvent
  | OffTopicEvent
  | AbuseEvent
  | VehicleIntentEvent
  | ConversationStateTransitionEvent;
