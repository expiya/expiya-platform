import { z } from "zod";
import { HUMAN_CONTEXT_KINDS } from "../domain/humanContext";

import type { ConversationEvent } from "../domain/conversationEvent";
import { VEHICLE_PERSONA_TRAITS } from "../domain/conversationEvent";

const MAX_JSON_DEPTH = 8;
const MAX_ARRAY_LENGTH = 64;
const MAX_OBJECT_KEYS = 64;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;

function isCanonicalIsoTimestamp(value: string): boolean {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  const normalizedInput = value.includes(".") ? value : value.replace("Z", ".000Z");
  return parsed.toISOString() === normalizedInput;
}

const boundedId = z.string().trim().min(1).max(160);
const boundedText = z.string().max(4_000);
const boundedValue = z.string().max(400);
const nonNegativeInteger = z.number().int().nonnegative();

function jsonSafeIssue(value: unknown, depth = 0, seen = new WeakSet<object>()): string | undefined {
  if (depth > MAX_JSON_DEPTH) return "Normalized JSON exceeds maximum nesting depth.";
  if (value === null || typeof value === "boolean" || typeof value === "string") return typeof value === "string" && value.length > 4_000 ? "Normalized JSON string is too long." : undefined;
  if (typeof value === "number") return Number.isFinite(value) && !Object.is(value, -0) ? undefined : "Normalized JSON number must be finite and cannot be -0.";
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) return "Normalized JSON array is too long.";
    if (seen.has(value)) return "Normalized JSON cannot contain cycles.";
    seen.add(value);
    for (const child of value) {
      const issue = jsonSafeIssue(child, depth + 1, seen);
      if (issue) return issue;
    }
    return undefined;
  }
  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) return "Normalized JSON object must be a plain object.";
  if (seen.has(value)) return "Normalized JSON cannot contain cycles.";
  seen.add(value);
  const entries = Object.entries(value);
  if (entries.length > MAX_OBJECT_KEYS) return "Normalized JSON object has too many keys.";
  for (const [key, child] of entries) {
    if (FORBIDDEN_KEYS.has(key)) return `Normalized JSON contains forbidden key: ${key}.`;
    if (key.length === 0 || key.length > 160) return "Normalized JSON object key length is invalid.";
    const issue = jsonSafeIssue(child, depth + 1, seen);
    if (issue) return issue;
  }
  return undefined;
}

const jsonSafeSchema = z.unknown().superRefine((value, context) => {
  const issue = jsonSafeIssue(value);
  if (issue) context.addIssue({ code: "custom", message: issue });
});

const baseShape = {
  schemaVersion: z.literal(1),
  conversationId: boundedId,
  id: boundedId,
  sourceMessageId: boundedId,
  sourceTurn: nonNegativeInteger,
  sequence: nonNegativeInteger,
  createdAt: z.string().regex(ISO_TIMESTAMP).refine(isCanonicalIsoTimestamp),
} as const;

const moneySchema = z.strictObject({ amount: z.number().finite().positive(), currency: z.literal("TRY") });
const optionalSupersession = { supersedesEventId: boundedId.optional() } as const;

const constraintSchema = z.strictObject({
  ...baseShape,
  eventType: z.literal("CONSTRAINT"),
  kind: z.enum(["HARD_CONSTRAINT", "CONFIRMED_FUNCTIONAL_PREFERENCE", "GUIDED_APPROXIMATION", "SOFT_PREFERENCE", "PERSONA_PREFERENCE", "ILLUSTRATIVE_SIGNAL", "UNKNOWN", "DECLINED"]),
  field: boundedId,
  normalizedValue: jsonSafeSchema,
  sourceText: boundedText,
  confidence: z.number().min(0).max(1),
  authority: z.enum(["USER_EXPLICIT", "USER_CONFIRMED", "OWNER_EDITORIAL", "VERSIONED_PRODUCT_POLICY"]),
  decisionEffect: z.enum(["HARD_FILTER", "STRONG_RANK", "SOFT_RANK", "EXPLANATION_ONLY", "NONE"]),
  status: z.enum(["ACTIVE", "DECLINED", "SUPERSEDED"]),
  supersedesId: boundedId.optional(),
  supersededById: boundedId.optional(),
  hardFilterPolicy: z.strictObject({
    allowed: z.literal(true), policyId: boundedId, policyVersion: boundedValue,
    fieldAuthority: z.enum(["CATALOG_VERIFIED", "OWNER_EDITORIAL_DECISION_SAFE"]),
  }).optional(),
}).superRefine((event, context) => {
  if (event.normalizedValue === undefined) context.addIssue({ code: "custom", path: ["normalizedValue"], message: "normalizedValue cannot be undefined." });
});

const budgetCommon = { ...baseShape, eventType: z.literal("BUDGET_MUTATION") } as const;
const budgetSchema = z.union([
  z.strictObject({ ...budgetCommon, operation: z.enum(["SET", "CORRECT"]), field: z.enum(["AVAILABLE_CASH", "PREFERRED_BUDGET", "MAXIMUM_HARD_CEILING"]), value: moneySchema, ...optionalSupersession }),
  z.strictObject({ ...budgetCommon, operation: z.enum(["SET", "CORRECT"]), field: z.literal("FINANCE_FLEXIBILITY"), value: z.enum(["NONE", "POSSIBLE", "YES", "UNKNOWN"]), ...optionalSupersession }),
  z.strictObject({ ...budgetCommon, operation: z.enum(["SET", "CORRECT"]), field: z.literal("BUDGET_IMPORTANCE"), value: z.enum(["HARD", "IMPORTANT", "SOFT", "NONE", "UNKNOWN"]), ...optionalSupersession }),
  z.strictObject({ ...budgetCommon, operation: z.enum(["SET", "CORRECT"]), field: z.enum(["UNRESOLVED_FINANCED_CEILING", "BUDGET_UNKNOWN"]), value: z.boolean(), ...optionalSupersession }),
  z.strictObject({ ...budgetCommon, operation: z.literal("CLEAR"), field: z.enum(["AVAILABLE_CASH", "PREFERRED_BUDGET", "MAXIMUM_HARD_CEILING", "FINANCE_FLEXIBILITY", "UNRESOLVED_FINANCED_CEILING", "BUDGET_IMPORTANCE", "BUDGET_UNKNOWN"]), ...optionalSupersession }),
  z.strictObject({ ...budgetCommon, operation: z.literal("EXCLUDE_FROM_DECISION") }),
]);

const rejectionSchema = z.strictObject({
  ...baseShape, eventType: z.literal("CANDIDATE_REJECTION"), candidateId: boundedId.optional(), familyId: boundedId.optional(), brandId: boundedId.optional(),
  scope: z.enum(["EXACT_VARIANT", "MODEL_FAMILY", "BRAND"]),
  reason: z.enum(["WRONG_BODY_STYLE", "WRONG_POWERTRAIN", "WRONG_USAGE_CLASS", "INSUFFICIENT_CARGO", "INSUFFICIENT_SEATING", "OVER_BUDGET", "STYLE_MISMATCH", "SIZE_MISMATCH", "BRAND_DISLIKE", "MODEL_DISLIKE", "OTHER_EXPLICIT", "UNSPECIFIED"]),
  scopeExplicitlyRequested: z.boolean(),
});

const personaSchema = z.union([
  z.strictObject({ ...baseShape, eventType: z.literal("PERSONA_ACTIVATED"), activationSource: z.enum(["USER_EXPLICIT", "ADVISOR_PROMPT_RESPONSE"]), requestedTraits: z.array(z.enum(VEHICLE_PERSONA_TRAITS)).min(1).max(VEHICLE_PERSONA_TRAITS.length) }),
  z.strictObject({ ...baseShape, eventType: z.literal("PERSONA_DEACTIVATED"), reason: z.enum(["USER_DECLINED", "USER_CLEARED", "SUPERSEDED"]), ...optionalSupersession }),
]);

const questionSchema = z.union([
  z.strictObject({ ...baseShape, eventType: z.literal("MATERIAL_QUESTION_ASKED"), questionId: boundedId, stableSemanticKey: boundedId, field: boundedId }),
  z.strictObject({ ...baseShape, eventType: z.literal("MATERIAL_QUESTION_DISPOSITION"), questionId: boundedId, stableSemanticKey: boundedId, status: z.enum(["ANSWERED", "DECLINED", "DEFERRED", "SUPERSEDED"]), ...optionalSupersession }),
]);

const modelReferenceSchema = z.strictObject({
  ...baseShape, eventType: z.literal("MODEL_REFERENCE"), referenceId: boundedId, rawText: boundedText,
  normalizedBrand: boundedValue.optional(), normalizedModel: boundedValue.optional(),
  resolution: z.enum(["UNRESOLVED", "EXACT_MODEL_FAMILY", "EXACT_VARIANT", "BRAND_ONLY", "NOT_FOUND", "AMBIGUOUS"]),
  decisionEffect: z.enum(["LOOKUP_ONLY", "COMPARISON_SCOPE", "PREFERENCE", "HARD_SCOPE"]),
  resolvedFamilyIds: z.array(boundedId).max(32), resolvedVariantIds: z.array(boundedId).max(64),
});

const directAnswerSchema = z.strictObject({
  ...baseShape, eventType: z.literal("DIRECT_ANSWER_FULFILLED"),
  obligation: z.enum(["MODEL_AVAILABILITY", "MODEL_SUITABILITY", "MODEL_COMPARISON", "ALTERNATIVE_REQUEST", "RECOMMENDATION_REQUEST", "TECHNICAL_EXPLANATION", "BUDGET_IMPACT", "OTHER_SUPPORTED"]),
});

const candidateRefSchema = z.strictObject({ exactVariantId: boundedId, modelFamilyId: boundedId, authorizationId: boundedId, eligibility: z.enum(["FULLY_ELIGIBLE", "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED", "INELIGIBLE"]) });
const offerSchema = z.strictObject({
  offerId: boundedId, mode: z.enum(["FAMILY_DIVERSE", "TRIM_COMPARISON", "PRICE_UNVERIFIED_ALTERNATIVES"]), candidates: z.array(candidateRefSchema).min(1).max(3),
  explicitTrimComparisonRequested: z.boolean(), explicitPriceUnverifiedConsent: z.boolean(), catalogFingerprint: boundedId, decisionFingerprint: boundedId,
  expiresAt: z.string().regex(ISO_TIMESTAMP).refine(isCanonicalIsoTimestamp), lifecycleState: z.literal("CREATED"),
});
const offerLifecycleSchema = z.union([
  z.strictObject({ ...baseShape, eventType: z.literal("OFFER_LIFECYCLE"), offerId: boundedId, lifecycleState: z.literal("CREATED"), offer: offerSchema }),
  z.strictObject({ ...baseShape, eventType: z.literal("OFFER_LIFECYCLE"), offerId: boundedId, lifecycleState: z.enum(["CONSENTED", "REVEALED", "EXPIRED", "REVOKED"]) }),
]);
const recommendationOfferAuditSchema = z.union([
  z.strictObject({ ...baseShape, eventType: z.literal("RECOMMENDATION_TERMS_ACCEPTED"), offerId: boundedId, recommendationTermsVersion: z.literal("REC-2026.08-v1.1"), acceptedAt: z.string().regex(ISO_TIMESTAMP).refine(isCanonicalIsoTimestamp), auditSequence: z.literal(1), actor: z.literal("USER"), authority: z.literal("SERVER_RECORDED_USER_ACCEPTANCE"), decisionEffect: z.literal("AUTHORIZATION_ONLY"), predecessorLifecycleState: z.literal("CREATED"), idempotencyKey: boundedText, payloadFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/u) }),
  z.strictObject({ ...baseShape, eventType: z.literal("OFFER_REVEALED"), offerId: boundedId, revealedAt: z.string().regex(ISO_TIMESTAMP).refine(isCanonicalIsoTimestamp), auditSequence: z.literal(2), acceptanceEventId: boundedId, acceptanceAuditSequence: z.literal(1), recommendationTermsVersion: z.literal("REC-2026.08-v1.1"), actor: z.literal("SYSTEM"), authority: z.literal("SERVER_OFFER_LIFECYCLE"), decisionEffect: z.literal("AUTHORIZATION_ONLY"), resultingLifecycleState: z.literal("REVEALED"), catalogReleaseVersion: boundedValue, catalogFingerprint: boundedId, offerIdentityFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/u), idempotencyKey: boundedText }),
]);

const socialSchema = z.strictObject({ ...baseShape, eventType: z.literal("SOCIAL_INTERACTION"), interaction: z.enum(["SHORT_SOCIAL", "VEHICLE_CONTEXT_RESUMED"]), humanContext: z.enum(HUMAN_CONTEXT_KINDS).optional() });
const offTopicSchema = z.strictObject({ ...baseShape, eventType: z.literal("OFF_TOPIC"), transition: z.enum(["DETECTED", "RETURNED_TO_VEHICLE", "BOUNDARY_STATED"]) });
const abuseSchema = z.strictObject({ ...baseShape, eventType: z.literal("ABUSE"), transition: z.enum(["BOUNDARY_SET", "WARNED", "ENDED", "EXPLICIT_RESET"]) });
const vehicleIntentSchema = z.strictObject({ ...baseShape, eventType: z.literal("VEHICLE_INTENT_ESTABLISHED") });
const stateSchema = z.strictObject({
  ...baseShape, eventType: z.literal("CONVERSATION_STATE_TRANSITION"),
  from: z.enum(["SOCIAL", "VEHICLE_INTENT_ESTABLISHED", "DIRECT_MODEL_LOOKUP", "UNDERSTANDING_NEEDS", "FILTERING", "TECHNICAL_GUIDANCE", "CONFLICT", "TRADEOFF", "READY", "OFFERING", "AWAITING_CONSENT", "REVEALED", "CANDIDATE_REJECTED", "OFF_TOPIC_RECOVERY", "ABUSE_WARNING", "LIMITED_OR_ENDED"]),
  to: z.enum(["SOCIAL", "VEHICLE_INTENT_ESTABLISHED", "DIRECT_MODEL_LOOKUP", "UNDERSTANDING_NEEDS", "FILTERING", "TECHNICAL_GUIDANCE", "CONFLICT", "TRADEOFF", "READY", "OFFERING", "AWAITING_CONSENT", "REVEALED", "CANDIDATE_REJECTED", "OFF_TOPIC_RECOVERY", "ABUSE_WARNING", "LIMITED_OR_ENDED"]),
});

export const conversationEventSchema = z.union([
  constraintSchema, budgetSchema, rejectionSchema, personaSchema, questionSchema, modelReferenceSchema,
  directAnswerSchema, offerLifecycleSchema, recommendationOfferAuditSchema, socialSchema, offTopicSchema, abuseSchema, vehicleIntentSchema, stateSchema,
]);

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value as object)) return value;
  seen.add(value as object);
  for (const child of Object.values(value as object)) deepFreeze(child, seen);
  return Object.freeze(value);
}

export function parseConversationEvent(input: unknown): ConversationEvent {
  if (input && typeof input === "object" && (input as { eventType?: unknown }).eventType === "CONSTRAINT"
    && (!Object.prototype.hasOwnProperty.call(input, "normalizedValue") || (input as { normalizedValue?: unknown }).normalizedValue === undefined)) {
    throw new TypeError("normalizedValue cannot be undefined.");
  }
  return deepFreeze(conversationEventSchema.parse(input) as ConversationEvent);
}

export function parseConversationEvents(input: unknown): readonly ConversationEvent[] {
  const values = z.array(z.unknown()).max(2_000).parse(input);
  return deepFreeze(values.map(parseConversationEvent));
}
