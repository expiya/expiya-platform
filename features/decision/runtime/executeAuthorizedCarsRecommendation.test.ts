import { afterEach, describe, expect, it, vi } from "vitest";

const { getRecommendedCars, getRecommendedCarsFromRepository, createRepository } = vi.hoisted(() => ({
  getRecommendedCars: vi.fn(() => []),
  getRecommendedCarsFromRepository: vi.fn(),
  createRepository: vi.fn(() => ({ readPublishedCatalog: vi.fn() })),
}));

vi.mock("@/features/recommendation/getRecommendedCars", () => ({
  getRecommendedCars,
  getRecommendedCarsFromRepository,
}));
vi.mock("@/features/vehicle-data/catalogReadRepository", () => ({
  createConfiguredVehicleCatalogReadRepository: createRepository,
}));

import { executeAuthorizedCarsRecommendation } from "./executeAuthorizedCarsRecommendation";

describe("executeAuthorizedCarsRecommendation", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards the governed context and option boundary to fixture recommendation", async () => {
    const context = {
      decisionNeed: "compare",
      userContext: {
        needs: [], priorities: [], preferences: [], constraints: [], usageConditions: [],
      },
      evaluationContext: { decisionCriteria: [], decisionOptions: undefined },
      domainContext: { contextualElements: undefined, contextualRelationships: undefined },
    };

    await executeAuthorizedCarsRecommendation({ context, optionIds: ["1", "2"] });

    expect(getRecommendedCars).toHaveBeenCalledWith(context, ["1", "2"]);
  });

  it("uses the database catalog when production mode is explicit", async () => {
    vi.stubEnv("EXPIYA_CARS_CATALOG_MODE", "production");
    const recommendations = [{ car: { id: "database-car" } }];
    getRecommendedCarsFromRepository.mockResolvedValue({
      catalog: { mode: "production", cars: [{ id: "database-car" }], limitations: [] },
      recommendations,
    });
    const context = {
      decisionNeed: "compare", userContext: { needs: [], priorities: [], preferences: [], constraints: [], usageConditions: [] },
      evaluationContext: { decisionCriteria: [], decisionOptions: undefined },
      domainContext: { contextualElements: undefined, contextualRelationships: undefined },
    };
    await expect(executeAuthorizedCarsRecommendation({ context })).resolves.toBe(recommendations);
    expect(getRecommendedCars).not.toHaveBeenCalled();
    expect(createRepository).toHaveBeenCalledOnce();
  });

  it("abstains when the production database catalog is empty", async () => {
    vi.stubEnv("EXPIYA_CARS_CATALOG_MODE", "production");
    getRecommendedCarsFromRepository.mockResolvedValue({
      catalog: { mode: "production", cars: [], limitations: ["DATABASE_EMPTY"] }, recommendations: [],
    });
    const context = {
      decisionNeed: "compare", userContext: { needs: [], priorities: [], preferences: [], constraints: [], usageConditions: [] },
      evaluationContext: { decisionCriteria: [], decisionOptions: undefined },
      domainContext: { contextualElements: undefined, contextualRelationships: undefined },
    };
    await expect(executeAuthorizedCarsRecommendation({ context })).rejects.toMatchObject({
      message: "PRODUCTION_CATALOG_UNAVAILABLE", limitations: ["DATABASE_EMPTY"],
    });
  });

  it("abstains when governed comparison options do not exist in the database catalog", async () => {
    vi.stubEnv("EXPIYA_CARS_CATALOG_MODE", "production");
    getRecommendedCarsFromRepository.mockResolvedValue({
      catalog: { mode: "production", cars: [{ id: "different-database-id" }], limitations: [] },
      recommendations: [],
    });
    const context = {
      decisionNeed: "compare", userContext: { needs: [], priorities: [], preferences: [], constraints: [], usageConditions: [] },
      evaluationContext: { decisionCriteria: [], decisionOptions: undefined },
      domainContext: { contextualElements: undefined, contextualRelationships: undefined },
    };
    await expect(executeAuthorizedCarsRecommendation({ context, optionIds: ["fixture-id"] }))
      .rejects.toMatchObject({ limitations: ["requested-options-unavailable"] });
  });
});
