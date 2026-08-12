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
    const result = getRecommendedCars(context);

    expect(mocks.evaluateCar).toHaveBeenCalledTimes(20);
    expect(mocks.evaluateCar.mock.calls.map(([car]) => car.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => String(index + 1)),
    );
    expect(result[0].consumerExperience).toMatchObject({
      sourceName: "NHTSA tüketici şikâyetleri",
      market: "ABD",
    });
  });

  it("filters discovery options by explicit budget and fuel constraints", () => {
    getRecommendedCars({
      ...context,
      decisionNeed: "Find a gasoline car with a budget up to 1.3 million TL.",
    });

    expect(mocks.evaluateCar.mock.calls.map(([car]) => car.id)).toEqual(["2", "4", "18"]);
  });

  it("applies the newest corrected budget carried in the decision context", () => {
    getRecommendedCars({
      ...context,
      decisionNeed: "My budget is 1.2 million TL. Correction: budget up to 1.5 million TL.",
    });

    expect(mocks.evaluateCar.mock.calls.map(([car]) => car.id)).toEqual([
      "1", "2", "4", "5", "6", "9", "13", "18", "20",
    ]);
  });

  it("evaluates only Tesla for an explicit electric-only preference", () => {
    getRecommendedCars({
      ...context,
      decisionNeed: "Şehir içinde kullanacağım. Sadece elektrikli araç istiyorum.",
    });

    expect(mocks.evaluateCar.mock.calls.map(([car]) => car.id)).toEqual(["3"]);
  });

  it("excludes electric cars when the user explicitly rejects charging", () => {
    getRecommendedCars({
      ...context,
      decisionNeed: "Elektrikli istemiyorum; sadece benzinli/hibrit düşüneyim.",
    });

    expect(mocks.evaluateCar.mock.calls.map(([car]) => car.id)).toEqual([
      "1", "2", "4", "6", "7", "10", "15", "16", "17", "18", "20",
    ]);
  });

  it.each([
    ["Klasik bir otomobil istiyorum.", ["17", "18", "19", "20"]],
    ["Arazide kullanmak için off-road araç istiyorum.", ["9", "10", "19"]],
    ["İşim için bir pick-up arıyorum.", ["11", "12"]],
    ["Parkı kolay küçük araba istiyorum.", ["4", "6", "7"]],
  ])("filters the catalog for a distinct usage: %s", (decisionNeed, expectedIds) => {
    getRecommendedCars({ ...context, decisionNeed });

    expect(mocks.evaluateCar.mock.calls.map(([car]) => car.id)).toEqual(expectedIds);
  });

  it.each([
    ["İşimde yük taşımak için araç arıyorum.", ["11", "12", "13", "14"]],
    ["Düzenli personel servisi yapacağım.", ["13", "14"]],
    ["Karavan çekmek için araç istiyorum.", ["8", "9", "10", "11", "12", "19"]],
  ])("enforces functional suitability for %s", (decisionNeed, expectedIds) => {
    getRecommendedCars({ ...context, decisionNeed });

    expect(mocks.evaluateCar.mock.calls.map(([car]) => car.id)).toEqual(expectedIds);
    expect(mocks.evaluateCar.mock.calls.map(([car]) => car.bodyType)).not.toContain("Sedan");
  });

  it("returns no misleading candidate when hard requirements contradict", () => {
    const result = getRecommendedCars({
      ...context,
      decisionNeed: "Yük taşıyacağım ama mutlaka küçük hatchback olsun.",
    });

    expect(result).toEqual([]);
    expect(mocks.evaluateCar).not.toHaveBeenCalled();
  });
});
