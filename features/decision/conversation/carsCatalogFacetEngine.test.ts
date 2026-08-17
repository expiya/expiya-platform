import { describe, expect, it } from "vitest";

import { activeCatalogPayload, activeCatalogReleaseVersion } from "@/data/production/catalog/activeCatalog.generated";
import activeCatalogPointer from "@/data/production/catalog/active.json";
import { buildCarsRequirementLedger } from "./carsConversationMemory";
import { evaluateCatalogFacets } from "./carsCatalogFacetEngine";

describe("catalog facet engine", () => {
  it("uses exactly the variants in the active catalog release", () => {
    const result = evaluateCatalogFacets(buildCarsRequirementLedger([]));
    expect(activeCatalogReleaseVersion).toBe(activeCatalogPointer.active_catalog_release_version);
    expect(result.initialCount).toBe(activeCatalogPayload.records.length);
  });

  it("keeps diesel four-wheel-drive pickups in the candidate pool", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "4x4 şart gibi" },
      { id: "2", role: "user", content: "Pickup olmalı" },
      { id: "3", role: "user", content: "Dizel" },
    ]);
    const result = evaluateCatalogFacets(trace);
    expect(result.candidates).toHaveLength(7);
    expect(result.candidates.every((item) => item.body === "PICKUP" && item.fuel === "DIESEL" && /AWD|4X4/iu.test(item.drivetrain))).toBe(true);
    expect(result.candidates.map((item) => item.model)).toEqual(expect.arrayContaining(["D-Max", "Amarok", "Musso Grand", "Ranger", "Hilux"]));
  });

  it("widens the current pickup pool when fuel or four-wheel drive is relaxed", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "4x4 şart gibi" },
      { id: "2", role: "user" as const, content: "Pickup olmalı" },
      { id: "3", role: "user" as const, content: "Dizel" },
      { id: "4", role: "user" as const, content: "Benzin de olabilir" },
      { id: "5", role: "user" as const, content: "4x4 olmasına gerek yok" },
    ];
    const trace = buildCarsRequirementLedger(messages);
    expect(trace.requirements).toContainEqual(expect.objectContaining({ key: "FUEL", value: "DIESEL" }));
    expect(trace.requirements.some((item) => item.key === "DRIVETRAIN")).toBe(false);
    const result = evaluateCatalogFacets(trace);
    expect(result.candidates).toHaveLength(9);
    expect(result.candidates.every((item) => item.body === "PICKUP" && item.fuel === "DIESEL")).toBe(true);
  });

  it("recomputes all filters from the current requirements and can widen after a budget correction", () => {
    const twoMillion = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "Bütçem en fazla 1.5 milyon TL" },
    ]);
    const threeMillion = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "Bütçem en fazla 1.5 milyon TL" },
      { id: "2", role: "user", content: "Bütçemi 2 milyon TL yaptım" },
    ]);
    const narrow = evaluateCatalogFacets(twoMillion);
    const widened = evaluateCatalogFacets(threeMillion);
    expect(widened.candidates.length).toBeGreaterThan(narrow.candidates.length);
    expect(widened.appliedFilters).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "BUDGET_MAX_TRY", value: 2_000_000 }),
    ]));
    expect(narrow.candidates.some((item) => /SUV|CROSSOVER/iu.test(item.body))).toBe(false);
    expect(widened.candidates.some((item) => /SUV|CROSSOVER/iu.test(item.body))).toBe(true);
  });

  it("treats electric rejection as exclusion rather than an electric preference", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "Çok az yaksın ama elektrikli istemiyorum, bagaj en az 300 litre olsun" },
    ]);
    expect(trace.requirements).toContainEqual(expect.objectContaining({ key: "FUEL_EXCLUDED", value: "ELECTRIC" }));
    expect(trace.requirements).not.toContainEqual(expect.objectContaining({ key: "FUEL", value: "ELECTRIC" }));
    const result = evaluateCatalogFacets(trace);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.every((item) => item.fuel !== "BEV")).toBe(true);
  });

  it("reports unavailable acceleration instead of substituting power", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "0-100 maksimum 3.5 saniye olsun" },
    ]);
    expect(evaluateCatalogFacets(trace).unsupportedAccelerationSeconds).toBe(3.5);
  });

  it("chooses a question that actually partitions the already-filtered candidate set", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "5 milyon TL altında sedan istiyorum" },
    ]);
    const result = evaluateCatalogFacets(trace);
    expect(result.nextQuestion).toBeDefined();
    expect(Object.values(result.nextQuestion?.partitions ?? {}).filter((count) => count > 0).length).toBeGreaterThan(1);
    expect(Object.values(result.nextQuestion?.partitions ?? {}).reduce((sum, count) => sum + count, 0)).toBeLessThanOrEqual(result.candidates.length);
  });

  it("does not turn every catalog column into a questionnaire", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "3 milyon TL altında hibrit ve şık bir araba öner" },
    ]);
    const result = evaluateCatalogFacets({
      ...trace,
      askedQuestionPurposes: [...trace.askedQuestionPurposes, "BODY_TYPE", "FUEL", "CATALOG_FACET:price_max_try"],
    });
    expect(result.nextQuestion?.purpose).not.toBe("CATALOG_FACET:consumption_max_l_100km");
    expect(result.nextQuestion?.purpose).not.toBe("CATALOG_FACET:power_min_kw");
    expect(result.nextQuestion?.purpose).not.toBe("CATALOG_FACET:seats_min");
    expect(result.nextQuestion?.purpose).not.toBe("TRANSMISSION");
    expect(result.nextQuestion?.purpose).not.toBe("DRIVETRAIN");
  });

  it("presents a requested consumption tradeoff in everyday ranges", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "5 milyon TL altında hibrit ve az yakan bir araç öner" },
    ]);
    const result = evaluateCatalogFacets({
      ...trace,
      askedQuestionPurposes: [...trace.askedQuestionPurposes, "BODY_TYPE", "FUEL", "CATALOG_FACET:price_max_try"],
    });
    expect(result.nextQuestion?.purpose).toBe("CATALOG_FACET:consumption_max_l_100km");
    expect(result.nextQuestion?.text).toMatch(/yılda yaklaşık kaç kilometre/iu);
    expect(result.nextQuestion?.options).toContain("Yakıt gideri ile diğer beklentiler arasında denge kuran birleşik tüketim");
    expect(result.nextQuestion?.technicalDailyLifeMappingIds).toContain("combined-fuel-consumption--non-phev-2");
  });

  it("builds luggage questions and option mappings from the production daily-life layer", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "5 milyon TL altında hibrit araç bakıyorum, bagaj önemli" },
    ]);
    const result = evaluateCatalogFacets({
      ...trace,
      askedQuestionPurposes: [...trace.askedQuestionPurposes, "BODY_TYPE", "FUEL", "CATALOG_FACET:price_max_try"],
    });
    expect(result.nextQuestion?.purpose).toBe("CATALOG_FACET:luggage_min_l");
    expect(result.nextQuestion?.text).toMatch(/kabin boy bavul|büyük bavul/iu);
    expect(result.nextQuestion?.options).toContain("Dört kişilik kısa tatil");
    expect(result.nextQuestion?.technicalDailyLifeMappingIds).toContain("luggage-volume--400-499");
  });

  it("removes a rejected full-catalog variant without changing technical filters", () => {
    const trace = buildCarsRequirementLedger([{ id: "1", role: "user", content: "3 milyon TL altında hibrit araç öner" }]);
    const first = evaluateCatalogFacets(trace);
    const rejected = first.candidates[0];
    expect(rejected).toBeDefined();
    const second = evaluateCatalogFacets({ ...trace, rejectedRecommendationIds: [rejected.id] });
    expect(second.candidates.some((item) => item.id === rejected.id)).toBe(false);
    expect(second.appliedFilters).toContainEqual(expect.objectContaining({ key: "REJECTED_CANDIDATES", before: first.initialCount, after: first.initialCount - 1 }));
  });
});
