export const SEMANTIC_DECISION_PROJECTION_V2 = "SemanticDecisionProjection/v2" as const;

export type ProjectionScope = "CLASS" | "FAMILY" | "MODEL" | "VARIANT" | "EXACT_OFFERING";
export type Uncertainty = "KNOWN" | "UNKNOWN" | "CONFLICTED" | "STALE" | "NOT_APPLICABLE";
export type DecisionUse = "HARD_FILTER" | "SOFT_PREFERENCE" | "QUESTION_INPUT" | "PLANNING_ONLY" | "EXPLANATION_ONLY" | "NONE";
export type CandidateEffectKind = "knownRetain" | "knownExclude" | "unknownRetain" | "softOnly" | "none";
export type PredicateOperator = "EQ" | "NEQ" | "GT" | "GTE" | "LT" | "LTE" | "IN" | "CONTAINS" | "EXISTS";
export type HonestAllowedOutcome =
  | "ASK_ONE_QUESTION"
  | "NO_MATERIAL_QUESTION"
  | "KNOWN_CANDIDATE_PARTITION"
  | "UNKNOWN_CANDIDATES_RETAINED"
  | "CONFLICTED_EVIDENCE_EXCLUDED_FROM_DECISION"
  | "SOFT_COMPARISON_ONLY"
  | "EXPLANATION_ONLY"
  | "INSUFFICIENT_EVIDENCE"
  | "NON_RANKED_CANDIDATE_POOL"
  | "NO_SINGLE_WINNER";

export interface SemanticAuthorityReference {
  readonly authorityId: string;
  readonly version: string;
  readonly digest: `sha256:${string}`;
}
export interface ProjectionIdentity {
  readonly projectionId: string;
  readonly categoryId: string;
  readonly scope: ProjectionScope;
}

export interface ExactOfferingIdentity {
  readonly exactOfferingId: string;
  readonly categoryId: string;
  readonly market: string;
  readonly configurationId: string;
  readonly classId?: string;
  readonly familyId?: string;
  readonly modelId?: string;
  readonly variantId?: string;
}

export interface Applicability {
  readonly market: string;
  readonly configurationIds: readonly string[];
  readonly effectiveFrom: string;
  readonly effectiveThrough?: string;
  readonly explicitlyApplies: boolean;
  readonly limitations: readonly string[];
}

export interface SourceReference {
  readonly sourceId: string;
  readonly authority: "PRIMARY" | "REGULATORY" | "OWNER_MANUAL" | "GOVERNED_COMPARISON" | "CONTRACT_FIXTURE";
  readonly digest: `sha256:${string}`;
  readonly market: string;
  readonly capturedAt: string;
  readonly reliability: number;
  readonly locator?: string;
}

export interface FactCapabilityReference {
  readonly factId: string;
  readonly capabilityId: string;
  readonly sourceRefs: readonly string[];
}

export interface TechnicalPredicate {
  readonly field: string;
  readonly operator: PredicateOperator;
  readonly value: string | number | boolean | readonly string[];
  readonly unit?: string;
  readonly context: string;
  readonly regime: string;
}

export interface DailyLifeConsequence {
  readonly statementTr: string;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly nonGuarantees: readonly string[];
}

export interface UserNeed {
  readonly needId: string;
  readonly statementTr: string;
  readonly decisionUse: DecisionUse;
}

export interface AnswerOption {
  readonly answerId: string;
  readonly labelTr: string;
  readonly establishesExplicitRequirement: boolean;
}

export interface QuestionPrerequisite {
  readonly prerequisiteId: string;
  readonly description: string;
  readonly required: boolean;
}

export interface CandidateEffect {
  readonly exactOfferingId: string;
  readonly effect: CandidateEffectKind;
  readonly uncertainty: Uncertainty;
  readonly partition: string | null;
  readonly evidenceRefs: readonly string[];
  readonly exactKnownMismatch: boolean;
}

export interface MaterialQuestion {
  readonly questionId: string;
  readonly publicTurkishQuestion: string;
  readonly answerDomain: readonly AnswerOption[];
  readonly prerequisites: readonly QuestionPrerequisite[];
  readonly candidateEffectByAnswer: Readonly<Record<string, readonly CandidateEffect[]>>;
  readonly decisionUseOnExplicitAnswer: DecisionUse;
  readonly predominantlyUnknownSuppressionCode?: string;
}

export interface InheritancePolicy {
  readonly sourceScope: ProjectionScope;
  readonly targetScope: "EXACT_OFFERING";
  readonly allowedPurpose: "VOCABULARY" | "TEMPLATE" | "EXPLANATION" | "TECHNICAL_DECISION";
  readonly explicitApplicabilityRequired: boolean;
  readonly identityBridgeRequired: boolean;
  readonly identityBridgeRef?: string;
  readonly blockedByConflict: boolean;
  readonly blockedByConflictRefs: readonly string[];
  readonly foreignMarketDecisionAuthority: "NONE";
}

export interface PriceDecisionPolicy {
  readonly requiresExplicitBudget: true;
  readonly requiresFreshExactPrice: true;
  readonly commerceIsolated: true;
  readonly freshThrough?: string;
}

export interface PersonaDecisionPolicy {
  readonly maximumAggregateScore: 0.75;
  readonly membershipEffect: "NONE";
  readonly sufficiencyEffect: "NONE";
  readonly singleWinnerEffect: "NONE";
}

export interface SemanticDecisionProjectionV2 {
  readonly schemaVersion: typeof SEMANTIC_DECISION_PROJECTION_V2;
  readonly identity: ProjectionIdentity;
  readonly offerings: readonly ExactOfferingIdentity[];
  readonly semanticAuthority: SemanticAuthorityReference;
  readonly applicability: Applicability;
  readonly factCapabilityRefs: readonly FactCapabilityReference[];
  readonly sources: readonly SourceReference[];
  readonly technicalPredicate: TechnicalPredicate;
  readonly dailyLifeConsequence: DailyLifeConsequence;
  readonly userNeed: UserNeed;
  readonly materialQuestion: MaterialQuestion;
  readonly uncertainty: Uncertainty;
  readonly inheritance: InheritancePolicy;
  readonly priceDecisionPolicy?: PriceDecisionPolicy;
  readonly personaDecisionPolicy: PersonaDecisionPolicy;
  readonly honestAllowedOutcomes: readonly HonestAllowedOutcome[];
  readonly governedComparison: boolean;
  readonly fixtureClassification?: "SYNTHETIC_CONTRACT_FIXTURE" | "PINNED_EXTERNAL_LINEAGE_CONTRACT_FIXTURE";
}
