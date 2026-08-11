import { describe, expect, it } from "vitest";

import type { ContextCandidate } from "@/types/contextCandidate";
import type { CarsSufficiencyPolicy } from "@/types/contextSufficiency";
import type {
  CarsDomainFactBinding,
  CarsDomainFactCategory,
  CarsDomainFactPredicate,
} from "@/types/carsDomainFactRequirement";

import {
  resolveCarsDomainFactRequirements,
  type ResolveCarsDomainFactRequirementsInput,
  validateCarsDomainFactRequirementResolution,
} from "./resolveCarsDomainFactRequirements";

const policy: CarsSufficiencyPolicy = {
  policyId: "cars.test",
  version: "1",
  decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
  decisionOptionsRule: "USER_PROVIDED_NOT_REQUIRED",
  requirements: [
    {
      requirementId: "decision-need",
      target: "decisionNeed",
      mode: "REQUIRED",
      acceptedProvenance: ["EXPLICIT_USER"],
      confirmationRequiredForInference: false,
    },
    {
      requirementId: "material-constraints",
      target: "userContext.constraints",
      mode: "CONDITIONAL",
      acceptedProvenance: ["EXPLICIT_USER"],
      confirmationRequiredForInference: false,
    },
  ],
};

const candidate: ContextCandidate<"userContext.constraints"> = {
  id: "candidate-1",
  target: "userContext.constraints",
  value: "structured value is not parsed",
  provenance: "EXPLICIT_USER",
  source: { kind: "USER_INPUT", referenceId: "user-1" },
};

function binding(
  overrides: Partial<CarsDomainFactBinding> = {},
): CarsDomainFactBinding {
  return {
    parentPolicyRequirementId: "material-constraints",
    contextLineage: [
      {
        candidateId: "candidate-1",
        bindingReferenceId: "binding-ref-1",
        contextSourceOccurrence: 0,
        candidateInputOccurrence: 0,
        relationSourceOccurrence: 0,
      },
    ],
    optionScope: { kind: "OPTION_IDS", optionIds: ["car-b", "car-a"] },
    category: "fuel",
    predicate: { relation: "EXACT_EQUAL", operand: "diesel" },
    bindingSourceOccurrence: 0,
    relationSourceOccurrence: 0,
    ...overrides,
  };
}

function input(
  overrides: Partial<ResolveCarsDomainFactRequirementsInput> = {},
): ResolveCarsDomainFactRequirementsInput {
  return {
    policy,
    materialityAssessments: [
      {
        requirementId: "material-constraints",
        outcome: "MATERIAL",
        supportingCandidateIds: ["candidate-1"],
        limitations: [],
      },
    ],
    appliedCandidates: [candidate],
    resolvedOptionIds: ["car-a", "car-b", "car-c"],
    bindings: [binding()],
    ...overrides,
  };
}

describe("resolveCarsDomainFactRequirements", () => {
  it("resolves context-only and NOT_MATERIAL parents to zero", () => {
    const result = resolveCarsDomainFactRequirements(input({
      materialityAssessments: [{
        requirementId: "material-constraints",
        outcome: "NOT_MATERIAL",
        supportingCandidateIds: [],
        limitations: [],
      }],
      bindings: [],
    }));
    expect(result.status).toBe("RESOLVED");
    expect(result.resolutions).toMatchObject([
      { status: "RESOLVED", reason: "CONTEXT_ONLY", requirements: [] },
      { status: "RESOLVED", reason: "NOT_MATERIAL", requirements: [] },
    ]);
  });

  it("resolves candidate-options zero only with complete ordered identity coverage", () => {
    const comparisonPolicy: CarsSufficiencyPolicy = {
      ...policy,
      decisionType: "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
      decisionOptionsRule: "REQUIRED",
      requirements: [{
        requirementId: "candidate-options",
        target: "evaluationContext.decisionOptions",
        mode: "REQUIRED",
        acceptedProvenance: ["EXPLICIT_USER"],
        confirmationRequiredForInference: false,
      }],
    };
    const covered = resolveCarsDomainFactRequirements(input({
      policy: comparisonPolicy,
      materialityAssessments: [],
      bindings: [],
      candidateIdentityCoverage: {
        parentPolicyRequirementId: "candidate-options",
        canonicalProducerReferenceId: "producer-1",
        catalogAcquisitionReferenceId: "catalog-1",
        exactMatcherReferenceId: "matcher-1",
        candidateIds: ["candidate-1"],
        optionIds: ["car-a", "car-b", "car-c"],
      },
    }));
    expect(covered.resolutions[0]).toMatchObject({
      status: "RESOLVED",
      reason: "CANDIDATE_IDENTITY_COVERED",
      requirements: [],
    });
    expect(resolveCarsDomainFactRequirements(input({
      policy: comparisonPolicy,
      materialityAssessments: [],
      bindings: [],
    })).status).toBe("UNRESOLVED");
  });

  it("creates ordered concrete requirements and projects option IDs", () => {
    const result = resolveCarsDomainFactRequirements(input({ bindings: [
      binding({ bindingSourceOccurrence: 1, relationSourceOccurrence: 1 }),
      binding({
        bindingSourceOccurrence: 0,
        relationSourceOccurrence: 2,
        category: "year",
        predicate: {
          relation: "ORDERED_YEAR_COMPARISON",
          direction: "ON_OR_AFTER",
          operand: 2020,
        },
      }),
    ] }));
    expect(result.status).toBe("RESOLVED");
    expect(result.requirements.map((item) => item.identity.category)).toEqual(["year", "fuel"]);
    expect(result.requirements[0].identity.optionIds).toEqual(["car-a", "car-b"]);
  });

  it("expands ALL_RESOLVED_OPTIONS without reordering", () => {
    const result = resolveCarsDomainFactRequirements(input({
      bindings: [binding({ optionScope: { kind: "ALL_RESOLVED_OPTIONS" } })],
    }));
    expect(result.requirements[0].identity.optionIds).toEqual(["car-a", "car-b", "car-c"]);
  });

  it("keeps valid parent output when another parent is unresolved", () => {
    const twoConditional: CarsSufficiencyPolicy = {
      ...policy,
      requirements: [policy.requirements[1], {
        ...policy.requirements[1],
        requirementId: "material-preferences",
        target: "userContext.preferences",
      }],
    };
    const result = resolveCarsDomainFactRequirements(input({
      policy: twoConditional,
      materialityAssessments: [
        input().materialityAssessments[0],
        { requirementId: "material-preferences", outcome: "UNRESOLVED", supportingCandidateIds: [], limitations: ["unknown"] },
      ],
    }));
    expect(result.status).toBe("UNRESOLVED");
    expect(result.requirements).toHaveLength(1);
  });

  it("preserves policy parent order when multiple parents resolve", () => {
    const secondParent = {
      ...policy.requirements[1],
      requirementId: "material-preferences",
      target: "userContext.preferences" as const,
    };
    const result = resolveCarsDomainFactRequirements(input({
      policy: { ...policy, requirements: [policy.requirements[1], secondParent] },
      materialityAssessments: [
        input().materialityAssessments[0],
        { requirementId: "material-preferences", outcome: "MATERIAL", supportingCandidateIds: ["candidate-1"], limitations: [] },
      ],
      bindings: [
        binding(),
        binding({ parentPolicyRequirementId: "material-preferences", category: "brand" }),
      ],
    }));
    expect(result.requirements.map((item) => item.identity.parentPolicyRequirementId)).toEqual([
      "material-constraints",
      "material-preferences",
    ]);
  });

  const validPredicates: [CarsDomainFactCategory, CarsDomainFactPredicate][] = [
    ["Car.id", { relation: "EXACT_EQUAL", operand: "id" }],
    ["brand", { relation: "EXACT_NOT_EQUAL", operand: "brand" }],
    ["model", { relation: "IN_SET", operand: ["m1", "m2"] }],
    ["fuel", { relation: "NOT_IN_SET", operand: ["gas", "diesel"] }],
    ["transmission", { relation: "RAW_FACT_REQUIRED" }],
    ["bodyType", { relation: "EXACT_EQUAL", operand: "sedan" }],
    ["year", { relation: "ORDERED_YEAR_COMPARISON", direction: "BEFORE", operand: 2025 }],
  ];
  it.each(validPredicates)("accepts %s with its approved predicate", (category, predicate) => {
    expect(resolveCarsDomainFactRequirements(input({ bindings: [binding({ category, predicate })] })).status).toBe("RESOLVED");
  });

  const invalidCases: [string, Partial<CarsDomainFactBinding>, string][] = [
    ["year comparison on string category", { category: "fuel", predicate: { relation: "ORDERED_YEAR_COMPARISON", direction: "AFTER", operand: 2020 } }, "INVALID_CATEGORY_OPERAND"],
    ["fractional year", { category: "year", predicate: { relation: "ORDERED_YEAR_COMPARISON", direction: "AFTER", operand: 2020.5 } }, "INVALID_CATEGORY_OPERAND"],
    ["number for string category", { predicate: { relation: "EXACT_EQUAL", operand: 1 } }, "INVALID_CATEGORY_OPERAND"],
    ["string for year", { category: "year", predicate: { relation: "EXACT_EQUAL", operand: "2020" } }, "INVALID_CATEGORY_OPERAND"],
    ["empty set", { predicate: { relation: "IN_SET", operand: [] } as unknown as CarsDomainFactPredicate }, "EMPTY_SET_OPERAND"],
    ["duplicate set", { predicate: { relation: "IN_SET", operand: ["a", "a"] } }, "DUPLICATE_SET_OPERAND"],
    ["mixed set", { predicate: { relation: "IN_SET", operand: ["a", 1] } }, "MIXED_SET_OPERAND_TYPES"],
    ["raw operand", { predicate: { relation: "RAW_FACT_REQUIRED", operand: "x" } as unknown as CarsDomainFactPredicate }, "INVALID_PREDICATE"],
    ["exact array", { predicate: { relation: "EXACT_EQUAL", operand: ["x"] } as unknown as CarsDomainFactPredicate }, "INVALID_CATEGORY_OPERAND"],
  ];
  it.each(invalidCases)("fails closed for %s", (_name, override, code) => {
    const result = resolveCarsDomainFactRequirements(input({ bindings: [binding(override)] }));
    expect(result.status).toBe("FAILED");
    expect(result.errors.map((item) => item.code)).toContain(code);
    expect(result.requirements).toEqual([]);
  });

  it("canonicalizes set order for identity and distinguishes semantic components", () => {
    const first = resolveCarsDomainFactRequirements(input({ bindings: [binding({ predicate: { relation: "IN_SET", operand: ["b", "a"] } })] }));
    const reordered = resolveCarsDomainFactRequirements(input({ bindings: [binding({ predicate: { relation: "IN_SET", operand: ["a", "b"] } })] }));
    expect(first.requirements[0].id).toBe(reordered.requirements[0].id);
    expect(first.requirements[0].id).toMatch(/^cars-dfr:v1:[a-f0-9]{64}$/);
    const changed = [
      input({ policy: { ...policy, version: "2" } }),
      input({
        policy: {
          ...policy,
          requirements: [policy.requirements[0], { ...policy.requirements[1], requirementId: "other-parent" }],
        },
        materialityAssessments: [{ ...input().materialityAssessments[0], requirementId: "other-parent" }],
        bindings: [binding({ parentPolicyRequirementId: "other-parent" })],
      }),
      input({ bindings: [binding({ category: "brand" })] }),
      input({ bindings: [binding({ predicate: { relation: "EXACT_NOT_EQUAL", operand: "diesel" } })] }),
      input({ bindings: [binding({ predicate: { relation: "EXACT_EQUAL", operand: "gas" } })] }),
      input({ bindings: [binding({ optionScope: { kind: "OPTION_IDS", optionIds: ["car-a"] } })] }),
      input({ bindings: [binding({ contextLineage: [{ ...binding().contextLineage[0], bindingReferenceId: "other" }] })] }),
    ].map((item) => resolveCarsDomainFactRequirements(item).requirements[0].id);
    expect(new Set([first.requirements[0].id, ...changed]).size).toBe(changed.length + 1);

    const propertyReorderedPredicate = {
      operand: "diesel",
      relation: "EXACT_EQUAL",
    } as const;
    expect(resolveCarsDomainFactRequirements(input({
      bindings: [binding({ predicate: propertyReorderedPredicate })],
    })).requirements[0].id).toBe(
      resolveCarsDomainFactRequirements(input()).requirements[0].id,
    );
  });

  it("detects duplicate semantics and injected hash collisions", () => {
    const duplicate = resolveCarsDomainFactRequirements(input({ bindings: [
      binding(), binding({ bindingSourceOccurrence: 1, relationSourceOccurrence: 1 }),
    ] }));
    expect(duplicate.errors.map((item) => item.code)).toContain("DUPLICATE_CONCRETE_REQUIREMENT");
    const fuel = resolveCarsDomainFactRequirements(input()).requirements[0];
    const brand = resolveCarsDomainFactRequirements(input({ bindings: [binding({ category: "brand" })] })).requirements[0];
    const collisionErrors = validateCarsDomainFactRequirementResolution(
      [fuel, { ...brand, id: fuel.id }],
      "material-constraints",
    );
    expect(collisionErrors.map((item) => item.code)).toContain("CONCRETE_REQUIREMENT_ID_COLLISION");
  });

  it("fails closed for material/binding contract defects", () => {
    const cases: [Partial<ResolveCarsDomainFactRequirementsInput>, string][] = [
      [{ bindings: [] }, "MATERIAL_BINDING_MISSING"],
      [{ materialityAssessments: [] }, "MISSING_MATERIALITY_ASSESSMENT"],
      [{ materialityAssessments: [input().materialityAssessments[0], input().materialityAssessments[0]] }, "DUPLICATE_MATERIALITY_ASSESSMENT"],
      [{ bindings: [binding({ bindingSourceOccurrence: -1 })] }, "INVALID_OCCURRENCE"],
      [{ bindings: [binding({ contextLineage: [{ ...binding().contextLineage[0], candidateId: "missing" }] })] }, "UNKNOWN_CONTEXT_LINEAGE"],
      [{ bindings: [binding({ contextLineage: [binding().contextLineage[0], binding().contextLineage[0]] })] }, "DUPLICATE_CONTEXT_LINEAGE"],
      [{ bindings: [binding({ optionScope: { kind: "OPTION_IDS", optionIds: [] } as unknown as CarsDomainFactBinding["optionScope"] })] }, "EMPTY_OPTION_SCOPE"],
      [{ bindings: [binding({ optionScope: { kind: "OPTION_IDS", optionIds: ["car-a", "car-a"] } })] }, "DUPLICATE_OPTION_SCOPE_ID"],
      [{ bindings: [binding({ optionScope: { kind: "OPTION_IDS", optionIds: ["missing"] } })] }, "UNKNOWN_OPTION_SCOPE_ID"],
      [{ bindings: [binding({ parentPolicyRequirementId: "unknown" })] }, "UNKNOWN_PARENT_POLICY_REQUIREMENT"],
    ];
    cases.forEach(([override, code]) => {
      const result = resolveCarsDomainFactRequirements(input(override));
      if (code === "MATERIAL_BINDING_MISSING") {
        expect(result.status).toBe("UNRESOLVED");
        expect(result.requirements).toEqual([]);
      } else {
        expect(result.errors.map((item) => item.code)).toContain(code);
      }
    });
  });

  it("does not mutate inputs and returns fresh deterministic output", () => {
    const value = input();
    const before = structuredClone(value);
    const first = resolveCarsDomainFactRequirements(value);
    const second = resolveCarsDomainFactRequirements(value);
    expect(value).toEqual(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.requirements[0]).not.toBe(second.requirements[0]);
  });
});
