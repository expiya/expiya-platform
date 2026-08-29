import { z } from "zod";
import type { SourceSpan } from "../types";

export const ANALYST_CONCEPTS = [
  "primaryUsage", "roadCondition", "passengerCapacity", "cargoRequirement", "parkingDifficulty",
  "maneuverabilityNeed", "groundClearanceNeed", "tractionNeed", "longDistanceComfort", "familyPracticality",
  "cargoPracticality", "accessibilityNeed", "operatingCostPriority", "performancePreference", "bodyStyleReference",
  "fuelPreference", "transmissionPreference", "equipmentRequirement", "brandReference", "modelReference",
] as const;
export type AnalystConcept = typeof ANALYST_CONCEPTS[number];

export const ANALYST_REASON_CODES = [
  "ROUGH_UNPAVED_ROAD_CONTEXT", "SEVERE_TRACTION_CONTEXT", "PARKING_CONTEXT", "FAMILY_CONTEXT",
  "CARGO_CONTEXT", "LONG_DISTANCE_CONTEXT", "ACCESSIBILITY_CONTEXT", "OPERATING_COST_CONTEXT",
  "PERFORMANCE_CONTEXT", "AMBIGUOUS_DAILY_LANGUAGE", "NO_SEVERE_TRACTION_EVIDENCE",
] as const;
export type AnalystReasonCode = typeof ANALYST_REASON_CODES[number];
export type AnalystValue = string | number | readonly string[];

export interface AnalystExplicitFact {
  readonly concept: AnalystConcept; readonly normalizedValue: AnalystValue; readonly sourceSpan: SourceSpan;
  readonly confidence: number; readonly explicitness: "USER_EXPLICIT"; readonly confirmationRequired: false;
}
export interface AnalystHypothesis {
  readonly concept: AnalystConcept; readonly proposedValue: AnalystValue; readonly sourceSpans: readonly SourceSpan[];
  readonly confidence: number; readonly decisionUse: "QUESTION_INPUT" | "NONE"; readonly reasonCode: AnalystReasonCode;
  readonly confirmationRequired: true;
}
export interface AnalystUnknown {
  readonly concept: AnalystConcept; readonly reasonCode: "NOT_EXPRESSED" | "AMBIGUOUS" | "INSUFFICIENT_EVIDENCE" | "CONFLICTING_EVIDENCE";
}
export interface AnalystCorrection {
  readonly concept: AnalystConcept; readonly operation: "REJECT" | "CLEAR" | "SUPERSEDE"; readonly sourceSpan: SourceSpan;
  readonly replacementValue?: AnalystValue; readonly confidence: number;
}
export interface SemanticNeedsAnalysisV1 {
  readonly version: "1.0"; readonly origin: "MODEL" | "BOUNDED_FALLBACK"; readonly sourceMessageId: string;
  readonly conversationRevision: number; readonly explicitFacts: readonly AnalystExplicitFact[];
  readonly hypotheses: readonly AnalystHypothesis[]; readonly unknowns: readonly AnalystUnknown[];
  readonly corrections: readonly AnalystCorrection[];
}

const valueSchema = z.union([z.string().max(120), z.number().finite(), z.array(z.string().max(120)).max(12)]);
const spanSchema = z.object({ start: z.number().int().nonnegative(), end: z.number().int().positive(), text: z.string().min(1).max(500) }).strict();
export const semanticNeedsAnalysisPayloadSchema = z.object({
  explicitFacts: z.array(z.object({ concept: z.enum(ANALYST_CONCEPTS), normalizedValue: valueSchema, sourceSpan: spanSchema, confidence: z.number().min(0).max(1), explicitness: z.literal("USER_EXPLICIT"), confirmationRequired: z.literal(false) }).strict()).max(24),
  hypotheses: z.array(z.object({ concept: z.enum(ANALYST_CONCEPTS), proposedValue: valueSchema, sourceSpans: z.array(spanSchema).min(1).max(6), confidence: z.number().min(0).max(1), decisionUse: z.enum(["QUESTION_INPUT", "NONE"]), reasonCode: z.enum(ANALYST_REASON_CODES), confirmationRequired: z.literal(true) }).strict()).max(24),
  unknowns: z.array(z.object({ concept: z.enum(ANALYST_CONCEPTS), reasonCode: z.enum(["NOT_EXPRESSED", "AMBIGUOUS", "INSUFFICIENT_EVIDENCE", "CONFLICTING_EVIDENCE"]) }).strict()).max(24),
  corrections: z.array(z.object({ concept: z.enum(ANALYST_CONCEPTS), operation: z.enum(["REJECT", "CLEAR", "SUPERSEDE"]), sourceSpan: spanSchema, replacementValue: valueSchema.nullable(), confidence: z.number().min(0).max(1) }).strict()).max(12),
}).strict();

export const FORBIDDEN_ANALYST_OUTPUT_FIELDS = ["recommendedQuestion", "questionText", "nextQuestion", "hardFilter", "candidateImpact", "candidateCount", "selectedCandidateId", "recommendationIds", "rankingInstruction", "offerInstruction"] as const;
