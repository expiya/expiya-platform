import { describe, expect, it } from "vitest";

import { resolveExplicitCarsTypeBIdentity, resolveExplicitCarsTypeBIdentityFromCatalog } from "./resolveExplicitCarsTypeBIdentity";

function resolve(query: string) {
  return resolveExplicitCarsTypeBIdentity({
    query,
    userConfirmationReferenceId: "request-1",
    candidateId: "candidate-options-1",
  });
}

describe("resolveExplicitCarsTypeBIdentity", () => {
  it("resolves two explicitly named catalog candidates", () => {
    expect(resolve("Toyota Corolla ile Honda Civic'i karşılaştır.")).toEqual({
      status: "RESOLVED",
      production: {
        candidate: {
          id: "candidate-options-1",
          target: "evaluationContext.decisionOptions",
          value: [{ optionId: "1" }, { optionId: "2" }],
          provenance: "EXPLICIT_USER",
          source: {
            kind: "USER_INPUT",
            referenceId: "request-1",
          },
        },
        selectionTrace: [
          {
            inputIndex: 0,
            optionId: "1",
            userConfirmationReferenceId: "request-1",
            domainSourceReferenceId: "fixture:data/car.ts#1",
          },
          {
            inputIndex: 1,
            optionId: "2",
            userConfirmationReferenceId: "request-1",
            domainSourceReferenceId: "fixture:data/car.ts#2",
          },
        ],
      },
    });
  });

  it("matches case and whitespace variants without fuzzy identity inference", () => {
    expect(resolve("toyota   corolla vs TESLA MODEL 3").status).toBe(
      "RESOLVED",
    );
    expect(resolve("Corolla ile Civic'i karşılaştır")).toEqual({
      status: "UNRESOLVED",
      reason: "TOO_FEW_EXPLICIT_CANDIDATES",
    });
  });

  it.each([
    "Toyota Corolla önerir misin?",
    "İki iyi otomobili karşılaştır.",
    "",
  ])("remains unresolved without two explicit canonical names", (query) => {
    expect(resolve(query)).toEqual({
      status: "UNRESOLVED",
      reason: "TOO_FEW_EXPLICIT_CANDIDATES",
    });
  });

  it("maps mentioned production nameplates to every published variant UUID", () => {
    const result = resolveExplicitCarsTypeBIdentityFromCatalog({
      query: "Toyota Corolla ile Toyota Yaris'i karşılaştır",
      userConfirmationReferenceId: "request-db", candidateId: "candidate-db",
    }, [
      { id: "corolla-gasoline", brand: "Toyota", model: "Corolla" },
      { id: "corolla-hybrid", brand: "Toyota", model: "Corolla" },
      { id: "yaris-hybrid", brand: "Toyota", model: "Yaris" },
    ], "postgres:vehicle-read-model");
    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.production.selectionTrace.map(({ optionId }) => optionId)).toEqual([
        "corolla-gasoline", "corolla-hybrid", "yaris-hybrid",
      ]);
      expect(result.production.selectionTrace[0].domainSourceReferenceId)
        .toBe("postgres:vehicle-read-model#corolla-gasoline");
    }
  });
});
