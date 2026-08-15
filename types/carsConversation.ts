import type { RecommendedCar } from "@/types/recommendation";

export interface CarsConversationMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly recommendations?: readonly RecommendedCar[];
  readonly recommendationIds?: readonly string[];
  readonly quickReplies?: readonly string[];
  readonly discriminatorChoices?: readonly CarsFinalDiscriminatorChoice[];
  readonly satisfaction?: "HELPFUL" | "NOT_HELPFUL";
  readonly sellerResearchRequest?: {
    readonly province: string;
    readonly district: string;
    readonly status: "PLANNED_V0_2";
  };
}

export interface PersistedCarsConversation {
  readonly version: 4;
  readonly conversationId: string;
  readonly messages: readonly CarsConversationMessage[];
}

export interface CarsConversationRequest {
  readonly conversationId: string;
  readonly messages: readonly CarsConversationMessage[];
  readonly choiceId?: CarsFinalDiscriminatorChoiceId;
}

export type CarsConversationState =
  | "COLLECTING_CONTEXT"
  | "CLARIFICATION_REQUIRED"
  | "FINAL_DISCRIMINATOR_REQUIRED"
  | "DECISION_READY"
  | "INSUFFICIENT_SUPPORTED_EVIDENCE"
  | "NO_SUPPORTED_CANDIDATE"
  | "SYSTEM_FAILURE";

export type CarsRequirementKey =
  | "USAGE_CAMP"
  | "USAGE_ROUGH_ROAD"
  | "USAGE_STABILIZED_ROAD"
  | "BUDGET_MAX_TRY"
  | "DRIVETRAIN"
  | "BODY_TYPE"
  | "MIN_SEATS"
  | "MIN_CARGO_L";

export type CarsRequirementStatus =
  | "SUPPORTED_EVALUABLE"
  | "SUPPORTED_NOT_YET_EVALUABLE"
  | "UNDERSTOOD_BUT_UNSUPPORTED"
  | "NEEDS_CLARIFICATION";

export type CarsQuestionPurpose = "PRIMARY_USAGE" | "BUDGET_MAX" | "MIN_SEATS" | "MIN_CARGO" | "FINAL_PRIORITY";

export interface CarsRequirementLedgerEntry {
  readonly key: CarsRequirementKey;
  readonly value: string | number;
  readonly status: CarsRequirementStatus;
  readonly sourceTurn: number;
  readonly sourceText: string;
  readonly previousValue?: string | number;
  readonly usedInDecision: boolean;
}

export interface CarsConversationTrace {
  readonly state: CarsConversationState;
  readonly requirements: readonly CarsRequirementLedgerEntry[];
  readonly askedQuestionPurposes: readonly CarsQuestionPurpose[];
  readonly answeredQuestionPurposes: readonly CarsQuestionPurpose[];
  readonly latestUserTurn: number;
  readonly capturedOnLatestTurn: readonly CarsRequirementKey[];
  readonly didConversationProgress: boolean;
  readonly textInputAllowed: boolean;
}

export type CarsFinalDiscriminatorChoiceId = "MAX_SEATS" | "MAX_CARGO";

export interface CarsFinalDiscriminatorChoice {
  readonly id: CarsFinalDiscriminatorChoiceId;
  readonly label: string;
}

export interface CarsConversationEvidenceDecision {
  readonly conversationState: "FOLLOW_UP" | "FINAL_DISCRIMINATOR_REQUIRED" | "DECISION_READY" | "EVIDENCE_INSUFFICIENT" | "NO_ELIGIBLE_CANDIDATE";
  readonly decisionStatus: "NEEDS_MORE_USER_CONTEXT" | "DECISION_READY" | "INSUFFICIENT_VEHICLE_EVIDENCE" | "NO_ELIGIBLE_CANDIDATE";
  readonly evidenceBacked: boolean;
  readonly selectedRuntimeVehicleCandidateId?: string;
  readonly selectedVehicle?: { readonly brand: string; readonly model: string; readonly trim: string };
  readonly requirements: readonly { readonly factKey: "seats" | "cargo_volume_l"; readonly predicate: "AT_LEAST"; readonly value: number }[];
  readonly candidateDispositions?: readonly { readonly runtimeVehicleCandidateId: string; readonly disposition: "ELIGIBLE" | "ELIMINATED_BY_MATERIAL_CONSTRAINT" | "NOT_EVALUABLE" }[];
  readonly evidenceTrace?: { readonly candidateIds: readonly string[]; readonly artifactVersion: string };
  readonly followUpQuestion?: string;
  readonly limitations?: readonly string[];
  readonly discriminatorChoices?: readonly CarsFinalDiscriminatorChoice[];
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
