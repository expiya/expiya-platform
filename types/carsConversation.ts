import type { RecommendedCar } from "@/types/recommendation";

export interface CarsConversationMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly recommendations?: readonly RecommendedCar[];
  readonly recommendationIds?: readonly string[];
  readonly quickReplies?: readonly string[];
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
}

export interface CarsConversationEvidenceDecision {
  readonly conversationState: "FOLLOW_UP" | "DECISION_READY" | "EVIDENCE_INSUFFICIENT" | "NO_ELIGIBLE_CANDIDATE";
  readonly decisionStatus: "NEEDS_MORE_USER_CONTEXT" | "DECISION_READY" | "INSUFFICIENT_VEHICLE_EVIDENCE" | "NO_ELIGIBLE_CANDIDATE";
  readonly evidenceBacked: boolean;
  readonly selectedRuntimeVehicleCandidateId?: string;
  readonly selectedVehicle?: { readonly brand: string; readonly model: string; readonly trim: string };
  readonly requirements: readonly { readonly factKey: "seats" | "cargo_volume_l"; readonly predicate: "AT_LEAST"; readonly value: number }[];
  readonly candidateDispositions?: readonly { readonly runtimeVehicleCandidateId: string; readonly disposition: "ELIGIBLE" | "ELIMINATED_BY_MATERIAL_CONSTRAINT" | "NOT_EVALUABLE" }[];
  readonly evidenceTrace?: { readonly candidateIds: readonly string[]; readonly artifactVersion: string };
  readonly followUpQuestion?: string;
  readonly limitations?: readonly string[];
}

export type CarsConversationResponse =
  | {
      readonly kind: "QUESTION";
      readonly message: string;
      readonly options?: readonly string[];
      readonly decision?: CarsConversationEvidenceDecision;
    }
  | {
      readonly kind: "RECOMMENDATIONS";
      readonly message: string;
      readonly recommendations: readonly RecommendedCar[];
      readonly decision?: CarsConversationEvidenceDecision;
    }
  | {
      readonly kind: "ERROR";
      readonly message: string;
    };
