import { z } from "zod";

import type { TechnicalDailyLifeLayer } from "@/types/technicalDailyLife";

export const interpretationClassSchema = z.enum(["DECISION_SAFE", "GUIDED_APPROXIMATION", "ILLUSTRATIVE_ONLY"]);
export const rankingEffectSchema = z.enum(["DIRECT_FILTER", "SOFT_UNTIL_CONFIRMED", "NONE"]);
export const decisionUseSchema = z.enum([
  "INTERPRET_USER_NEED", "ASK_USER_FRIENDLY_QUESTION", "EXPLAIN_TECHNICAL_VALUE", "MAP_TO_TECHNICAL_RANGE",
  "SOFT_PREFERENCE_ONLY", "HARD_FILTER_AFTER_CONFIRMATION", "HARD_FILTER_DIRECT", "NOT_FOR_FILTERING", "NOT_READY",
]);
export const technicalConditionOperatorSchema = z.enum([
  "RANGE", "IN", "EXISTS", "USER_PROVIDED_BOUND", "USER_PROVIDED_EXACT_VALUE", "MISSING_SCHEMA", "INSUFFICIENT_COVERAGE",
]);
export const usageContextSchema = z.enum([
  "AIRPORT", "BABY_CHILD", "CAMPING", "CHARGING_HOME", "CHARGING_PUBLIC", "CITY_DAILY", "COMMERCIAL_CARGO",
  "FAMILY", "FIRST_CAR", "HIGHWAY", "OPERATING_COST", "PARKING", "PERFORMANCE", "PET", "ROUGH_ROAD",
  "SHOPPING", "SPORT_HOBBY", "TOWING", "TRAVEL", "USER_EXPLICIT_TECHNICAL_REQUIREMENT", "WORK_EQUIPMENT",
]);

const technicalConditionSchema = z.object({
  operator: technicalConditionOperatorSchema,
  min: z.number().optional(), max: z.number().optional(), unit: z.string().nullable().optional(),
  minInclusive: z.boolean().optional(), maxInclusive: z.boolean().optional(),
  values: z.array(z.string()).optional(), allowedValues: z.array(z.string()).optional(),
});
const dailyLifeExampleSchema = z.object({
  text: z.string().min(1), tone: z.enum(["FRIENDLY", "NEUTRAL"]), specificity: z.literal("APPROXIMATE"),
  preferredContexts: z.array(usageContextSchema),
});
const advisorQuestionSchema = z.object({ text: z.string().min(1), tone: z.enum(["CONCISE", "EXPLANATORY", "FRIENDLY"]) });
const explanationSchema = z.object({ text: z.string().min(1), level: z.enum(["SHORT", "GUIDED"]) });
const dependentFieldSchema = z.object({ technicalField: z.string().min(1), condition: technicalConditionSchema });
const mappingSchema = z.object({
  mappingId: z.string().min(1), technicalCondition: technicalConditionSchema,
  valueMin: z.number().nullable(), valueMax: z.number().nullable(), minInclusive: z.boolean().nullable(), maxInclusive: z.boolean().nullable(),
  categoricalValues: z.array(z.string()), applicableFuelTypes: z.array(z.string()), applicableBodyStyles: z.array(z.string()),
  applicableVehicleUseClasses: z.array(z.string()), excludedConditions: z.array(z.string()), dependentFields: z.array(dependentFieldSchema),
  usageContext: z.array(usageContextSchema), userIntentSignals: z.array(z.string()), dailyLifeExamples: z.array(dailyLifeExampleSchema),
  advisorQuestions: z.array(advisorQuestionSchema), userFacingExplanations: z.array(explanationSchema), caveats: z.array(z.string()),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]), sourceAuthority: z.string().min(1), decisionUse: z.array(decisionUseSchema),
  interpretationClass: interpretationClassSchema, hardFilterEligible: z.boolean(), confirmationRequiredForHardFilter: z.boolean(),
  approximationConfidence: z.number().min(0).max(1), confidenceRationale: z.string(), assumptions: z.array(z.string()),
  variationFactors: z.array(z.string()), userFacingQualifier: z.string(), rankingEffect: rankingEffectSchema,
});
const fieldSchema = z.object({
  technicalField: z.string().min(1), catalogPath: z.string().nullable(), schemaState: z.enum(["DECLARED", "SCHEMA_MISSING"]),
  dataType: z.enum(["number", "integer", "categorical", "categorical[]", "structured"]), unit: z.string().nullable(),
  description: z.string(), populatedVariantCount: z.number().int().nonnegative(), missingVariantCount: z.number().int().nonnegative(),
  coverageRatio: z.number().min(0).max(1), observedMin: z.number().nullable(), observedMax: z.number().nullable(),
  observedValues: z.unknown(), distribution: z.unknown(), confidenceDistribution: z.array(z.unknown()), currentDecisionUse: z.string(),
  dailyLifeMappingSuitability: z.enum(["LIMITED", "NOT_READY", "SUITABLE", "SUITABLE_WITH_CONTEXT"]),
  proposedBands: z.unknown(), dataQualityNotes: z.array(z.string()), dailyLifeLayerStatus: z.string(), dailyLifeLayerReviewNote: z.string(),
  usageMappings: z.array(mappingSchema),
});
const layerSchema = z.object({
  metadata: z.record(z.string(), z.unknown()),
  schema: z.object({ version: z.literal(1), interpretationClasses: z.array(interpretationClassSchema),
    decisionUses: z.array(decisionUseSchema), technicalConditionOperators: z.array(technicalConditionOperatorSchema) }),
  schemaNotes: z.record(z.string(), z.string()), fields: z.array(fieldSchema),
});

export function parseTechnicalDailyLifeLayer(input: unknown): TechnicalDailyLifeLayer {
  return layerSchema.parse(input) as TechnicalDailyLifeLayer;
}
