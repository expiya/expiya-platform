import { describe, expect, it } from "vitest";

import type {
  CarsDomainEvidenceInput,
  CarsDomainEvidenceRecord,
} from "@/types/carsDomainEvidence";

import {
  candidateComparisonPolicy,
  optionDiscoveryRecommendationPolicy,
} from "./carsSufficiencyPolicies";
import { validateCarsDomainEvidenceInput } from "./validateCarsDomainEvidenceInput";

function availableEvidence(
  overrides: Partial<CarsDomainEvidenceRecord> = {},
): CarsDomainEvidenceRecord {
  return {
    evidenceId: "evidence-1",
    optionId: "car-1",
    requirementId: "decision-need",
    availability: "AVAILABLE",
    assertion: "Explicit domain assertion",
    source: {
      sourceId: "source-1",
      reference: "record-1",
    },
    provenance: "AUTHORITATIVE_SOURCE",
    limitations: [],
    conflictReferences: [],
    ...overrides,
  };
}

function discoveryInput(
  overrides: Partial<CarsDomainEvidenceInput> = {},
): CarsDomainEvidenceInput {
  return {
    optionIds: ["car-1"],
    evidence: [availableEvidence()],
    conflicts: [],
    optionMatches: [],
    ...overrides,
  };
}

describe("validateCarsDomainEvidenceInput", () => {
  it("accepts structurally valid explicit evidence", () => {
    const input = discoveryInput();

    expect(
      validateCarsDomainEvidenceInput({
        input,
        policy: optionDiscoveryRecommendationPolicy,
        decisionType:
          "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      }),
    ).toEqual({
      ok: true,
      value: input,
    });
  });

  it("rejects evidence referencing an unknown option", () => {
    const result = validateCarsDomainEvidenceInput({
      input: discoveryInput({
        evidence: [
          availableEvidence({
            optionId: "car-99",
          }),
        ],
      }),
      policy: optionDiscoveryRecommendationPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "UNKNOWN_OPTION_ID",
          referenceId: "evidence-1",
        },
      ],
    });
  });

  it("rejects evidence referencing a requirement outside the selected policy", () => {
    const result = validateCarsDomainEvidenceInput({
      input: discoveryInput({
        evidence: [
          availableEvidence({
            requirementId: "unknown-requirement",
          }),
        ],
      }),
      policy: optionDiscoveryRecommendationPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "UNKNOWN_REQUIREMENT_ID",
          referenceId: "evidence-1",
        },
      ],
    });
  });

  it("requires an assertion for AVAILABLE evidence", () => {
    const result = validateCarsDomainEvidenceInput({
      input: discoveryInput({
        evidence: [
          availableEvidence({
            assertion: undefined,
          }),
        ],
      }),
      policy: optionDiscoveryRecommendationPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "AVAILABLE_ASSERTION_MISSING",
          referenceId: "evidence-1",
        },
      ],
    });
  });

  it("requires source for AVAILABLE evidence", () => {
    const result = validateCarsDomainEvidenceInput({
      input: discoveryInput({
        evidence: [
          availableEvidence({
            source: undefined,
          }),
        ],
      }),
      policy: optionDiscoveryRecommendationPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "AVAILABLE_SOURCE_MISSING",
          referenceId: "evidence-1",
        },
      ],
    });
  });

  it("requires provenance for AVAILABLE evidence", () => {
    const result = validateCarsDomainEvidenceInput({
      input: discoveryInput({
        evidence: [
          availableEvidence({
            provenance: undefined,
          }),
        ],
      }),
      policy: optionDiscoveryRecommendationPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "AVAILABLE_PROVENANCE_MISSING",
          referenceId: "evidence-1",
        },
      ],
    });
  });

  it("allows MISSING evidence without fabricated assertion or source", () => {
    const input = discoveryInput({
      evidence: [
        availableEvidence({
          availability: "MISSING",
          assertion: undefined,
          source: undefined,
          provenance: undefined,
        }),
      ],
    });

    expect(
      validateCarsDomainEvidenceInput({
        input,
        policy: optionDiscoveryRecommendationPolicy,
        decisionType:
          "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      }),
    ).toEqual({
      ok: true,
      value: input,
    });
  });

  it("allows UNRESOLVED evidence without fabricating authority", () => {
    const input = discoveryInput({
      evidence: [
        availableEvidence({
          availability: "UNRESOLVED",
          assertion: undefined,
          source: undefined,
          provenance: undefined,
        }),
      ],
    });

    expect(
      validateCarsDomainEvidenceInput({
        input,
        policy: optionDiscoveryRecommendationPolicy,
        decisionType:
          "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      }),
    ).toEqual({
      ok: true,
      value: input,
    });
  });

  it("rejects duplicate evidence identities", () => {
    const first = availableEvidence();

    const result = validateCarsDomainEvidenceInput({
      input: discoveryInput({
        evidence: [first, { ...first }],
      }),
      policy: optionDiscoveryRecommendationPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "DUPLICATE_EVIDENCE_ID",
        referenceId: "evidence-1",
      });
    }
  });

  it("rejects conflicts referencing unknown evidence", () => {
    const result = validateCarsDomainEvidenceInput({
      input: discoveryInput({
        conflicts: [
          {
            conflictId: "conflict-1",
            optionId: "car-1",
            requirementId: "decision-need",
            evidenceIds: ["evidence-1", "evidence-99"],
            resolutionStatus: "UNRESOLVED",
          },
        ],
      }),
      policy: optionDiscoveryRecommendationPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "UNKNOWN_CONFLICT_EVIDENCE",
        referenceId: "conflict-1",
      });
    }
  });

  it("fails closed for ambiguous Type B option matching", () => {
    const input: CarsDomainEvidenceInput = {
      optionIds: ["car-1", "car-2"],
      evidence: [],
      conflicts: [],
      optionMatches: [
        {
          inputIndex: 0,
          status: "AMBIGUOUS",
          candidateOptionIds: ["car-1", "car-2"],
        },
      ],
    };

    const result = validateCarsDomainEvidenceInput({
      input,
      policy: candidateComparisonPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "TYPE_B_OPTION_AMBIGUOUS",
          referenceId: "0",
        },
      ],
    });
  });

  it("fails closed for unmatched Type B options", () => {
    const input: CarsDomainEvidenceInput = {
      optionIds: ["car-1"],
      evidence: [],
      conflicts: [],
      optionMatches: [
        {
          inputIndex: 0,
          status: "NOT_FOUND",
          candidateOptionIds: [],
        },
      ],
    };

    const result = validateCarsDomainEvidenceInput({
      input,
      policy: candidateComparisonPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "TYPE_B_OPTION_NOT_MATCHED",
          referenceId: "0",
        },
      ],
    });
  });

  it("accepts an exact Type B repository-local match", () => {
    const input: CarsDomainEvidenceInput = {
      optionIds: ["car-1"],
      evidence: [],
      conflicts: [],
      optionMatches: [
        {
          inputIndex: 0,
          status: "MATCHED",
          optionId: "car-1",
          candidateOptionIds: ["car-1"],
        },
      ],
    };

    expect(
      validateCarsDomainEvidenceInput({
        input,
        policy: candidateComparisonPolicy,
        decisionType:
          "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
      }),
    ).toEqual({
      ok: true,
      value: input,
    });
  });
});

describe("validateCarsDomainEvidenceInput cross-integrity", () => {
  it("rejects duplicate option identities", () => {
    const result = validateCarsDomainEvidenceInput({
      input: {
        optionIds: ["car-1", "car-1"],
        evidence: [],
        conflicts: [],
        optionMatches: [],
      },
      policy: optionDiscoveryRecommendationPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "DUPLICATE_OPTION_ID",
        referenceId: "car-1",
      });
    }
  });

  it("rejects conflict evidence belonging to another option", () => {
    const result = validateCarsDomainEvidenceInput({
      input: {
        optionIds: ["car-1", "car-2"],
        evidence: [
          availableEvidence({
            evidenceId: "evidence-1",
            optionId: "car-2",
          }),
        ],
        conflicts: [
          {
            conflictId: "conflict-1",
            optionId: "car-1",
            requirementId: "decision-need",
            evidenceIds: ["evidence-1"],
            resolutionStatus: "UNRESOLVED",
          },
        ],
        optionMatches: [],
      },
      policy: optionDiscoveryRecommendationPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "CONFLICT_OPTION_MISMATCH",
        referenceId: "conflict-1",
      });
    }
  });

  it("rejects conflict evidence belonging to another requirement", () => {
    const result = validateCarsDomainEvidenceInput({
      input: {
        optionIds: ["car-1"],
        evidence: [
          availableEvidence({
            evidenceId: "evidence-1",
            requirementId: "fundamental-user-need",
          }),
        ],
        conflicts: [
          {
            conflictId: "conflict-1",
            optionId: "car-1",
            requirementId: "decision-need",
            evidenceIds: ["evidence-1"],
            resolutionStatus: "UNRESOLVED",
          },
        ],
        optionMatches: [],
      },
      policy: optionDiscoveryRecommendationPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "CONFLICT_REQUIREMENT_MISMATCH",
        referenceId: "conflict-1",
      });
    }
  });

  it("rejects a Type B match whose candidate set contains an unknown option", () => {
    const result = validateCarsDomainEvidenceInput({
      input: {
        optionIds: ["car-1"],
        evidence: [],
        conflicts: [],
        optionMatches: [
          {
            inputIndex: 0,
            status: "MATCHED",
            optionId: "car-1",
            candidateOptionIds: ["car-1", "car-99"],
          },
        ],
      },
      policy: candidateComparisonPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "TYPE_B_UNKNOWN_CANDIDATE_OPTION",
        referenceId: "0",
      });
    }
  });

  it("rejects a Type B MATCHED result that is not a single exact match", () => {
    const result = validateCarsDomainEvidenceInput({
      input: {
        optionIds: ["car-1", "car-2"],
        evidence: [],
        conflicts: [],
        optionMatches: [
          {
            inputIndex: 0,
            status: "MATCHED",
            optionId: "car-1",
            candidateOptionIds: ["car-1", "car-2"],
          },
        ],
      },
      policy: candidateComparisonPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "TYPE_B_MATCH_INCONSISTENT",
        referenceId: "0",
      });
    }
  });

  it("rejects a Type B MATCHED result when optionId differs from the only candidate", () => {
    const result = validateCarsDomainEvidenceInput({
      input: {
        optionIds: ["car-1", "car-2"],
        evidence: [],
        conflicts: [],
        optionMatches: [
          {
            inputIndex: 0,
            status: "MATCHED",
            optionId: "car-1",
            candidateOptionIds: ["car-2"],
          },
        ],
      },
      policy: candidateComparisonPolicy,
      decisionType:
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "TYPE_B_MATCH_INCONSISTENT",
        referenceId: "0",
      });
    }
  });

  it("does not turn Type A candidate identities into evidence automatically", () => {
    const input: CarsDomainEvidenceInput = {
      optionIds: ["car-1", "car-2"],
      evidence: [],
      conflicts: [],
      optionMatches: [],
    };

    expect(
      validateCarsDomainEvidenceInput({
        input,
        policy: optionDiscoveryRecommendationPolicy,
        decisionType:
          "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      }),
    ).toEqual({
      ok: true,
      value: input,
    });
  });
});
