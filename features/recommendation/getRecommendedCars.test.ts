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

import { getRecommendedCars, getRecommendedCarsFromRepository } from "./getRecommendedCars";

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
    expect(result).toHaveLength(3);
    expect(result[0].consumerExperience).toMatchObject({
      sourceName: "NHTSA tüketici şikâyetleri",
      market: "ABD",
    });
  });

  it("evaluates only publishable real records when production mode is explicit", () => {
    const result = getRecommendedCars(
      { ...context, decisionNeed: "Sıfır elektrikli SUV istiyorum." },
      undefined,
      { catalogMode: "production", at: new Date("2026-08-13T12:00:00.000Z") },
    );

    expect(mocks.evaluateCar.mock.calls.map(([car]) => car.id)).toEqual([
      "87e30119-f0d5-4c98-8324-cbd65156974b",
      "a3728e65-51b2-447f-a6c3-a1f64db8a310",
    ]);
    expect(result.every(({ car }) => car.km === 0 && car.fuel === "Electric")).toBe(true);
  });

  it("uses the sourced Toyota campaign price in production budget filtering", () => {
    const result = getRecommendedCars(
      { ...context, decisionNeed: "2 milyon TL bütçeyle sadece hibrit sıfır araç istiyorum." },
      undefined,
      { catalogMode: "production", at: new Date("2026-08-13T12:00:00.000Z") },
    );

    expect(result.map(({ car }) => car.id)).toEqual(["c8d535d0-6c04-4dcb-8cf6-2bad5bd037e8"]);
    expect(result[0].car).toMatchObject({ brand: "Toyota", price: 1_995_000, km: 0, fuel: "Hybrid" });
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

  it("returns at most three compact automatic cars ordered by the user's cheapest priority", () => {
    const result = getRecommendedCars({
      ...context,
      decisionNeed: [
        "Clio mu Egea mı, ne dersin?",
        "En düşük toplam maliyet önemli.",
        "Yılda 10 bin km altı, çoğu şehir içi.",
        "Çoğunlukla 1-2 kişiyiz, küçük bagaj yeter.",
        "Otomatik istiyorum.",
        "En ucuz otomatik hangisiyse.",
        "Başka en ucuz otomatiklere de açığım.",
        "Çok küçük şehir arabası da olur.",
      ].join("\n"),
    });

    expect(result.map((item) => item.car.id)).toEqual(["4", "6", "7"]);
    expect(result.map((item) => item.car.bodyType)).toEqual(["Hatchback", "Hatchback", "Hatchback"]);
    expect(result.every((item) => item.car.transmission === "Automatic")).toBe(true);
  });

  it("does not present used catalog records when the user explicitly requires a zero-kilometre car", () => {
    const result = getRecommendedCars({
      ...context,
      decisionNeed: "Sıfır bakıyorum. Otomatik, çok küçük şehir arabası ve en ucuz seçenek olsun.",
    });

    expect(result).toEqual([]);
    expect(mocks.evaluateCar).not.toHaveBeenCalled();
  });

  it("selects Clio alone when the Clio-Egea comparison is constrained to automatic", () => {
    const result = getRecommendedCars({
      ...context,
      decisionNeed: "Clio mu Egea mı? Otomatik istiyorum; en ucuz otomatik hangisiyse.",
    }, ["4", "5"]);

    expect(result.map((item) => item.car.id)).toEqual(["4"]);
  });

  it("runs the recommendation engine against a repository-backed production catalog", async () => {
    const databaseCar = {
      id: "8af2278c-4168-4a1b-a915-6b72b9cd6f48", brand: "Toyota", model: "Corolla Vision Plus",
      year: 2026, price: 1_850_000, km: 0, fuel: "Gasoline" as const,
      transmission: "Automatic" as const, bodyType: "Sedan" as const,
      image: "/cars/production-placeholder.svg", createdAt: "2026-08-13T00:00:00.000Z",
      updatedAt: "2026-08-14T00:00:00.000Z",
    };
    const repository = { readPublishedCatalog: async () => ({
      mode: "production" as const, cars: [databaseCar],
      identities: [{ id: databaseCar.id, brand: "Toyota", model: "Corolla" }], limitations: [],
    }) };
    const result = await getRecommendedCarsFromRepository(context, repository);
    expect(result.catalog.mode).toBe("production");
    expect(result.recommendations.map(({ car }) => car.id)).toEqual([databaseCar.id]);
  });
});
