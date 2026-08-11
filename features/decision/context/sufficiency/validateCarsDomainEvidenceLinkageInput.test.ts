import { describe, expect, it } from "vitest";

import type { CarsDomainEvidenceLinkageInput } from "@/types/carsDomainEvidence";
import type {
  CarsDomainFactRequirement,
  CarsDomainFactRequirementResolutionResult,
} from "@/types/carsDomainFactRequirement";

import { validateCarsDomainEvidenceLinkageInput } from "./validateCarsDomainEvidenceLinkageInput";

function requirement(
  id = "req-fuel",
  optionIds: readonly string[] = ["car-1", "car-2"],
): CarsDomainFactRequirement {
  return {
    id,
    identity: {
      version: "cars-dfr:v1",
      policyId: "cars-policy",
      policyVersion: "1",
      parentPolicyRequirementId: "preferences",
      contextLineage: [],
      optionIds,
      category: "fuel",
      predicate: { relation: "RAW_FACT_REQUIRED" },
    },
    bindingSourceOccurrence: 0,
    relationSourceOccurrence: 0,
  };
}

function resolution(
  requirements: readonly CarsDomainFactRequirement[] = [requirement()],
): CarsDomainFactRequirementResolutionResult {
  return {
    status: "RESOLVED",
    resolutions: [{
      parentPolicyRequirementId: "preferences",
      status: "RESOLVED",
      requirements,
    }],
    requirements,
    limitations: [],
    errors: [],
  };
}

function input(overrides: Partial<CarsDomainEvidenceLinkageInput> = {}): CarsDomainEvidenceLinkageInput {
  return {
    optionIds: ["car-1", "car-2"],
    requirementResolution: resolution(),
    assertions: [{
      evidenceId: "evidence-1",
      optionId: "car-1",
      category: "fuel",
      availability: "AVAILABLE",
      assertion: "hybrid",
      source: { sourceId: "catalog", reference: "car-1" },
      provenance: "AUTHORITATIVE_SOURCE",
      limitations: [],
      conflictReferences: [],
    }],
    requirementLinks: [{ evidenceId: "evidence-1", requirementId: "req-fuel" }],
    conflicts: [],
    optionMatches: [],
    ...overrides,
  };
}

describe("validateCarsDomainEvidenceLinkageInput", () => {
  it("accepts an assertion explicitly linked to its concrete requirement without copying", () => {
    const value = input();
    const snapshot = structuredClone(value);
    const result = validateCarsDomainEvidenceLinkageInput({
      input: value,
      decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result).toEqual({ ok: true, value });
    expect(result.ok && result.value).toBe(value);
    expect(value).toEqual(snapshot);
  });

  it("supports explicit many-to-many links", () => {
    const second = requirement("req-fuel-2", ["car-1"]);
    const requirements = [requirement(), second];
    const value = input({
      requirementResolution: resolution(requirements),
      assertions: [
        input().assertions[0],
        { ...input().assertions[0], evidenceId: "evidence-2", assertion: "electric" },
      ],
      requirementLinks: [
        { evidenceId: "evidence-1", requirementId: "req-fuel" },
        { evidenceId: "evidence-1", requirementId: "req-fuel-2" },
        { evidenceId: "evidence-2", requirementId: "req-fuel" },
      ],
    });

    expect(validateCarsDomainEvidenceLinkageInput({
      input: value,
      decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    }).ok).toBe(true);
  });

  it("reports unknown, duplicate, incompatible, and absent links without deduplicating", () => {
    const value = input({
      assertions: [
        input().assertions[0],
        { ...input().assertions[0], evidenceId: "unlinked", category: "year", optionId: "car-2" },
      ],
      requirementLinks: [
        { evidenceId: "evidence-1", requirementId: "req-fuel" },
        { evidenceId: "evidence-1", requirementId: "req-fuel" },
        { evidenceId: "missing", requirementId: "missing-requirement" },
      ],
    });
    const result = validateCarsDomainEvidenceLinkageInput({
      input: value,
      decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.map((item) => item.code)).toEqual([
      "DUPLICATE_REQUIREMENT_LINK",
      "UNKNOWN_LINK_ASSERTION",
      "UNKNOWN_LINK_REQUIREMENT",
      "UNLINKED_ASSERTION",
    ]);
    expect(value.requirementLinks).toHaveLength(3);
  });

  it("validates option scope, fact category, and bidirectional conflict lineage", () => {
    const value = input({
      assertions: [{
        ...input().assertions[0],
        optionId: "car-2",
        category: "year",
        conflictReferences: ["conflict-1", "missing-conflict"],
      }],
      requirementResolution: resolution([requirement("req-fuel", ["car-1"])]),
      conflicts: [{
        conflictId: "conflict-1",
        evidenceIds: ["evidence-1", "unknown"],
        resolutionStatus: "UNRESOLVED",
      }],
    });
    const result = validateCarsDomainEvidenceLinkageInput({
      input: value,
      decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(!result.ok && result.errors.map((item) => item.code)).toEqual([
      "LINK_OPTION_SCOPE_MISMATCH",
      "LINK_FACT_CATEGORY_MISMATCH",
      "UNKNOWN_CONFLICT_ASSERTION",
      "CONFLICT_LINEAGE_MISMATCH",
    ]);
  });

  it("permits only the explicit candidate identity zero-resolution exception", () => {
    const zero = (reason: "CANDIDATE_IDENTITY_COVERED" | undefined) => input({
      requirementResolution: {
        status: "RESOLVED",
        resolutions: [{
          parentPolicyRequirementId: "candidate-options",
          status: "RESOLVED",
          requirements: [],
          ...(reason ? { reason } : {}),
        }],
        requirements: [], limitations: [], errors: [],
      },
      assertions: [], requirementLinks: [],
    });
    expect(validateCarsDomainEvidenceLinkageInput({
      input: zero("CANDIDATE_IDENTITY_COVERED"),
      decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    }).ok).toBe(true);
    const invalid = validateCarsDomainEvidenceLinkageInput({
      input: zero(undefined),
      decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });
    expect(!invalid.ok && invalid.errors[0].code).toBe("INVALID_ZERO_REQUIREMENT_RESOLUTION");
  });

  it("validates Type B match integrity in stable input order", () => {
    const value = input({ optionMatches: [
      { inputIndex: 1, status: "AMBIGUOUS", candidateOptionIds: ["unknown", "car-2"] },
      { inputIndex: 0, status: "MATCHED", optionId: "car-1", candidateOptionIds: ["car-2"] },
      { inputIndex: 0, status: "NOT_FOUND", candidateOptionIds: [] },
    ] });
    const result = validateCarsDomainEvidenceLinkageInput({
      input: value,
      decisionType: "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
    });

    expect(!result.ok && result.errors.map((item) => item.code)).toEqual([
      "TYPE_B_DUPLICATE_INPUT_INDEX",
      "TYPE_B_OPTION_AMBIGUOUS",
      "TYPE_B_UNKNOWN_CANDIDATE_OPTION",
      "TYPE_B_MATCH_INCONSISTENT",
      "TYPE_B_OPTION_NOT_MATCHED",
    ]);
  });

  it("reports duplicate ids and requirement aggregate/resolution drift deterministically", () => {
    const req = requirement();
    const value = input({
      optionIds: ["car-1", "car-1"],
      requirementResolution: {
        ...resolution([req, req]),
        resolutions: [{ parentPolicyRequirementId: "preferences", status: "RESOLVED", requirements: [req] }],
      },
      assertions: [input().assertions[0], input().assertions[0]],
    });
    const first = validateCarsDomainEvidenceLinkageInput({ input: value, decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION" });
    const second = validateCarsDomainEvidenceLinkageInput({ input: value, decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION" });
    expect(first).toEqual(second);
    expect(!first.ok && first.errors.slice(0, 4).map((item) => item.code)).toEqual([
      "DUPLICATE_OPTION_ID",
      "DUPLICATE_REQUIREMENT_ID",
      "REQUIREMENT_RESOLUTION_INTEGRITY",
      "DUPLICATE_ASSERTION_ID",
    ]);
  });
});
