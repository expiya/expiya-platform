import { describe, expect, it } from "vitest";

import { interpretRecommendation } from "./interpretRecommendation";
import type { RecommendedCar } from "@/types/recommendation";

function recommendation(overrides: Partial<RecommendedCar["car"]> = {}): RecommendedCar {
  return {
    car: {
      id: "1", brand: "Toyota", model: "Corolla", year: 2022, price: 1_325_000,
      km: 28_000, fuel: "Gasoline", transmission: "Automatic", bodyType: "Sedan",
      image: "/cars/toyota-corolla.jpg", createdAt: "2026-08-01", updatedAt: "2026-08-01",
      ...overrides,
    },
    decision: {
      decisionId: "dec-1", score: 82, recommendation: "Very Good", reasons: [],
      confidence: { value: 80, level: "High", explanation: "Test" },
    },
    isTopPick: true,
  };
}

describe("interpretRecommendation", () => {
  it("turns vehicle facts into strengths and material tradeoffs", () => {
    const result = interpretRecommendation(recommendation({ year: 1992, km: 210_000, transmission: "Manual" }));

    expect(result.strengths[0]).toContain("Benzinli");
    expect(result.tradeoffs).toEqual(expect.arrayContaining([
      expect.stringContaining("Klasik araç"),
      expect.stringContaining("210.000 km"),
      expect.stringContaining("Manuel şanzıman"),
    ]));
  });

  it("interprets complaint data as a risk signal without inventing positive reviews", () => {
    const input = recommendation();
    input.consumerExperience = {
      sourceName: "NHTSA tüketici şikâyetleri", sourceUrl: "https://example.com", market: "ABD",
      complaintCount: 95, recurringRiskThemes: ["Servis frenleri"], limitation: "Normalize edilmemiştir.",
    };

    const result = interpretRecommendation(input);

    expect(result.experienceAnalysis?.summary).toContain("risk sinyalidir");
    expect(result.experienceAnalysis?.testDriveChecks[0]).toContain("fren");
    expect(result.experienceAnalysis?.evidenceNote).toContain("olumlu kullanıcı görüşü oranı üretilemez");
  });
});
