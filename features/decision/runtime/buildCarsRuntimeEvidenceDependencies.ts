import { acquireBoundedCarsCatalog } from "@/features/decision/context/acquisition/acquireBoundedCarsCatalog";
import type { CarsTypeBCanonicalCandidateProduction } from "@/features/decision/context/extraction/createCarsTypeBCanonicalCandidate";
import { assessCarsDomainSufficiency } from "@/features/decision/context/sufficiency/assessCarsDomainSufficiency";
import { validateCarsDomainEvidenceLinkageInput } from "@/features/decision/context/sufficiency/validateCarsDomainEvidenceLinkageInput";
import type { Car } from "@/types/car";
import type {
  CarsDomainEvidenceAssertion,
  CarsDomainEvidenceLinkageValidationResult,
  CarsOptionMatchResult,
} from "@/types/carsDomainEvidence";
import type { CarsDomainFactCategory, CarsDomainFactRequirementResolutionResult } from "@/types/carsDomainFactRequirement";
import type {
  CarsDecisionType,
  CarsDomainSufficiencyAssessment,
  CarsSufficiencyPolicy,
} from "@/types/contextSufficiency";

export type CarsRuntimeEvidenceDependencies =
  | { readonly evidence: { readonly status: "UNAVAILABLE" } }
  | {
      readonly evidence: {
        readonly status: "AVAILABLE";
        readonly linkage: CarsDomainEvidenceLinkageValidationResult;
      };
      readonly domainAssessment?: CarsDomainSufficiencyAssessment;
    };

export interface BuildCarsRuntimeEvidenceDependenciesInput {
  readonly decisionType: CarsDecisionType;
  readonly policy: CarsSufficiencyPolicy;
  readonly requirementResolution: CarsDomainFactRequirementResolutionResult;
  readonly typeBProduction?: CarsTypeBCanonicalCandidateProduction;
}

function assertionValue(car: Readonly<Car>, category: CarsDomainFactCategory): unknown {
  switch (category) {
    case "Car.id": return car.id;
    case "brand": return car.brand;
    case "model": return car.model;
    case "year": return car.year;
    case "fuel": return car.fuel;
    case "transmission": return car.transmission;
    case "bodyType": return car.bodyType;
  }
}

export function buildCarsRuntimeEvidenceDependencies(
  input: BuildCarsRuntimeEvidenceDependenciesInput,
): CarsRuntimeEvidenceDependencies {
  const acquisition = acquireBoundedCarsCatalog();

  if (!acquisition.ok || input.requirementResolution.status !== "RESOLVED") {
    return { evidence: { status: "UNAVAILABLE" } };
  }

  const optionIds = input.typeBProduction
    ? input.typeBProduction.selectionTrace.map((item) => item.optionId)
    : [...acquisition.value.trace.acquiredOptionIds];
  const carsById = new Map(
    acquisition.value.catalog.map((car) => [car.id, car] as const),
  );

  if (optionIds.some((optionId) => !carsById.has(optionId))) {
    return { evidence: { status: "UNAVAILABLE" } };
  }

  const assertions: CarsDomainEvidenceAssertion[] = [];
  const requirementLinks: { evidenceId: string; requirementId: string }[] = [];

  for (const requirement of input.requirementResolution.requirements) {
    for (const optionId of requirement.identity.optionIds) {
      const car = carsById.get(optionId);
      if (!car) return { evidence: { status: "UNAVAILABLE" } };
      const evidenceId = `${requirement.id}:${optionId}`;
      assertions.push({
        evidenceId,
        optionId,
        category: requirement.identity.category,
        availability: "AVAILABLE",
        assertion: assertionValue(car, requirement.identity.category),
        source: {
          sourceId: acquisition.value.trace.sourceId,
          reference: `${acquisition.value.trace.catalogRevision}#${optionId}`,
        },
        provenance: "AUTHORITATIVE_SOURCE",
        limitations: [...acquisition.value.trace.limitations],
        conflictReferences: [],
      });
      requirementLinks.push({
        evidenceId,
        requirementId: requirement.id,
      });
    }
  }

  const optionMatches: CarsOptionMatchResult[] = input.typeBProduction
    ? input.typeBProduction.selectionTrace.map((item) => ({
        inputIndex: item.inputIndex,
        status: "MATCHED",
        optionId: item.optionId,
        candidateOptionIds: [item.optionId],
      }))
    : [];
  const linkage = validateCarsDomainEvidenceLinkageInput({
    decisionType: input.decisionType,
    input: {
      optionIds,
      requirementResolution: input.requirementResolution,
      assertions,
      requirementLinks,
      conflicts: [],
      optionMatches,
    },
  });

  if (!linkage.ok) {
    return {
      evidence: { status: "AVAILABLE", linkage },
    };
  }

  return {
    evidence: { status: "AVAILABLE", linkage },
    domainAssessment: assessCarsDomainSufficiency({
      decisionType: input.decisionType,
      policy: input.policy,
      evidenceInput: linkage.value,
    }),
  };
}
