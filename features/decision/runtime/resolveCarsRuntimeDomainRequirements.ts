import {
  acquireBoundedCarsCatalog,
  CARS_CATALOG_SOURCE_ID,
} from "@/features/decision/context/acquisition/acquireBoundedCarsCatalog";
import type { CarsTypeBCanonicalCandidateProduction } from "@/features/decision/context/extraction/createCarsTypeBCanonicalCandidate";
import { resolveCarsDomainFactRequirements } from "@/features/decision/context/sufficiency/resolveCarsDomainFactRequirements";
import type { PopulationResult } from "@/types/contextPopulation";
import type { CarsDomainFactRequirementResolutionResult } from "@/types/carsDomainFactRequirement";
import type {
  CarsSufficiencyPolicy,
  MaterialityAssessment,
} from "@/types/contextSufficiency";

export interface ResolveCarsRuntimeDomainRequirementsInput {
  readonly policy: CarsSufficiencyPolicy;
  readonly materialityAssessments: readonly MaterialityAssessment[];
  readonly populationResult: PopulationResult;
  readonly typeBProduction?: CarsTypeBCanonicalCandidateProduction;
}

export function resolveCarsRuntimeDomainRequirements(
  input: ResolveCarsRuntimeDomainRequirementsInput,
): CarsDomainFactRequirementResolutionResult | undefined {
  const acquisition = acquireBoundedCarsCatalog();

  if (!acquisition.ok) {
    return undefined;
  }

  const resolvedOptionIds = input.typeBProduction
    ? input.typeBProduction.selectionTrace.map((item) => item.optionId)
    : [...acquisition.value.trace.acquiredOptionIds];
  const candidateIdentityCoverage = input.typeBProduction &&
    resolvedOptionIds.length > 0
    ? {
        parentPolicyRequirementId: "candidate-options" as const,
        canonicalProducerReferenceId:
          "features/decision/context/extraction/createCarsTypeBCanonicalCandidate",
        catalogAcquisitionReferenceId: CARS_CATALOG_SOURCE_ID,
        exactMatcherReferenceId:
          "features/decision/context/identity/resolveExplicitCarsTypeBIdentity",
        candidateIds: [input.typeBProduction.candidate.id] as [string, ...string[]],
        optionIds: resolvedOptionIds as [string, ...string[]],
      }
    : undefined;

  return resolveCarsDomainFactRequirements({
    policy: input.policy,
    materialityAssessments: input.materialityAssessments,
    appliedCandidates: input.populationResult.appliedCandidates,
    resolvedOptionIds,
    candidateIdentityCoverage,
    bindings: [],
  });
}
