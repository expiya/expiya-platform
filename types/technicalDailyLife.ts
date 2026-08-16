export type InterpretationClass = "DECISION_SAFE" | "GUIDED_APPROXIMATION" | "ILLUSTRATIVE_ONLY";
export type RankingEffect = "DIRECT_FILTER" | "SOFT_UNTIL_CONFIRMED" | "NONE";
export type DecisionUse =
  | "INTERPRET_USER_NEED" | "ASK_USER_FRIENDLY_QUESTION" | "EXPLAIN_TECHNICAL_VALUE"
  | "MAP_TO_TECHNICAL_RANGE" | "SOFT_PREFERENCE_ONLY" | "HARD_FILTER_AFTER_CONFIRMATION"
  | "HARD_FILTER_DIRECT" | "NOT_FOR_FILTERING" | "NOT_READY";
export type TechnicalConditionOperator =
  | "RANGE" | "IN" | "EXISTS" | "USER_PROVIDED_BOUND" | "USER_PROVIDED_EXACT_VALUE"
  | "MISSING_SCHEMA" | "INSUFFICIENT_COVERAGE";
export type UsageContext =
  | "AIRPORT" | "BABY_CHILD" | "CAMPING" | "CHARGING_HOME" | "CHARGING_PUBLIC"
  | "CITY_DAILY" | "COMMERCIAL_CARGO" | "FAMILY" | "FIRST_CAR" | "HIGHWAY"
  | "OPERATING_COST" | "PARKING" | "PERFORMANCE" | "PET" | "ROUGH_ROAD"
  | "SHOPPING" | "SPORT_HOBBY" | "TOWING" | "TRAVEL"
  | "USER_EXPLICIT_TECHNICAL_REQUIREMENT" | "WORK_EQUIPMENT";
export type MappingConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface TechnicalCondition {
  readonly operator: TechnicalConditionOperator;
  readonly min?: number;
  readonly max?: number;
  readonly unit?: string | null;
  readonly minInclusive?: boolean;
  readonly maxInclusive?: boolean;
  readonly values?: readonly string[];
  readonly allowedValues?: readonly string[];
}

export interface DependentFieldCondition {
  readonly technicalField: string;
  readonly condition: TechnicalCondition;
}

export interface DailyLifeExample {
  readonly text: string;
  readonly tone: "FRIENDLY" | "NEUTRAL";
  readonly specificity: "APPROXIMATE";
  readonly preferredContexts: readonly UsageContext[];
}

export interface AdvisorQuestion {
  readonly text: string;
  readonly tone: "CONCISE" | "EXPLANATORY" | "FRIENDLY";
}

export interface UserFacingExplanation {
  readonly text: string;
  readonly level: "SHORT" | "GUIDED";
}

export interface TechnicalDailyLifeMapping {
  readonly mappingId: string;
  readonly technicalCondition: TechnicalCondition;
  readonly valueMin: number | null;
  readonly valueMax: number | null;
  readonly minInclusive: boolean | null;
  readonly maxInclusive: boolean | null;
  readonly categoricalValues: readonly string[];
  readonly applicableFuelTypes: readonly string[];
  readonly applicableBodyStyles: readonly string[];
  readonly applicableVehicleUseClasses: readonly string[];
  readonly excludedConditions: readonly string[];
  readonly dependentFields: readonly DependentFieldCondition[];
  readonly usageContext: readonly UsageContext[];
  readonly userIntentSignals: readonly string[];
  readonly dailyLifeExamples: readonly DailyLifeExample[];
  readonly advisorQuestions: readonly AdvisorQuestion[];
  readonly userFacingExplanations: readonly UserFacingExplanation[];
  readonly caveats: readonly string[];
  readonly confidence: MappingConfidence;
  readonly sourceAuthority: string;
  readonly decisionUse: readonly DecisionUse[];
  readonly interpretationClass: InterpretationClass;
  readonly hardFilterEligible: boolean;
  readonly confirmationRequiredForHardFilter: boolean;
  readonly approximationConfidence: number;
  readonly confidenceRationale: string;
  readonly assumptions: readonly string[];
  readonly variationFactors: readonly string[];
  readonly userFacingQualifier: string;
  readonly rankingEffect: RankingEffect;
}

export interface TechnicalDailyLifeField {
  readonly technicalField: string;
  readonly catalogPath: string | null;
  readonly schemaState: "DECLARED" | "SCHEMA_MISSING";
  readonly dataType: "number" | "integer" | "categorical" | "categorical[]" | "structured";
  readonly unit: string | null;
  readonly description: string;
  readonly populatedVariantCount: number;
  readonly missingVariantCount: number;
  readonly coverageRatio: number;
  readonly observedMin: number | null;
  readonly observedMax: number | null;
  readonly observedValues: unknown;
  readonly distribution: unknown;
  readonly confidenceDistribution: readonly unknown[];
  readonly currentDecisionUse: string;
  readonly dailyLifeMappingSuitability: "LIMITED" | "NOT_READY" | "SUITABLE" | "SUITABLE_WITH_CONTEXT";
  readonly proposedBands: unknown;
  readonly dataQualityNotes: readonly string[];
  readonly dailyLifeLayerStatus: string;
  readonly dailyLifeLayerReviewNote: string;
  readonly usageMappings: readonly TechnicalDailyLifeMapping[];
}

export interface TechnicalDailyLifeLayer {
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly schema: {
    readonly version: 1;
    readonly interpretationClasses: readonly InterpretationClass[];
    readonly decisionUses: readonly DecisionUse[];
    readonly technicalConditionOperators: readonly TechnicalConditionOperator[];
  };
  readonly schemaNotes: Readonly<Record<string, string>>;
  readonly fields: readonly TechnicalDailyLifeField[];
}

export interface TechnicalDailyLifeManifest {
  readonly releaseId: string;
  readonly schemaVersion: 1;
  readonly compatibleCatalogRelease: string;
  readonly producedAt: string;
  readonly source: { readonly identity: string; readonly repositoryPath: string; readonly sourceHead: string };
  readonly counts: {
    readonly technicalFields: number;
    readonly mappings: number;
    readonly dailyLifeExamples: number;
    readonly advisorQuestions: number;
    readonly interpretationClasses: Readonly<Record<InterpretationClass, number>>;
    readonly rankingEffects: Readonly<Record<RankingEffect, number>>;
  };
  readonly contentChecksum: `sha256:${string}`;
  readonly sourceAuthority: "OWNER_EDITORIAL";
  readonly validationStatus: "VALIDATED";
}
