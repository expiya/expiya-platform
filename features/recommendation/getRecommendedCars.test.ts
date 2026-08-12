import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  evaluateCar: vi.fn(),
  createDecisionSummary: vi.fn(),
  defaultRanking: vi.fn(),
}));

vi.mock("@/features/decision/engine", () => ({
  evaluateCar: mocks.evaluateCar,
}));
vi.mock("@/features/decision/createDecisionSummary", () => ({
  createDecisionSummary: mocks.createDecisionSummary,
}));
vi.mock("@/features/recommendation/ranking/defaultRanking", () => ({
  defaultRanking: mocks.defaultRanking,
}));

import { getRecommendedCars } from "./getRecommendedCars";

const context = {
  decisionNeed: "Toyota Corolla ile Honda Civic'i karşılaştır.",
  userContext: {
    needs: [], priorities: [], preferences: [], constraints: [], usageConditions: [],
  },
  evaluationContext: { decisionCriteria: [], decisionOptions: undefined },
  domainContext: { contextualElements: undefined, contextualRelationships: undefined },
};

describe("getRecommendedCars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.evaluateCar.mockImplementation((car) => ({ carId: car.id }));
    mocks.createDecisionSummary.mockImplementation((decision) => decision);
    mocks.defaultRanking.mockImplementation((items) => items);
  });

  it("evaluates only the explicitly authorized comparison options", () => {
    const result = getRecommendedCars(context, ["1", "2"]);

    expect(mocks.evaluateCar.mock.calls.map(([car]) => car.id)).toEqual(["1", "2"]);
    expect(result.map((item) => item.car.id)).toEqual(["1", "2"]);
  });

  it("evaluates the complete bounded catalog for discovery", () => {
    getRecommendedCars(context);

    expect(mocks.evaluateCar.mock.calls.map(([car]) => car.id)).toEqual(["1", "2", "3"]);
  });
});
