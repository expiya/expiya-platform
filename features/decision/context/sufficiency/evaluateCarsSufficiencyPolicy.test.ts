import { describe, expect, it } from "vitest";

import type { ContextCandidate } from "@/types/contextCandidate";
import type {
  ContextConfirmationEvidence,
  MaterialityAssessment,
} from "@/types/contextSufficiency";

import {
  candidateComparisonPolicy,
  optionDiscoveryRecommendationPolicy,
} from "./carsSufficiencyPolicies";
import { evaluateCarsSufficiencyPolicy } from "./evaluateCarsSufficiencyPolicy";

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

describe("evaluateCarsSufficiencyPolicy", () => {
  it("aggregates satisfied required requirements", () => {
    const appliedCandidates: ContextCandidate[] = [
      candidate({
        id: "candidate-1",
        target: "decisionNeed",
        value: "Araba almak istiyorum.",
      }),
      candidate({
        id: "candidate-2",
        target: "userContext.needs",
        value: "Aile kullanımı",
      }),
    ];

    const materialityAssessments: MaterialityAssessment[] = [
      {
        requirementId: "material-priorities",
        outcome: "NOT_MATERIAL",
        supportingCandidateIds: [],
        limitations: [],
      },
      {
        requirementId: "material-constraints",
        outcome: "NOT_MATERIAL",
        supportingCandidateIds: [],
        limitations: [],
      },
      {
        requirementId: "material-usage-conditions",
        outcome: "NOT_MATERIAL",
        supportingCandidateIds: [],
        limitations: [],
      },
      {
        requirementId: "material-decision-criteria",
        outcome: "NOT_MATERIAL",
        supportingCandidateIds: [],
        limitations: [],
      },
      {
        requirementId: "material-preferences",
        outcome: "NOT_MATERIAL",
        supportingCandidateIds: [],
        limitations: [],
      },
    ];

    const result = evaluateCarsSufficiencyPolicy({
      policy: optionDiscoveryRecommendationPolicy,
      appliedCandidates,
      confirmations: [],
      materialityAssessments,
    });

    expect(result.unsatisfiedRequirements).toEqual([]);
    expect(result.unresolvedRequirementIds).toEqual([]);

    expect(result.satisfiedRequirements).toContainEqual({
      requirementId: "decision-need",
      candidateIds: ["candidate-1"],
    });

    expect(result.satisfiedRequirements).toContainEqual({
      requirementId: "fundamental-user-need",
      candidateIds: ["candidate-2"],
    });
  });

  it("collects unsatisfied required requirements", () => {
    const result = evaluateCarsSufficiencyPolicy({
      policy: optionDiscoveryRecommendationPolicy,
      appliedCandidates: [],
      confirmations: [],
      materialityAssessments: [],
    });

    expect(result.unsatisfiedRequirements).toContainEqual({
      requirementId: "decision-need",
      reason: "Requirement is not satisfied.",
    });

    expect(result.unsatisfiedRequirements).toContainEqual({
      requirementId: "fundamental-user-need",
      reason: "Requirement is not satisfied.",
    });
  });

  it("collects unresolved conditional requirements separately", () => {
    const appliedCandidates: ContextCandidate[] = [
      candidate({
        id: "candidate-3",
        target: "decisionNeed",
        value: "Araba almak istiyorum.",
      }),
      candidate({
        id: "candidate-4",
        target: "userContext.needs",
        value: "Aile kullanımı",
      }),
    ];

    const result = evaluateCarsSufficiencyPolicy({
      policy: optionDiscoveryRecommendationPolicy,
      appliedCandidates,
      confirmations: [],
      materialityAssessments: [],
    });

    expect(result.unresolvedRequirementIds).toEqual([
      "material-priorities",
      "material-constraints",
      "material-usage-conditions",
      "material-decision-criteria",
      "material-preferences",
    ]);
  });

  it("does not include NOT_REQUIRED conditional requirements as unsatisfied", () => {
    const appliedCandidates: ContextCandidate[] = [
      candidate({
        id: "candidate-5",
        target: "decisionNeed",
        value: "Araba almak istiyorum.",
      }),
      candidate({
        id: "candidate-6",
        target: "userContext.needs",
        value: "Aile kullanımı",
      }),
    ];

    const materialityAssessments: MaterialityAssessment[] =
      optionDiscoveryRecommendationPolicy.requirements
        .filter(
          (requirement) =>
            requirement.mode === "CONDITIONAL",
        )
        .map((requirement) => ({
          requirementId: requirement.requirementId,
          outcome: "NOT_MATERIAL" as const,
          supportingCandidateIds: [],
          limitations: [],
        }));

    const result = evaluateCarsSufficiencyPolicy({
      policy: optionDiscoveryRecommendationPolicy,
      appliedCandidates,
      confirmations: [],
      materialityAssessments,
    });

    expect(result.unsatisfiedRequirements).toEqual([]);
    expect(result.unresolvedRequirementIds).toEqual([]);
  });

  it("requires candidate options for the comparison policy", () => {
    const appliedCandidates: ContextCandidate[] = [
      candidate({
        id: "candidate-7",
        target: "decisionNeed",
        value: "Bu iki araçtan hangisini almalıyım?",
      }),
      candidate({
        id: "candidate-8",
        target: "userContext.needs",
        value: "Aile kullanımı",
      }),
      candidate({
        id: "candidate-9",
        target: "evaluationContext.decisionCriteria",
        value: "Yakıt tüketimi",
      }),
    ];

    const materialityAssessments: MaterialityAssessment[] =
      candidateComparisonPolicy.requirements
        .filter(
          (requirement) =>
            requirement.mode === "CONDITIONAL",
        )
        .map((requirement) => ({
          requirementId: requirement.requirementId,
          outcome: "NOT_MATERIAL" as const,
          supportingCandidateIds: [],
          limitations: [],
        }));

    const result = evaluateCarsSufficiencyPolicy({
      policy: candidateComparisonPolicy,
      appliedCandidates,
      confirmations: [],
      materialityAssessments,
    });

    expect(result.unsatisfiedRequirements).toContainEqual({
      requirementId: "candidate-options",
      reason: "Requirement is not satisfied.",
    });
  });

  it("preserves confirmed inferred evidence in the satisfied aggregate", () => {
    const inferredNeed = candidate({
      id: "candidate-10",
      target: "userContext.needs",
      value: "Aile kullanımı",
      provenance: "INFERRED",
    });

    const confirmations: ContextConfirmationEvidence[] = [
      {
        inferredCandidateId: "candidate-10",
        confirmed: true,
        confirmationSource: "EXPLICIT_USER",
      },
    ];

    const appliedCandidates: ContextCandidate[] = [
      candidate({
        id: "candidate-11",
        target: "decisionNeed",
        value: "Araba almak istiyorum.",
      }),
      inferredNeed,
    ];

    const materialityAssessments: MaterialityAssessment[] =
      optionDiscoveryRecommendationPolicy.requirements
        .filter(
          (requirement) =>
            requirement.mode === "CONDITIONAL",
        )
        .map((requirement) => ({
          requirementId: requirement.requirementId,
          outcome: "NOT_MATERIAL" as const,
          supportingCandidateIds: [],
          limitations: [],
        }));

    const result = evaluateCarsSufficiencyPolicy({
      policy: optionDiscoveryRecommendationPolicy,
      appliedCandidates,
      confirmations,
      materialityAssessments,
    });

    expect(result.satisfiedRequirements).toContainEqual({
      requirementId: "fundamental-user-need",
      candidateIds: ["candidate-10"],
    });
  });
});
