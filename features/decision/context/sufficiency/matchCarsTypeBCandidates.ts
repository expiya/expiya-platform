import type { CarsOptionMatchResult } from "@/types/carsDomainEvidence";

import type { ValidatedCarsCatalog } from "./validateCarsCatalogIdentity";
import type { ValidatedCarsTypeBCandidate } from "./validateCarsTypeBCandidateInput";

export function matchCarsTypeBCandidates(
  candidates: readonly ValidatedCarsTypeBCandidate[],
  catalog: ValidatedCarsCatalog,
): CarsOptionMatchResult[] {
  const catalogOptionIds = new Set(
    catalog.cars.map((car) => car.id),
  );

  return candidates.map(({ inputIndex, optionId }) => {
    if (catalogOptionIds.has(optionId)) {
      return {
        inputIndex,
        status: "MATCHED",
        optionId,
        candidateOptionIds: [optionId],
      };
    }

    return {
      inputIndex,
      status: "NOT_FOUND",
      candidateOptionIds: [],
    };
  });
}
