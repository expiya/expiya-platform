import { z } from "zod";

export const knowledgeClassSchema = z.enum([
  "CURRENT_MARKET_FACT",
  "AUTOMOTIVE_CONCEPT",
  "AUTOMOTIVE_HISTORY",
  "FORECAST_OR_SCENARIO",
]);

export const conversationIntentSchema = z.enum([
  "EXPIYA_ORIENTATION",
  "CATALOG_OVERVIEW",
  "AUTOMOTIVE_EDUCATION",
  "MARKET_STATISTICS",
  "AUTOMOTIVE_HISTORY",
  "FORECAST_DISCUSSION",
  "ECONOMIC_INDICATORS",
  "TAX_AND_REGULATION",
  "INCENTIVES",
  "INSURANCE_AND_CLAIMS",
  "MAINTENANCE_AND_PARTS",
  "OWNERSHIP_VALUE",
  "IMPORT_AND_COMPLIANCE",
  "FINANCING_AND_CREDIT",
  "AUTONOMOUS_DRIVING",
  "EV_RANGE_AND_CHARGING",
  "EXPERT_PERSPECTIVES",
  "SAFE_AND_ADVANCED_DRIVING",
  "USED_VEHICLE_DUE_DILIGENCE",
  "VEHICLE_RECALLS",
  "EV_CHARGING_ECOSYSTEM",
  "TIRE_SAFETY",
  "CHILD_PASSENGER_SAFETY",
  "POST_CRASH_GUIDANCE",
  "SAFETY_RATINGS",
  "ENVIRONMENTAL_IMPACT",
  "ACCESSIBLE_MOBILITY",
  "INTERNATIONAL_DRIVING",
  "LISTING_AND_PAYMENT_SAFETY",
]);

export const sourceAuthoritySchema = z.enum(["PRIMARY_OFFICIAL", "PRIMARY_MANUFACTURER", "SECONDARY_METHODOLOGY"]);

export const knowledgeProvenanceSchema = z.object({
  sourceId: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceTitle: z.string().min(1),
  publisher: z.string().min(1),
  publishedAt: z.string().datetime(),
  period: z.string().min(1),
  market: z.string().min(1),
  retrievedAt: z.string().datetime(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
  locator: z.string().min(1),
  authority: sourceAuthoritySchema,
  methodology: z.string().min(1),
  limitations: z.array(z.string().min(1)),
});

const baseRecord = z.object({
  id: z.string().regex(/^AK-[A-Z0-9-]+$/u),
  knowledgeClass: knowledgeClassSchema,
  title: z.string().min(1),
  summaryTr: z.string().min(1),
  effectiveAsOf: z.string().datetime(),
  supersedes: z.array(z.string()),
  provenance: z.array(knowledgeProvenanceSchema).min(1),
  decisionUse: z.literal("PUBLIC_EXPLANATION_ONLY"),
});

export const knowledgeRecordSchema = z.discriminatedUnion("knowledgeClass", [
  baseRecord.extend({
    knowledgeClass: z.literal("CURRENT_MARKET_FACT"),
    statistic: z.object({ value: z.number(), unit: z.string(), period: z.string(), market: z.string(), population: z.string() }).optional(),
    economicIndicator: z.object({ value: z.number(), unit: z.string(), period: z.string(), geography: z.string(), series: z.string(), basis: z.string() }).optional(),
    regulation: z.object({
      jurisdiction: z.string(), instrument: z.string(), status: z.enum(["IN_FORCE", "HISTORICAL", "ANNOUNCED"]),
      validFrom: z.string().datetime(), validUntil: z.string().datetime().optional(), eligibility: z.array(z.string()),
      requiresCaseSpecificCalculation: z.boolean(),
    }).optional(),
  }),
  baseRecord.extend({ knowledgeClass: z.literal("AUTOMOTIVE_CONCEPT"), concepts: z.array(z.string()).min(1) }),
  baseRecord.extend({ knowledgeClass: z.literal("AUTOMOTIVE_HISTORY"), eventDate: z.string().min(4) }),
  baseRecord.extend({
    knowledgeClass: z.literal("FORECAST_OR_SCENARIO"),
    forecast: z.object({
      horizon: z.string(), method: z.string(), assumptions: z.array(z.string()).min(1), uncertainties: z.array(z.string()).min(1),
      perspectives: z.array(z.object({ organization: z.string(), position: z.string(), statedAt: z.string().datetime(), nature: z.literal("ATTRIBUTED_EXPERT_VIEW") })).optional(),
    }),
  }),
]);

export const knowledgeReleaseSchema = z.object({
  schemaVersion: z.literal(1),
  releaseId: z.string().min(1),
  generatedAt: z.string().datetime(),
  effectiveAsOf: z.string().datetime(),
  records: z.array(knowledgeRecordSchema),
  mappings: z.array(z.object({ intent: conversationIntentSchema, recordIds: z.array(z.string()).min(1) })),
  reviewLog: z.array(z.object({ at: z.string().datetime(), action: z.enum(["CREATED", "REVIEWED", "ACTIVATED"]), actor: z.string(), note: z.string() })),
});

export type KnowledgeRecord = z.infer<typeof knowledgeRecordSchema>;
export type KnowledgeRelease = z.infer<typeof knowledgeReleaseSchema>;
export type KnowledgeIntent = z.infer<typeof conversationIntentSchema>;
