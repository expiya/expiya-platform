import { describe, expect, it } from "vitest";

import type { ContextCandidate } from "@/types/contextCandidate";
import type {
  ContextConfirmationEvidence,
  MaterialityAssessment,
  SufficiencyRequirement,
} from "@/types/contextSufficiency";

import { evaluateSufficiencyRequirement } from "./evaluateSufficiencyRequirement";

function candidate(
  overrides: Partial<ContextCandidate> &
    Pick<ContextCandidate, "id" | "target" | "value">,
): ContextCandidate {
  return {
    provenance: "EXPLICIT_USER",
    source: {
      kind: "USER_INPUT",
      referenceId: `source-${overrides.id}`,
    },
    ...overrides,
  } as ContextCandidate;
}

const requiredNeed: SufficiencyRequirement = {
  requirementId: "fundamental-user-need",
  target: "userContext.needs",
  mode: "REQUIRED",
  acceptedProvenance: ["EXPLICIT_USER", "DERIVED"],
  confirmationRequiredForInference: true,
};

const conditionalPriority: SufficiencyRequirement = {
  requirementId: "material-priorities",
  target: "userContext.priorities",
  mode: "CONDITIONAL",
  acceptedProvenance: ["EXPLICIT_USER", "DERIVED"],
  confirmationRequiredForInference: true,
};

describe("evaluateSufficiencyRequirement", () => {
  it("satisfies a required requirement with accepted explicit evidence", () => {
    const explicit = candidate({
      id: "candidate-1",
      target: "userContext.needs",
      value: "Aile kullanımı",
      provenance: "EXPLICIT_USER",
    });

    expect(
      evaluateSufficiencyRequirement({
        requirement: requiredNeed,
        appliedCandidates: [explicit],
        confirmations: [],
        materialityAssessment: null,
      }),
    ).toEqual({
      requirementId: "fundamental-user-need",
      status: "SATISFIED",
      candidateIds: ["candidate-1"],
      limitations: [],
    });
  });

  it("satisfies a required requirement with accepted derived evidence", () => {
    const derived = candidate({
      id: "candidate-2",
      target: "userContext.needs",
      value: "Aile kullanımı",
      provenance: "DERIVED",
    });

    expect(
      evaluateSufficiencyRequirement({
        requirement: requiredNeed,
        appliedCandidates: [derived],
        confirmations: [],
        materialityAssessment: null,
      }).status,
    ).toBe("SATISFIED");
  });

  it("does not satisfy a required requirement with unconfirmed inferred evidence", () => {
    const inferred = candidate({
      id: "candidate-3",
      target: "userContext.needs",
      value: "Aile kullanımı",
      provenance: "INFERRED",
    });

    expect(
      evaluateSufficiencyRequirement({
        requirement: requiredNeed,
        appliedCandidates: [inferred],
        confirmations: [],
        materialityAssessment: null,
      }),
    ).toEqual({
      requirementId: "fundamental-user-need",
      status: "UNSATISFIED",
      candidateIds: [],
      limitations: [
        "Material inferred context requires explicit user confirmation.",
      ],
    });
  });

  it("accepts confirmed inferred evidence for a confirmation-required requirement", () => {
    const inferred = candidate({
      id: "candidate-4",
      target: "userContext.needs",
      value: "Aile kullanımı",
      provenance: "INFERRED",
    });

    const confirmations: ContextConfirmationEvidence[] = [
      {
        inferredCandidateId: "candidate-4",
        confirmed: true,
        confirmationSource: "EXPLICIT_USER",
      },
    ];

    expect(
      evaluateSufficiencyRequirement({
        requirement: requiredNeed,
        appliedCandidates: [inferred],
        confirmations,
        materialityAssessment: null,
      }),
    ).toEqual({
      requirementId: "fundamental-user-need",
      status: "SATISFIED",
      candidateIds: ["candidate-4"],
      limitations: [],
    });
  });

  it("rejects provenance that is not accepted by the requirement", () => {
    const domain = candidate({
      id: "candidate-5",
      target: "userContext.needs",
      value: "Aile kullanımı",
      provenance: "DOMAIN_SUPPLIED",
      source: {
        kind: "DOMAIN_SOURCE",
        referenceId: "domain-1",
      },
    });

    expect(
      evaluateSufficiencyRequirement({
        requirement: requiredNeed,
        appliedCandidates: [domain],
        confirmations: [],
        materialityAssessment: null,
      }).status,
    ).toBe("UNSATISFIED");
  });

  it("marks a conditional requirement as not required when materiality is NOT_MATERIAL", () => {
    const assessment: MaterialityAssessment = {
      requirementId: "material-priorities",
      outcome: "NOT_MATERIAL",
      supportingCandidateIds: [],
      limitations: [],
    };

    expect(
      evaluateSufficiencyRequirement({
        requirement: conditionalPriority,
        appliedCandidates: [],
        confirmations: [],
        materialityAssessment: assessment,
      }),
    ).toEqual({
      requirementId: "material-priorities",
      status: "NOT_REQUIRED",
      candidateIds: [],
      limitations: [],
    });
  });

  it("requires evidence when a conditional requirement is MATERIAL", () => {
    const assessment: MaterialityAssessment = {
      requirementId: "material-priorities",
      outcome: "MATERIAL",
      supportingCandidateIds: [],
      limitations: [],
    };

    expect(
      evaluateSufficiencyRequirement({
        requirement: conditionalPriority,
        appliedCandidates: [],
        confirmations: [],
        materialityAssessment: assessment,
      }).status,
    ).toBe("UNSATISFIED");
  });

  it("marks a conditional requirement unresolved when materiality is missing", () => {
    expect(
      evaluateSufficiencyRequirement({
        requirement: conditionalPriority,
        appliedCandidates: [],
        confirmations: [],
        materialityAssessment: null,
      }).status,
    ).toBe("UNRESOLVED");
  });

  it("marks a conditional requirement unresolved when materiality is UNRESOLVED", () => {
    const assessment: MaterialityAssessment = {
      requirementId: "material-priorities",
      outcome: "UNRESOLVED",
      supportingCandidateIds: [],
      limitations: ["Priority materiality could not be established."],
    };

    expect(
      evaluateSufficiencyRequirement({
        requirement: conditionalPriority,
        appliedCandidates: [],
        confirmations: [],
        materialityAssessment: assessment,
      }),
    ).toEqual({
      requirementId: "material-priorities",
      status: "UNRESOLVED",
      candidateIds: [],
      limitations: [
        "Priority materiality could not be established.",
      ],
    });
  });

  it("does not satisfy a requirement using a candidate for another target", () => {
    const wrongTarget = candidate({
      id: "candidate-6",
      target: "userContext.preferences",
      value: "Otomatik vites",
      provenance: "EXPLICIT_USER",
    });

    expect(
      evaluateSufficiencyRequirement({
        requirement: requiredNeed,
        appliedCandidates: [wrongTarget],
        confirmations: [],
        materialityAssessment: null,
      }).status,
    ).toBe("UNSATISFIED");
  });
});
