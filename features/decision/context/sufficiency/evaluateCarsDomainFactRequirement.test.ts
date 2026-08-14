import { describe, expect, it } from "vitest";

import type { CarsDomainEvidenceAssertion } from "@/types/carsDomainEvidence";
import type { CarsDomainFactPredicate, CarsDomainFactRequirement } from "@/types/carsDomainFactRequirement";

import { evaluateCarsDomainFactRequirement } from "./evaluateCarsDomainFactRequirement";

function requirement(predicate: CarsDomainFactPredicate, category: CarsDomainFactRequirement["identity"]["category"] = "fuel"): CarsDomainFactRequirement {
  return { id: "dfr", identity: { version: "cars-dfr:v1", policyId: "p", policyVersion: "1", parentPolicyRequirementId: "r", contextLineage: [], optionIds: ["car"], category, predicate }, bindingSourceOccurrence: 0, relationSourceOccurrence: 0 };
}

function evidence(value: unknown, category: CarsDomainEvidenceAssertion["category"] = "fuel"): CarsDomainEvidenceAssertion {
  return { evidenceId: "e", optionId: "car", category, availability: "AVAILABLE", assertion: value, source: { sourceId: "s", reference: "r" }, provenance: "AUTHORITATIVE_SOURCE", limitations: [], conflictReferences: [] };
}

describe("evaluateCarsDomainFactRequirement", () => {
  it.each([
    [450, "SATISFIED"],
    [650, "NEGATIVE"],
    [550, "UNRESOLVED"],
  ] as const)("evaluates a fail-safe MIN_MAX cargo range against >= %i", (operand, status) => {
    expect(evaluateCarsDomainFactRequirement(
      requirement({ relation: "ORDERED_NUMERIC_COMPARISON", direction: "AT_LEAST", operand }, "cargo_volume_l"),
      evidence({ valueMin: 484, valueMax: 616, rangeSemantics: "MIN_MAX" }, "cargo_volume_l"),
    ).status).toBe(status);
  });

  it.each([
    [{ relation: "EXACT_EQUAL", operand: "diesel" }, "diesel"],
    [{ relation: "EXACT_NOT_EQUAL", operand: "petrol" }, "diesel"],
    [{ relation: "IN_SET", operand: ["diesel", "hybrid"] }, "hybrid"],
    [{ relation: "NOT_IN_SET", operand: ["petrol", "electric"] }, "diesel"],
  ] as const)("uses exact scalar semantics for %o", (predicate, value) => {
    expect(evaluateCarsDomainFactRequirement(requirement(predicate), evidence(value))).toEqual({ status: "SATISFIED" });
  });

  it("does not normalize or coerce", () => {
    expect(evaluateCarsDomainFactRequirement(requirement({ relation: "EXACT_EQUAL", operand: "2020" }), evidence(2020))).toMatchObject({ status: "NEGATIVE" });
  });

  it("evaluates integer years and fails closed for malformed years", () => {
    const predicate = { relation: "ORDERED_YEAR_COMPARISON", direction: "ON_OR_AFTER", operand: 2020 } as const;
    expect(evaluateCarsDomainFactRequirement(requirement(predicate, "year"), evidence(2021, "year"))).toEqual({ status: "SATISFIED" });
    expect(evaluateCarsDomainFactRequirement(requirement(predicate, "year"), evidence("2021", "year"))).toEqual({ status: "UNRESOLVED", reason: "UNSUPPORTED_RELATION_EVALUATION" });
  });

  it("requires an available authoritative raw fact of the correct category", () => {
    const raw = requirement({ relation: "RAW_FACT_REQUIRED" });
    expect(evaluateCarsDomainFactRequirement(raw, evidence(false))).toEqual({ status: "SATISFIED" });
    expect(evaluateCarsDomainFactRequirement(raw, evidence("diesel", "brand"))).toMatchObject({ status: "UNRESOLVED" });
  });

  it("diagnoses false negative relations without making an insufficiency decision", () => {
    expect(evaluateCarsDomainFactRequirement(requirement({ relation: "NOT_IN_SET", operand: ["diesel"] }), evidence("diesel"))).toEqual({ status: "NEGATIVE", reason: "NEGATIVE_RELATION_RESULT" });
  });
});
