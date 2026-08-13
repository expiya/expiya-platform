import {
  getRecommendedCars,
  getRecommendedCarsFromRepository,
} from "@/features/recommendation/getRecommendedCars";
import { configuredCarsCatalogMode } from "@/features/vehicle-data/resolveRecommendationCatalog";
import { createConfiguredVehicleCatalogReadRepository } from "@/features/vehicle-data/catalogReadRepository";
import type { DecisionContext } from "@/types/decisionContext";
import type { RecommendedCar } from "@/types/recommendation";

export interface ExecuteAuthorizedCarsRecommendationInput {
  readonly context: DecisionContext;
  readonly optionIds?: readonly string[];
}

export class ProductionCatalogUnavailableError extends Error {
  constructor(readonly limitations: readonly string[], cause?: unknown) {
    super("PRODUCTION_CATALOG_UNAVAILABLE", { cause });
  }
}

export async function executeAuthorizedCarsRecommendation(
  input: ExecuteAuthorizedCarsRecommendationInput,
): Promise<readonly RecommendedCar[]> {
  if (configuredCarsCatalogMode() === "fixture") {
    return getRecommendedCars(input.context, input.optionIds);
  }
  try {
    const result = await getRecommendedCarsFromRepository(
      input.context,
      createConfiguredVehicleCatalogReadRepository(),
      input.optionIds,
    );
    if (result.catalog.cars.length === 0) {
      throw new ProductionCatalogUnavailableError(result.catalog.limitations);
    }
    if (input.optionIds?.length && result.recommendations.length === 0) {
      throw new ProductionCatalogUnavailableError(["requested-options-unavailable"]);
    }
    return result.recommendations;
  } catch (error) {
    if (error instanceof ProductionCatalogUnavailableError) throw error;
    throw new ProductionCatalogUnavailableError(["database-read-failed"], error);
  }
}
