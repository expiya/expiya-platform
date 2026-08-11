import { describe, expect, it } from "vitest";

import type { CarsDomainEvidenceAssertion, CarsDomainEvidenceLinkageInput } from "@/types/carsDomainEvidence";
import type { CarsDomainFactPredicate, CarsDomainFactRequirement } from "@/types/carsDomainFactRequirement";

import { optionDiscoveryRecommendationPolicy as policy } from "./carsSufficiencyPolicies";
import { assessCarsDomainSufficiency } from "./assessCarsDomainSufficiency";

function requirement(id = "dfr-1", optionIds: string[] = ["car-1"], predicate: CarsDomainFactPredicate = { relation: "EXACT_EQUAL", operand: "diesel" }): CarsDomainFactRequirement {
  return {
    id,
    identity: {
      version: "cars-dfr:v1", policyId: policy.policyId, policyVersion: policy.version,
      parentPolicyRequirementId: "material-preferences", contextLineage: [], optionIds,
      category: "fuel", predicate,
    },
    bindingSourceOccurrence: 0, relationSourceOccurrence: 0,
  };
}

function assertion(evidenceId: string, optionId = "car-1", value: unknown = "diesel", overrides: Partial<CarsDomainEvidenceAssertion> = {}): CarsDomainEvidenceAssertion {
  return {
    evidenceId, optionId, category: "fuel", availability: "AVAILABLE", assertion: value,
    source: { sourceId: `source-${evidenceId}`, reference: `ref-${evidenceId}` },
    provenance: "AUTHORITATIVE_SOURCE", limitations: [], conflictReferences: [], ...overrides,
  };
}

function input(requirements: CarsDomainFactRequirement[] = [requirement()], assertions: CarsDomainEvidenceAssertion[] = [assertion("e-1")], overrides: Partial<CarsDomainEvidenceLinkageInput> = {}): CarsDomainEvidenceLinkageInput {
  return {
    optionIds: ["car-1"],
    requirementResolution: {
      status: "RESOLVED",
      resolutions: [{ parentPolicyRequirementId: "material-preferences", status: "RESOLVED", requirements }],
      requirements, limitations: [], errors: [],
    },
    assertions,
    requirementLinks: assertions.map((item) => ({ evidenceId: item.evidenceId, requirementId: requirements[0].id })),
    conflicts: [], optionMatches: [], ...overrides,
  };
}

function assess(evidenceInput: CarsDomainEvidenceLinkageInput) {
  return assessCarsDomainSufficiency({
    decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    policy,
    evidenceInput,
  });
}

describe("assessCarsDomainSufficiency", () => {
  it("evaluates concrete requirements through explicit links without Cartesian fallback", () => {
    const result = assess(input());
    expect(result.outcome).toBe("SUFFICIENT");
    expect(result.evaluableOptionIds).toEqual(["car-1"]);
    expect(result.missingDomainRequirements).toEqual([]);
  });

  it("keeps absence and non-authoritative evidence unresolved", () => {
    const absent = input([requirement()], [], { requirementLinks: [] });
    expect(assess(absent).outcome).toBe("UNRESOLVED");
    const declared = assertion("e-1", "car-1", "diesel", { provenance: "DECLARED_SOURCE" });
    expect(assess(input([requirement()], [declared])).outcome).toBe("UNRESOLVED");
  });

  it("treats only explicit authoritative missing as insufficient", () => {
    const missing = assertion("e-1", "car-1", undefined, { availability: "MISSING" });
    const result = assess(input([requirement()], [missing]));
    expect(result.outcome).toBe("INSUFFICIENT");
    expect(result.missingDomainRequirements).toEqual(["dfr-1"]);
  });

  it("preserves unresolved-over-insufficient precedence", () => {
    const requirements = [requirement("dfr-1"), requirement("dfr-2")];
    const missing = assertion("missing", "car-1", undefined, { availability: "MISSING" });
    const evidenceInput = input(requirements, [missing], {
      requirementLinks: [{ evidenceId: "missing", requirementId: "dfr-1" }],
    });
    expect(assess(evidenceInput).outcome).toBe("UNRESOLVED");
  });

  it("does not make a negative predicate result insufficient", () => {
    const result = assess(input([requirement()], [assertion("e-1", "car-1", "petrol")]));
    expect(result.outcome).toBe("SUFFICIENT");
    expect(result.diagnostics).toContainEqual({
      requirementId: "dfr-1", optionId: "car-1", evidenceIds: ["e-1"], reason: "CONSTRAINT_MISMATCH",
    });
  });

  it("supports one assertion linked to multiple requirements", () => {
    const requirements = [requirement("dfr-1"), requirement("dfr-2")];
    const evidenceInput = input(requirements, [assertion("e-1")], {
      requirementLinks: [
        { evidenceId: "e-1", requirementId: "dfr-1" },
        { evidenceId: "e-1", requirementId: "dfr-2" },
      ],
    });
    expect(assess(evidenceInput).outcome).toBe("SUFFICIENT");
  });

  it("evaluates every option in a multi-option requirement independently", () => {
    const req = requirement("dfr-1", ["car-1", "car-2"]);
    const evidenceInput = input([req], [assertion("e-1")], { optionIds: ["car-1", "car-2"] });
    const result = assess(evidenceInput);
    expect(result.outcome).toBe("UNRESOLVED");
    expect(result.evaluableOptionIds).toEqual(["car-1"]);
  });

  it("accepts valid zero-requirement resolutions without fabricated evidence", () => {
    const evidenceInput = input([], [], {
      requirementResolution: {
        status: "RESOLVED",
        resolutions: [{ parentPolicyRequirementId: "candidate-options", status: "RESOLVED", requirements: [], reason: "CANDIDATE_IDENTITY_COVERED" }],
        requirements: [], limitations: [], errors: [],
      },
      requirementLinks: [],
    });
    expect(assess(evidenceInput)).toMatchObject({ outcome: "SUFFICIENT", diagnostics: [] });
  });

  it("fails closed on unresolved and impossible failed resolution states", () => {
    const unresolved = input([], [], {
      requirementResolution: {
        status: "UNRESOLVED",
        resolutions: [{ parentPolicyRequirementId: "material-preferences", status: "UNRESOLVED", requirements: [], limitations: ["unknown"], contextLineage: [] }],
        requirements: [], limitations: ["unknown"], errors: [],
      }, requirementLinks: [],
    });
    expect(assess(unresolved).outcome).toBe("UNRESOLVED");
    const failed = {
      ...structuredClone(unresolved),
      requirementResolution: { ...unresolved.requirementResolution, status: "FAILED" as const },
    };
    expect(assess(failed).outcome).toBe("UNRESOLVED");
  });

  it("blocks unresolved conflicts, ignores resolved conflicts, and preserves lineage", () => {
    const conflicted = assertion("e-1", "car-1", "diesel", { conflictReferences: ["c-1"] });
    const unresolved = input([requirement()], [conflicted], {
      conflicts: [{ conflictId: "c-1", evidenceIds: ["e-1", "e-2"], resolutionStatus: "UNRESOLVED" }],
    });
    expect(assess(unresolved)).toMatchObject({ outcome: "UNRESOLVED", relevantConflicts: ["c-1"] });
    const resolved = {
      ...structuredClone(unresolved),
      conflicts: [{ ...unresolved.conflicts[0], resolutionStatus: "RESOLVED" as const }],
    };
    expect(assess(resolved).outcome).toBe("SUFFICIENT");
  });

  it("fails closed for contradictory authoritative assertions without a conflict", () => {
    const evidenceInput = input([requirement()], [assertion("e-1"), assertion("e-2", "car-1", "petrol")]);
    expect(assess(evidenceInput).outcome).toBe("UNRESOLVED");

    const mixedAvailability = input([requirement()], [
      assertion("e-1"),
      assertion("e-2", "car-1", undefined, { availability: "MISSING" }),
    ]);
    expect(assess(mixedAvailability).outcome).toBe("UNRESOLVED");
  });

  it("is deterministic and does not mutate input", () => {
    const evidenceInput = input();
    const before = structuredClone(evidenceInput);
    expect(assess(evidenceInput)).toEqual(assess(structuredClone(evidenceInput)));
    expect(evidenceInput).toEqual(before);
  });
});
