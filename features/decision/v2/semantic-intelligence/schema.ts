import { z } from "zod";
import { ALLOWED_INTERPRETATION_FIELDS } from "../interpretation/types";
import { AUTOMOTIVE_SEMANTIC_CONCEPTS, type AutomotiveSemanticResult } from "./types";

const boundedText = z.string().trim().min(1).max(500);
const evidence = { sourceSpan: boundedText, explicitness: z.enum(["USER_EXPLICIT", "INFERRED_SUBDIMENSION"]), confidence: z.number().min(0).max(1), confirmationStatus: z.enum(["CONFIRMED_BY_USER", "UNCONFIRMED_HYPOTHESIS", "REJECTED_BY_USER"]) } as const;
const jsonValue: z.ZodType<unknown> = z.union([z.string().max(200), z.number().finite(), z.boolean(), z.null(), z.array(z.union([z.string().max(200), z.number().finite(), z.boolean(), z.null()])).max(16), z.strictObject({ operator: z.enum(["EQUALS", "ONE_OF", "EXCLUDES", "MINIMUM", "MAXIMUM"]), value: z.union([z.string().max(200), z.number().finite(), z.array(z.string().max(200)).max(16)]) })]);
const signal = z.strictObject({ id: boundedText, concept: z.enum(AUTOMOTIVE_SEMANTIC_CONCEPTS), polarity: z.enum(["POSITIVE", "NEGATIVE"]), ...evidence, projectionHint: z.strictObject({ fieldId: z.enum(ALLOWED_INTERPRETATION_FIELDS), normalizedValue: jsonValue }).nullable() });
export const automotiveSemanticResultSchema = z.strictObject({
  schemaVersion: z.literal("ASIL-0.1"), messageId: boundedText,
  concepts: z.array(signal).max(24), archetypes: z.array(signal).max(12),
  analogies: z.array(z.strictObject({ rawText: boundedText, relation: z.enum(["SIMILAR_TO", "UNLIKE", "ATTRIBUTE_OF_REFERENCE"]), parsedBrandText: boundedText.nullable(), parsedModelText: boundedText.nullable(), intendedAttribute: boundedText.nullable(), ...evidence })).max(8),
  qualitativeNeeds: z.array(signal).max(24),
  ambiguities: z.array(z.strictObject({ code: boundedText, sourceSpan: boundedText, clarificationCandidates: z.array(boundedText).min(1).max(4) })).max(12),
  candidateInterpretations: z.array(z.strictObject({ label: boundedText, confidence: z.number().min(0).max(1), supportingSignalIds: z.array(boundedText).max(12) })).max(8),
  requestedFacts: z.array(z.strictObject({ factId: boundedText, authority: z.enum(["CATALOG", "KNOWLEDGE_LAYER"]), reason: boundedText })).max(12),
  conversationalAct: z.enum(["SOCIAL", "INFORMATION", "VEHICLE_DISCOVERY", "CORRECTION", "NEGATION", "CLARIFICATION_ANSWER", "OTHER"]),
  providerStatus: z.enum(["AVAILABLE", "BOUNDED_FALLBACK"]),
});

export function parseAutomotiveSemanticResult(value: unknown): AutomotiveSemanticResult {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const normalizeSignal = (item: unknown) => item && typeof item === "object" ? { projectionHint: null, ...item as object } : item;
  const normalizeAnalogy = (item: unknown) => item && typeof item === "object" ? { parsedBrandText: null, parsedModelText: null, intendedAttribute: null, ...item as object } : item;
  return automotiveSemanticResultSchema.parse({ ...source, concepts: Array.isArray(source.concepts) ? source.concepts.map(normalizeSignal) : source.concepts, archetypes: Array.isArray(source.archetypes) ? source.archetypes.map(normalizeSignal) : source.archetypes, qualitativeNeeds: Array.isArray(source.qualitativeNeeds) ? source.qualitativeNeeds.map(normalizeSignal) : source.qualitativeNeeds, analogies: Array.isArray(source.analogies) ? source.analogies.map(normalizeAnalogy) : source.analogies }) as AutomotiveSemanticResult;
}
