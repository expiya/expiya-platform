import { z } from "zod";
import { VEHICLE_PERSONA_TRAITS } from "../domain/conversationEvent";
import { ALLOWED_INTERPRETATION_FIELDS, USER_ACTS, type InterpretationResult } from "./types";

const text = z.string().max(4_000); const id = z.string().trim().min(1).max(160); const field = z.enum(ALLOWED_INTERPRETATION_FIELDS);
function jsonIssue(value: unknown, depth = 0): boolean { if (depth > 8) return true; if (value === null || typeof value === "boolean" || typeof value === "string") return typeof value === "string" && value.length > 4_000; if (typeof value === "number") return !Number.isFinite(value) || Object.is(value, -0); if (Array.isArray(value)) return value.length > 64 || value.some((item) => jsonIssue(item, depth + 1)); if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) return true; const entries = Object.entries(value); return entries.length > 64 || entries.some(([key, child]) => ["__proto__", "prototype", "constructor"].includes(key) || jsonIssue(child, depth + 1)); }
const scalar = z.union([z.null(), z.boolean(), z.number().finite(), text]);
const scalarOrArray = z.union([scalar, z.array(scalar).max(64)]);
const json = z.union([
  scalarOrArray,
  z.strictObject({ operator: z.enum(["EQUALS", "ONE_OF", "EXCLUDES", "MINIMUM", "MAXIMUM"]), value: scalarOrArray }),
  z.strictObject({ mappingId: id }),
  z.strictObject({ amount: z.number().positive().finite(), currency: z.literal("TRY") }),
]).refine((value) => !jsonIssue(value));
export const interpretationResultSchema = z.strictObject({
  schemaVersion: z.literal(1), messageId: id, acts: z.array(z.enum(USER_ACTS)).max(16),
  directAnswerRequests: z.array(z.strictObject({ kind: z.enum(["MODEL_AVAILABILITY", "MODEL_SUITABILITY", "MODEL_COMPARISON", "ALTERNATIVE_REQUEST", "RECOMMENDATION_REQUEST", "TECHNICAL_EXPLANATION", "BUDGET_IMPACT", "OTHER_SUPPORTED"]) })).max(8),
  constraintMutations: z.array(z.strictObject({ operation: z.enum(["ADD", "CORRECT", "CLEAR", "DECLINE"]), fieldId: field, normalizedValue: json, explicitness: z.enum(["EXPLICIT_REQUIREMENT", "EXPLICIT_PREFERENCE", "GUIDED_APPROXIMATION", "ILLUSTRATIVE"]), confidence: z.number().min(0).max(1), sourceSpan: text, supersedesFieldId: field.nullable() })).max(32),
  budgetMutations: z.array(z.strictObject({ operation: z.enum(["SET", "CORRECT", "CLEAR", "EXCLUDE_FROM_DECISION"]), field: z.enum(["AVAILABLE_CASH", "PREFERRED_BUDGET", "MAXIMUM_HARD_CEILING", "FINANCE_FLEXIBILITY", "UNRESOLVED_FINANCED_CEILING", "BUDGET_UNKNOWN"]), value: json.nullable(), sourceSpan: text })).max(16),
  modelReferences: z.array(z.strictObject({ rawText: text, parsedBrandText: text.nullable(), parsedModelText: text.nullable(), purpose: z.enum(["LOOKUP_ONLY", "COMPARISON_SCOPE", "PREFERENCE", "HARD_SCOPE"]) })).max(8),
  personaMutations: z.array(z.strictObject({ operation: z.enum(["ACTIVATE", "DEACTIVATE"]), traits: z.array(z.enum(VEHICLE_PERSONA_TRAITS)).max(13), sourceSpan: text })).max(4),
  candidateRejection: z.strictObject({ scope: z.enum(["EXACT_REVEALED", "MODEL_FAMILY_EXPLICIT", "BRAND_EXPLICIT", "AMBIGUOUS"]), referenceText: text, sourceSpan: text }).nullable(),
  technicalGuidanceRequest: z.strictObject({ fieldId: field.nullable(), mode: z.enum(["EXPLAIN", "GUIDE_WITH_DAILY_LIFE"]) }).nullable(), socialSignal: z.strictObject({ kind: z.enum(["GREETING", "HUMOR", "FIRST_CAR", "BUYING_FOR_OTHER", "GENERAL"]) }).nullable(), offTopicSignal: z.strictObject({ detected: z.literal(true) }).nullable(), abuseSignal: z.strictObject({ detected: z.literal(true) }).nullable(),
  corrections: z.array(z.strictObject({ fieldId: field, sourceSpan: text })).max(16), ambiguities: z.array(z.strictObject({ code: id, sourceSpan: text })).max(16),
});
export function parseInterpretationResult(input: unknown): InterpretationResult { const source = input && typeof input === "object" ? input as Record<string, unknown> : {}; const constraints = Array.isArray(source.constraintMutations) ? source.constraintMutations.map((item) => item && typeof item === "object" ? { supersedesFieldId: null, ...item } : item) : source.constraintMutations; const budgets = Array.isArray(source.budgetMutations) ? source.budgetMutations.map((item) => item && typeof item === "object" ? { value: null, ...item } : item) : source.budgetMutations; const references = Array.isArray(source.modelReferences) ? source.modelReferences.map((item) => item && typeof item === "object" ? { parsedBrandText: null, parsedModelText: null, ...item } : item) : source.modelReferences; const guidance = source.technicalGuidanceRequest && typeof source.technicalGuidanceRequest === "object" ? { fieldId: null, ...source.technicalGuidanceRequest } : null; return interpretationResultSchema.parse({ candidateRejection: null, socialSignal: null, offTopicSignal: null, abuseSignal: null, ...source, constraintMutations: constraints, budgetMutations: budgets, modelReferences: references, technicalGuidanceRequest: guidance }) as InterpretationResult; }
