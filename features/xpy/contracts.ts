/** Versioned, domain-neutral AŞAMA 1 protocol. Domain vocabulary stays in Domain Packs. */
export const XPY_PROTOCOL_VERSION = "xpy-stage1/v1" as const;

export const XPY_OUTCOMES = ["ASK", "CLARIFY", "RESPOND", "DECISION_READY", "UNSUPPORTED", "FAILED_CLOSED"] as const;
export type XpyOutcomeKind = (typeof XPY_OUTCOMES)[number];

export interface XpyAuthorityReference {
  readonly authorityId: string;
  readonly version: string;
  readonly digest: string;
}

export interface XpyTurnInput<Recovered = unknown> {
  readonly protocolVersion: typeof XPY_PROTOCOL_VERSION;
  readonly domainPackId: string;
  readonly conversationId: string;
  readonly messageId: string;
  readonly expectedRevision: number;
  readonly message: string;
  readonly recovered?: Recovered;
}

/** X is proposal-only. Nothing in this envelope is authoritative decision context. */
export interface XpyAssistantResult<Proposal = unknown> {
  readonly intent: "INFORMATION" | "ADVISORY" | "SOCIAL" | "OFF_TOPIC" | "SAFETY" | "CLOSING" | "DECISION_CONTEXT" | "CORRECTION" | "UNKNOWN";
  readonly proposals: readonly Proposal[];
  readonly directResponse?: string;
  readonly preservePendingQuestion: boolean;
}

export interface XpyPlannerInput<Context = unknown, QuestionState = unknown, Proposal = unknown> {
  readonly context: Context;
  readonly questionState: QuestionState;
  readonly validatedProposals: readonly Proposal[];
}

export type XpyPlannedQuestion =
  | { readonly kind: "ASK" | "CLARIFY"; readonly questionKey: string; readonly message: string; readonly choices?: XpyChoiceSet }
  | { readonly kind: "NO_MATERIAL_QUESTION"; readonly reason: string };

export interface XpyChoiceOption { readonly value: string; readonly label: string; readonly description?: string; readonly exclusive?: boolean }
export interface XpyAdvisoryPresentation { readonly kind: "DOMAIN_ORIENTATION"; readonly source: "DOMAIN_PACK"; readonly message: string; readonly contextMutation: "NONE" }
export interface XpyChoiceSet {
  readonly questionKey: string;
  readonly selectionMode: "SINGLE" | "MULTIPLE";
  readonly source: "DOMAIN_PACK";
  readonly prompt?: string;
  readonly options: readonly XpyChoiceOption[];
}

/** Metadata sent by a choice control. `value` still travels through the normal text interpreter. */
export interface XpyChoiceSubmission { readonly questionKey: string; readonly values: readonly string[] }

export interface XpyMaterialQuestionCandidate<Question = XpyPlannedQuestion> {
  readonly question: Question;
  readonly answerable: boolean;
  readonly materialDecisionValue: number;
  readonly stableKey: string;
}

export interface XpyDecisionResult<Candidate = unknown, Card = unknown> {
  readonly candidates: readonly Candidate[];
  readonly sufficiency: "INSUFFICIENT" | "SUFFICIENT" | "TIED" | "UNKNOWN_EVIDENCE";
  readonly selection?: Candidate;
  readonly authorization?: { readonly fingerprint: string; readonly authority: readonly XpyAuthorityReference[] };
  readonly card?: Card;
}

export interface XpyPublicOutcome<Payload = unknown> {
  readonly protocolVersion: typeof XPY_PROTOCOL_VERSION;
  readonly kind: XpyOutcomeKind;
  readonly conversationId: string;
  readonly revision: number;
  readonly replayed?: boolean;
  readonly payload: Payload;
  readonly authority: readonly XpyAuthorityReference[];
}

export interface XpyDomainPackCapabilities {
  readonly contextualAnswers: boolean;
  readonly questionDeferral: boolean;
  readonly hardBrandConstraint: boolean;
  readonly budgetDecisionFilter: boolean;
  readonly authorizedDecisionCards: boolean;
  /** Behavioral fixtures this pack can execute with governed domain semantics. */
  readonly behavioralAcceptance: readonly XpyBehavioralCapability[];
}

export const XPY_BEHAVIORAL_CAPABILITIES = [
  "INFORMATION_REENTRY", "REFERENCE_CLARIFICATION", "SHORT_ANSWER", "MULTI_VALUE_ANSWER",
  "CORRECTION_SUPERSESSION", "EXPLICIT_REJECTION", "CROSS_TURN_CONTRADICTION",
  "UNKNOWN_NO_PREFERENCE", "MATERIAL_FILTERING", "NO_EFFECT_SUPPRESSION",
  "REVISION_BOUND_COUNTS", "NO_FALSE_SINGLE_WINNER", "CURRENT_CONTEXT_RATIONALE",
  "AUTHORIZATION_BEFORE_CARD", "PUBLIC_VOCABULARY", "RECOVERY_IDEMPOTENCY",
] as const;
export type XpyBehavioralCapability = (typeof XPY_BEHAVIORAL_CAPABILITIES)[number];

export interface XpyDomainPackRegistration {
  readonly protocolVersion: typeof XPY_PROTOCOL_VERSION;
  readonly runtimeVersion: import("./runtimeContract").XpyRuntimeBinding["version"];
  readonly runtimeDigest: import("./runtimeContract").XpyRuntimeBinding["digest"];
  readonly domainPackId: string;
  readonly departmentId: string;
  readonly categories: readonly string[];
  readonly capabilities: XpyDomainPackCapabilities;
  readonly authority: readonly XpyAuthorityReference[];
  readonly xReentry: Readonly<Record<string, XpyDomainReentryConfig>>;
}

export interface XpyDomainReentryConfig {
  readonly publicName: string;
  readonly decisionJourneyPurpose: string;
  readonly reentryPrompt: string;
  readonly informationalTerms: readonly string[];
  readonly governedReferences?: readonly XpyGovernedReference[];
}

export interface XpyGovernedReference {
  readonly aliases: readonly string[];
  /** Clarification only: it must not write decision context or name an exact product. */
  readonly clarification: string;
}

/** X-only, non-authoritative category welcome. Missing category prose uses the declared honest fallback. */
export interface XpyWelcomeKnowledge {
  readonly source: "DOMAIN_PACK" | "HONEST_FALLBACK";
  readonly categoryName: string;
  readonly introduction: string;
  readonly needDimensions: readonly string[];
  readonly technologySummary?: string;
  readonly openingQuestion: string;
  readonly contextMutation: "NONE";
}
