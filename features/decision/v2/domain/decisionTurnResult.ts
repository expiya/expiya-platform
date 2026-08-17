import type { CandidateEvaluationSet } from "./candidate";
import type { ConversationEvent } from "./conversationEvent";
import type { DecisionAction, DecisionState, MaterialQuestion } from "./decisionState";
import type { GovernedOffer } from "./offer";

export interface ExplanationFact {
  readonly id: string;
  readonly kind: "CATALOG_FACT" | "PRICE_FACT" | "POLICY_CLASSIFICATION" | "CONFLICT_FACT" | "LIMITATION";
  readonly value: unknown;
  readonly authorityReference: string;
  readonly userVisible: boolean;
  readonly candidateIds?: readonly string[];
}

export interface RealizationContract {
  readonly authorizedExplanationFactIds: readonly string[];
  readonly prohibitedClaims: readonly string[];
  readonly mentionableCandidateIds: readonly string[];
  readonly revealableCandidateIds: readonly string[];
  readonly directAnswerPlacement: "BEFORE_MATERIAL_QUESTION";
}

export type DirectAnswerObligationKind =
  | "MODEL_AVAILABILITY"
  | "MODEL_SUITABILITY"
  | "MODEL_COMPARISON"
  | "ALTERNATIVE_REQUEST"
  | "RECOMMENDATION_REQUEST"
  | "TECHNICAL_EXPLANATION"
  | "BUDGET_IMPACT"
  | "OTHER_SUPPORTED";

export interface DirectAnswerObligation {
  readonly kind: DirectAnswerObligationKind;
  readonly sourceMessageId: string;
  readonly authorizedExplanationFactIds: readonly string[];
  readonly authorizedCandidateIds: readonly string[];
  readonly placement: "BEFORE_MATERIAL_QUESTION";
}

export interface ConflictRelaxationOption {
  readonly id: string;
  readonly relaxConstraintIds: readonly [string, ...string[]];
  readonly resultingCandidateIds: readonly [string, ...string[]];
  readonly explanationFactIds: readonly string[];
}

export interface ConflictAnalysis {
  readonly zeroingConstraintIds: readonly [string, ...string[]];
  readonly inclusionMinimalConflictConstraintIds: readonly [string, ...string[]];
  readonly relaxationOptions: readonly [ConflictRelaxationOption, ...ConflictRelaxationOption[]];
  readonly authorizedConflictFactIds: readonly string[];
}

export interface DecisionTrace {
  readonly turn: number;
  readonly catalogFingerprint: string;
  readonly memoryFingerprint: string;
  readonly decisionFingerprint: string;
  readonly policyReferences: readonly {
    readonly policyId: string;
    readonly policyVersion: string;
    readonly policySource: string;
    readonly decisionEffect: string;
  }[];
}

export interface DecisionTurnResult {
  readonly state: DecisionState;
  readonly nextAction: DecisionAction;
  readonly directAnswerObligation: DirectAnswerObligation | null;
  readonly memoryEvents: readonly ConversationEvent[];
  readonly candidateEvaluation: CandidateEvaluationSet;
  readonly conflictAnalysis: ConflictAnalysis | null;
  readonly materialQuestion: MaterialQuestion | null;
  readonly offer: GovernedOffer | null;
  readonly explanationFacts: readonly ExplanationFact[];
  readonly realization: RealizationContract;
  readonly trace: DecisionTrace;
}
