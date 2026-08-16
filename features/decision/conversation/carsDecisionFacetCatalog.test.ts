import { describe, expect, it } from "vitest";

import {
  declarativeFacetPredicate,
  extractDeclarativeFacetFacts,
  validateDecisionFacetCoverage,
  type CarsDecisionFacetDefinition,
} from "./carsDecisionFacetCatalog";

const syntheticFacet: CarsDecisionFacetDefinition = {
  id: "synthetic_range",
  requirementKey: "CATALOG_FACET:SYNTHETIC_RANGE_MIN",
  valuePath: "variant.syntheticRange.value",
  operator: "MIN",
  questionPurpose: "CATALOG_FACET:synthetic_range",
  question: "Sentetik menzil alt sınırı nedir?",
  inputPatterns: ["(?:en az)\\s*(\\d+)\\s*sentetik"],
  askByDefault: false,
  scale: 1,
};

describe("catalog decision facet metadata", () => {
  it("adds parsing and filtering for a new parameter without engine code", () => {
    expect(extractDeclarativeFacetFacts("en az 42 sentetik", [syntheticFacet])).toEqual([
      { key: "CATALOG_FACET:SYNTHETIC_RANGE_MIN", value: 42 },
    ]);
    const predicate = declarativeFacetPredicate(syntheticFacet, 42);
    expect(predicate({ variant: { syntheticRange: { value: 50 } } })).toBe(true);
    expect(predicate({ variant: { syntheticRange: { value: 30 } } })).toBe(false);
  });

  it("rejects metadata whose value path does not exist in the active catalog", () => {
    expect(() => validateDecisionFacetCoverage([{ variant: {} }], [syntheticFacet]))
      .toThrow("DECISION_FACET_WITHOUT_CATALOG_VALUES:synthetic_range");
  });

  it("translates everyday luggage and performance language into catalog filters", () => {
    expect(extractDeclarativeFacetFacts("en azından 2 bavul kapasitesi olsun")).toContainEqual({
      key: "MIN_CARGO_L", value: 300,
    });
    expect(extractDeclarativeFacetFacts("belirgin şekilde güçlü olsun")).toContainEqual({
      key: "MIN_POWER_KW", value: 160,
    });
  });
});
