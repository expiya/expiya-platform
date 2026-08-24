export const V3_ROUTES = [
  "SOCIAL_CONVERSATION", "OFF_TOPIC_REQUEST", "AUTOMOTIVE_INFORMATION",
  "PURCHASE_INTENT_DISCOVERY", "VEHICLE_PREFERENCE_UPDATE", "QUESTION_ANSWER",
  "CORRECTION_OR_RELAXATION", "RECOMMENDATION_OR_OFFER", "CLOSING_OR_TERMINATION",
  "SAFETY_BOUNDARY",
] as const;

export type V3Route = typeof V3_ROUTES[number];
export type V3MessageAct = "SOCIAL" | "AUTOMOTIVE_QUESTION" | "VEHICLE_PURCHASE_INTENT" | "PREFERENCE_SIGNAL" | "DECISION_REQUEST" | "CORRECTION" | "CLOSING";
export type V3SemanticContextKind = "FIRST_TIME_DRIVER" | "PURCHASE_RESEARCH" | "CURRENT_VEHICLE_OWNER";
export type PurchaseIntentState = "NOT_EXPRESSED" | "POSSIBLE" | "EXPLICIT" | "ACTIVE_DISCOVERY" | "READY_FOR_DECISION" | "ENDED_WITHOUT_INTENT";
export type PreferenceStrength = "EXPLICIT_HARD" | "EXPLICIT_STRONG" | "CONFIRMED_STRONG" | "WEAK_SIGNAL" | "UNCONFIRMED_HYPOTHESIS";
export type PreferenceStatus = "ACTIVE" | "REJECTED" | "SUPERSEDED" | "CLEARED";
export type DecisionUse = "HARD_FILTER" | "SOFT_RANK" | "QUESTION_INPUT" | "NONE";

export interface SourceSpan { readonly start: number; readonly end: number; readonly text: string }
export interface V3SemanticContextSignal { readonly kind: V3SemanticContextKind; readonly sourceSpan: SourceSpan; readonly confidence: number }
export interface RouterResult {
  readonly version: "3.8"; readonly route: V3Route; readonly confidence: number;
  readonly purchaseIntentEvidence: readonly SourceSpan[]; readonly decisionMutationAllowed: boolean;
  readonly catalogEvaluationRequired: boolean; readonly directAnswerRequired: boolean;
  readonly conversationReason: string; readonly sourceSpans: readonly SourceSpan[];
  readonly clarificationRequirement: string | null;
}
export interface PreferenceEvent {
  readonly id: string; readonly sourceMessageId: string; readonly sourceTurn: number; readonly sourceSpan: SourceSpan;
  readonly concept: string; readonly field?: string; readonly normalizedValue: string | number | readonly string[];
  readonly strength: PreferenceStrength; readonly status: PreferenceStatus; readonly decisionUse: DecisionUse;
  readonly confidence: number; readonly authority: "USER_EXPLICIT" | "USER_CONFIRMED" | "MODEL_INFERENCE" | "PRODUCT_POLICY";
  readonly supersedes?: string; readonly confirmationRequired: boolean;
}
export interface PendingConfirmation { readonly eventId: string; readonly concept: string; readonly proposedValue: string; readonly question: string }
export interface V3ConversationState {
  readonly version: "3.8"; readonly conversationId: string; readonly revision: number; readonly processedMessages: Readonly<Record<string, string>>;
  readonly purchaseIntent: PurchaseIntentState; readonly intentObservationTurns: number; readonly ledger: readonly PreferenceEvent[];
  readonly pendingConfirmation?: PendingConfirmation; readonly askedQuestionKeys: readonly string[]; readonly ended: boolean;
  readonly lastQuestionKey?: string; readonly lastRoute?: V3Route; readonly finalBrandModelQuestionAsked?: boolean;
  readonly pendingAction?: "RECOMMENDATION_DISCOVERY" | "RELAX_BRAND_FOR_POWERTRAIN";
  readonly pendingOffer?: { readonly offerId: string; readonly token: string; readonly candidateIds: readonly string[]; readonly limit: 1 | 3 };
}
export interface V3PublicResponse {
  readonly kind: "V3_CONVERSATION"; readonly message: string; readonly state: V3ConversationState;
  readonly recommendations?: readonly { readonly id: string; readonly title: string; readonly warning?: string; readonly reason?: never }[];
  readonly offerAwaitingConsent?: boolean;
  readonly variantCounts?: { readonly total: number; readonly remaining: number };
  readonly stateToken?: string;
}
