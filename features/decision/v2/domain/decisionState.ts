export type DecisionState =
  | "SOCIAL"
  | "VEHICLE_INTENT_ESTABLISHED"
  | "DIRECT_MODEL_LOOKUP"
  | "UNDERSTANDING_NEEDS"
  | "FILTERING"
  | "TECHNICAL_GUIDANCE"
  | "CONFLICT"
  | "TRADEOFF"
  | "READY"
  | "OFFERING"
  | "AWAITING_CONSENT"
  | "REVEALED"
  | "CANDIDATE_REJECTED"
  | "OFF_TOPIC_RECOVERY"
  | "ABUSE_WARNING"
  | "LIMITED_OR_ENDED";

export type DecisionAction =
  | { readonly type: "SOCIAL_REPLY" }
  | { readonly type: "ANSWER_DIRECTLY" }
  | { readonly type: "ANSWER_MODEL_LOOKUP" }
  | { readonly type: "EXPLAIN_TECHNICAL_CONCEPT" }
  | { readonly type: "ASK_MATERIAL_QUESTION" }
  | { readonly type: "EXPLAIN_CONFLICT" }
  | { readonly type: "PRESENT_CANDIDATE_SUMMARY" }
  | { readonly type: "REQUEST_REVEAL_CONSENT" }
  | { readonly type: "REVEAL_AUTHORIZED_CARDS" }
  | { readonly type: "END_POLITELY" };

export type MaterialQuestionAnswerCapability = "ANSWER" | "SKIP" | "UNKNOWN" | "NOT_IMPORTANT";

export interface MaterialQuestionOptionProvenance {
  readonly source: "CURRENT_CANDIDATE_POOL" | "VERSIONED_PRODUCT_POLICY" | "OWNER_EDITORIAL";
  readonly candidatePoolFingerprint: string;
  readonly supportingCandidateIds: readonly string[];
  readonly authorityReference: string;
}

export interface MaterialQuestionOption {
  readonly id: string;
  readonly semanticValue: string;
  readonly userFacingLabel: string;
  readonly userFacingDescription?: string;
  readonly provenance: MaterialQuestionOptionProvenance;
}

export interface MaterialQuestion {
  readonly id: string;
  readonly stableSemanticKey: string;
  readonly field: string;
  readonly promptIntent: "CLARIFY_REQUIREMENT" | "RESOLVE_CONFLICT" | "DISCRIMINATE_CANDIDATES" | "CONFIRM_INTERPRETATION" | "OPTIONAL_PERSONA";
  readonly options: readonly MaterialQuestionOption[];
  readonly selectionMode?: "SINGLE" | "MULTIPLE";
  readonly minimumSelections?: number;
  readonly maximumSelections?: number;
  readonly answerCapabilities: readonly MaterialQuestionAnswerCapability[];
  readonly materialityReason: string;
}
