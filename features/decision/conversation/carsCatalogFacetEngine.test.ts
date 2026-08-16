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
});
