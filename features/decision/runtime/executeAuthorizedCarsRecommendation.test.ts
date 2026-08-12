import { describe, expect, it, vi } from "vitest";

const { getRecommendedCars } = vi.hoisted(() => ({
  getRecommendedCars: vi.fn(() => []),
}));

vi.mock("@/features/recommendation/getRecommendedCars", () => ({
  getRecommendedCars,
}));

import { executeAuthorizedCarsRecommendation } from "./executeAuthorizedCarsRecommendation";

describe("executeAuthorizedCarsRecommendation", () => {
  it("forwards the governed context and option boundary to recommendation", () => {
    const context = {
      decisionNeed: "compare",
      userContext: {
        needs: [], priorities: [], preferences: [], constraints: [], usageConditions: [],
      },
      evaluationContext: { decisionCriteria: [], decisionOptions: undefined },
      domainContext: { contextualElements: undefined, contextualRelationships: undefined },
    };

    executeAuthorizedCarsRecommendation({ context, optionIds: ["1", "2"] });

    expect(getRecommendedCars).toHaveBeenCalledWith(context, ["1", "2"]);
  });
});
