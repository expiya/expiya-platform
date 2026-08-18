import type { EquipmentCandidateEffect, EquipmentFeatureDefinition, EquipmentRequirementActivation, ExactVariantEquipmentProjection } from "@/types/equipmentEvidence";

export function evaluateEquipmentCandidateEffect(input: { activation: EquipmentRequirementActivation; feature: EquipmentFeatureDefinition; projection?: ExactVariantEquipmentProjection; technicallyEligible: boolean }): EquipmentCandidateEffect {
  if (!input.technicallyEligible || input.activation === "NOT_REQUESTED") return "NO_EFFECT";
  const satisfied = input.projection?.availabilityStatus === "STANDARD" && input.projection.provisionMode === "INCLUDED"
    && input.projection.conflictState === "CLEAR" && input.projection.projectionAuthority !== "INSUFFICIENT";
  if (input.activation === "SOFT_PREFERENCE") return satisfied ? "SOFT_SIGNAL" : "NO_EFFECT";
  const hardAllowed = input.feature.defaultDecisionUse === "HARD_FILTER_ELIGIBLE" || input.feature.defaultDecisionUse === "HARD_FILTER_AFTER_CONFIRMATION";
  return hardAllowed && satisfied ? "HARD_PASS" : "HARD_FAIL";
}
