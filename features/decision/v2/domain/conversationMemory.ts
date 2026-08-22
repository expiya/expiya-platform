import type { BudgetState } from "./budget";
import type {
  ConversationEvent,
  MaterialQuestionAnswerStatus,
  PersonaActivationSource,
  VehiclePersonaTrait,
} from "./conversationEvent";
import type { DecisionState } from "./decisionState";
import type { DirectAnswerObligationKind } from "./decisionTurnResult";
import type { OfferLifecycleState } from "./offer";

export type PersonaState =
  | { readonly activated: false; readonly requestedTraits: readonly [] }
  | {
      readonly activated: true;
      readonly activationSource: PersonaActivationSource;
      readonly requestedTraits: readonly [VehiclePersonaTrait, ...VehiclePersonaTrait[]];
      readonly sourceTurn: number;
    };

export interface ModelReference {
  readonly id: string;
  readonly sourceMessageId: string;
  readonly sourceTurn: number;
  readonly rawText: string;
  readonly normalizedBrand?: string;
  readonly normalizedModel?: string;
  readonly resolution: "UNRESOLVED" | "EXACT_MODEL_FAMILY" | "EXACT_VARIANT" | "BRAND_ONLY" | "POSSIBLE_TYPO" | "NOT_FOUND" | "AMBIGUOUS";
  readonly decisionEffect: "LOOKUP_ONLY" | "COMPARISON_SCOPE" | "PREFERENCE" | "HARD_SCOPE";
  readonly resolvedFamilyIds: readonly string[];
  readonly resolvedVariantIds: readonly string[];
  readonly suggestedCanonicalNames?: readonly string[];
}

export interface MaterialQuestionHistoryEntry {
  readonly questionId: string;
  readonly stableSemanticKey: string;
  readonly field: string;
  readonly askedOnTurn: number;
  readonly answerStatus: "OPEN" | MaterialQuestionAnswerStatus;
  readonly answeredOnTurn?: number;
}

export interface CurrentOfferReference {
  readonly offerId: string;
  readonly lifecycleState: OfferLifecycleState;
  readonly catalogFingerprint: string;
  readonly decisionFingerprint: string;
  readonly candidateIds: readonly string[];
  readonly revealable: boolean;
}

export interface SocialState {
  readonly lastSocialTurn?: number;
  readonly consecutiveSocialTurns: number;
}

export interface OffTopicState {
  readonly consecutiveOffTopicTurns: number;
  readonly boundaryStated: boolean;
}

export interface AbuseState {
  readonly level: "NONE" | "BOUNDARY_SET" | "WARNED" | "ENDED";
  readonly strikeCount: number;
}

export interface DirectAnswerHistoryEntry {
  readonly obligation: DirectAnswerObligationKind;
  readonly sourceMessageId: string;
  readonly sourceTurn: number;
  readonly fulfilledOnTurn: number;
}

export interface CatalogAuthoritySnapshot {
  readonly market: string;
  readonly releaseVersion: string;
  readonly catalogFingerprint: string;
  readonly manifestFingerprint: string;
  readonly activatedAt: string;
}

export interface ConversationMemory {
  readonly conversationId: string;
  readonly turn: number;
  readonly state: DecisionState;
  readonly vehicleIntentEstablished: boolean;
  readonly events: readonly ConversationEvent[];
  readonly budget: BudgetState;
  readonly modelReferences: readonly ModelReference[];
  readonly currentOffer?: CurrentOfferReference;
  readonly revealedCandidateIds: readonly string[];
  readonly socialState: SocialState;
  readonly offTopicState: OffTopicState;
  readonly abuseState: AbuseState;
  readonly directAnswerHistory: readonly DirectAnswerHistoryEntry[];
  readonly materialQuestionHistory: readonly MaterialQuestionHistoryEntry[];
  readonly persona: PersonaState;
  readonly catalogAuthority: CatalogAuthoritySnapshot;
  readonly memoryFingerprint: string;
  readonly decisionFingerprint: string;
}
