import type { EquipmentCohortPolicyId, EquipmentFeatureCode, EquipmentFeatureCoverage, EquipmentResearchLedgerEntry, ExactVariantEquipmentProjection } from "@/types/equipmentEvidence";

export const EQUIPMENT_COHORT_POLICY_VERSION = "1.0.0" as const;
export interface EquipmentCoverageVariant { readonly exactVariantId: string; readonly bodyStyle?: string; readonly vehicleUseClass?: string }

export function isVariantEligibleForEquipmentCohort(variant: EquipmentCoverageVariant, policy: EquipmentCohortPolicyId): boolean {
  const body = (variant.bodyStyle ?? "").toLocaleUpperCase("tr-TR").replaceAll(/[^A-Z0-9]+/gu, "_");
  const use = (variant.vehicleUseClass ?? "").toLocaleUpperCase("tr-TR");
  if (policy === "ALL_ACTIVE_VARIANTS_V1") return true;
  if (policy === "PASSENGER_CABIN_V1") return !use.includes("HEAVY_COMMERCIAL") && !body.includes("CHASSIS_CAB");
  if (policy === "TAILGATE_BODY_V1") return ["SUV", "HATCHBACK", "LIFTBACK", "MPV", "PASSENGER_VAN", "CROSSOVER", "STATION_WAGON"].some((item) => body.includes(item));
  return ["SUV", "PICKUP", "OFF_ROAD"].some((item) => body.includes(item));
}

export function calculateEquipmentFeatureCoverage(input: { featureCode: EquipmentFeatureCode; cohortPolicyId: EquipmentCohortPolicyId; variants: readonly EquipmentCoverageVariant[]; projections: readonly ExactVariantEquipmentProjection[]; researchLedger?: readonly EquipmentResearchLedgerEntry[] }): EquipmentFeatureCoverage {
  const eligible = input.variants.filter((item) => isVariantEligibleForEquipmentCohort(item, input.cohortPolicyId));
  const ids = new Set(eligible.map((item) => item.exactVariantId));
  const records = input.projections.filter((item) => item.featureCode === input.featureCode && ids.has(item.exactVariantId));
  const count = (status: ExactVariantEquipmentProjection["availabilityStatus"]) => records.filter((item) => item.availabilityStatus === status).length;
  const conflictingCount = records.filter((item) => item.conflictState === "CONFLICTING").length;
  const explicitStatusCount = records.filter((item) => item.availabilityStatus !== "UNKNOWN" && item.conflictState === "CLEAR").length;
  const dispositions = new Map((input.researchLedger ?? []).filter((item) => item.featureCode === input.featureCode && ids.has(item.exactVariantId)).map((item) => [item.exactVariantId, item.disposition]));
  const researchedInconclusiveCount = [...dispositions.values()].filter((item) => item === "RESEARCHED_INCONCLUSIVE").length;
  const researchedConclusiveCount = [...dispositions.values()].filter((item) => item === "RESEARCHED_CONCLUSIVE").length;
  const notResearchedCount = eligible.length - researchedInconclusiveCount - researchedConclusiveCount;
  return { featureCode: input.featureCode, cohortPolicyId: input.cohortPolicyId, eligibleVariantCount: eligible.length, notResearchedCount, researchedInconclusiveCount, researchedConclusiveCount, explicitStatusCount,
    standardCount: count("STANDARD"), optionalCount: count("OPTIONAL"), packageDependentCount: count("PACKAGE_DEPENDENT"), notAvailableCount: count("NOT_AVAILABLE"),
    unknownCount: eligible.length - explicitStatusCount, conflictingCount, featureCoverageRate: eligible.length === 0 ? 0 : explicitStatusCount / eligible.length };
}
