import type { AllowedInterpretationFieldId, JsonSafeValue, ProposedConstraintMutation, ProposedPersonaMutation } from "../interpretation/types";

export const AUTOMOTIVE_SEMANTIC_CONCEPTS = ["PERFORMANCE_ORIENTED_VEHICLE", "PEOPLE_CARRIER", "FAMILY_SPORTING_BALANCE", "ELEVATED_COMPACT", "EFFORTLESS_LONG_DISTANCE", "AGILE_RESPONSE", "LOW_RUNNING_COST", "CARGO_CARRIER", "OFF_ROAD_CAPABILITY", "REFERENCE_ANALOGY"] as const;
export type AutomotiveSemanticConcept = typeof AUTOMOTIVE_SEMANTIC_CONCEPTS[number];
export type SemanticExplicitness = "USER_EXPLICIT" | "INFERRED_SUBDIMENSION";
export type SemanticConfirmationStatus = "CONFIRMED_BY_USER" | "UNCONFIRMED_HYPOTHESIS" | "REJECTED_BY_USER";
export type SemanticPolarity = "POSITIVE" | "NEGATIVE";

export interface SemanticEvidence {
  readonly sourceSpan: string;
  readonly explicitness: SemanticExplicitness;
  readonly confidence: number;
  readonly confirmationStatus: SemanticConfirmationStatus;
}

export interface AutomotiveSemanticSignal extends SemanticEvidence {
  readonly id: string;
  readonly concept: AutomotiveSemanticConcept;
  readonly polarity: SemanticPolarity;
  readonly projectionHint?: { readonly fieldId: AllowedInterpretationFieldId; readonly normalizedValue: JsonSafeValue };
}

export interface AutomotiveReferenceAnalogy extends SemanticEvidence {
  readonly rawText: string;
  readonly relation: "SIMILAR_TO" | "UNLIKE" | "ATTRIBUTE_OF_REFERENCE";
  readonly parsedBrandText?: string;
  readonly parsedModelText?: string;
  readonly intendedAttribute?: string;
}

export interface AutomotiveSemanticResult {
  readonly schemaVersion: "ASIL-0.1";
  readonly messageId: string;
  readonly concepts: readonly AutomotiveSemanticSignal[];
  readonly archetypes: readonly AutomotiveSemanticSignal[];
  readonly analogies: readonly AutomotiveReferenceAnalogy[];
  readonly qualitativeNeeds: readonly AutomotiveSemanticSignal[];
  readonly ambiguities: readonly { readonly code: string; readonly sourceSpan: string; readonly clarificationCandidates: readonly string[] }[];
  readonly candidateInterpretations: readonly { readonly label: string; readonly confidence: number; readonly supportingSignalIds: readonly string[] }[];
  readonly requestedFacts: readonly { readonly factId: string; readonly authority: "CATALOG" | "KNOWLEDGE_LAYER"; readonly reason: string }[];
  readonly conversationalAct: "SOCIAL" | "INFORMATION" | "VEHICLE_DISCOVERY" | "CORRECTION" | "NEGATION" | "CLARIFICATION_ANSWER" | "OTHER";
  readonly providerStatus: "AVAILABLE" | "BOUNDED_FALLBACK";
  readonly fallbackReason?: "PROVIDER_UNAVAILABLE" | "INVALID_STRUCTURED_OUTPUT" | "MESSAGE_ID_MISMATCH" | "UNKNOWN_PROVIDER_FAILURE";
}

export interface DecisionCompilationResult {
  readonly contractVersion: "ASIL-DECISION-COMPILATION-0.1";
  readonly messageId: string;
  readonly decisionMutations: readonly ProposedConstraintMutation[];
  readonly personaMutations: readonly ProposedPersonaMutation[];
  readonly withheldSignals: readonly { readonly signalId: string; readonly reason: "UNCONFIRMED" | "INFERRED" | "UNSUPPORTED_FIELD" | "INSUFFICIENT_COVERAGE" | "LOW_CONFIDENCE" | "NEGATIVE_WITHOUT_SAFE_OPERATOR" }[];
  readonly decisionImpact: "NONE" | "PROPOSED_MUTATIONS";
  readonly compilationFingerprint: `sha256:${string}`;
}

export interface AutomotiveSemanticRequest {
  readonly contractVersion: "ASIL-0.1";
  readonly messageId: string;
  readonly userMessageData: { readonly text: string };
  readonly instructions: readonly string[];
}

export interface AutomotiveSemanticModel { interpretAutomotiveSemantics(input: AutomotiveSemanticRequest): Promise<unknown> }
