import { describe, expect, it } from "vitest";

import type { ContextCandidate } from "@/types/contextCandidate";
import type {
  ContextSufficiencyInput,
  MaterialityAssessment,
} from "@/types/contextSufficiency";

import {
  candidateComparisonPolicy,
  optionDiscoveryRecommendationPolicy,
} from "./carsSufficiencyPolicies";
import { evaluateContextSufficiency } from "./evaluateContextSufficiency";

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

function nonMaterialAssessments(
  policy = optionDiscoveryRecommendationPolicy,
): MaterialityAssessment[] {
  return policy.requirements
    .filter((requirement) => requirement.mode === "CONDITIONAL")
    .map((requirement) => ({
      requirementId: requirement.requirementId,
      outcome: "NOT_MATERIAL" as const,
      supportingCandidateIds: [],
      limitations: [],
    }));
}

function createReadyDiscoveryInput(): ContextSufficiencyInput {
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

  return {
    populationResult: {
      ok: true,
      context: {
        decisionNeed: "Araba almak istiyorum.",
        userContext: {
          needs: ["Aile kullanımı"],
          priorities: [],
          preferences: [],
          constraints: [],
          usageConditions: [],
        },
        evaluationContext: {
          decisionCriteria: [],
          decisionOptions: undefined,
        },
        domainContext: {
          contextualElements: undefined,
          contextualRelationships: undefined,
        },
      },
      appliedCandidates,
      rejectedCandidates: [],
    },
    classification: {
      status: "CLASSIFIED",
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    },
    policy: optionDiscoveryRecommendationPolicy,
    confirmations: [],
    materialityAssessments: nonMaterialAssessments(),
    domainAssessment: {
      policyId: optionDiscoveryRecommendationPolicy.policyId,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      evaluableOptionIds: ["car-1"],
      outcome: "SUFFICIENT",
      missingDomainRequirements: [],
      evidenceLimitations: [],
      relevantConflicts: [],
    },
    rejectionAssessments: [],
    limitedSupportAssessment: {
      outcome: "NOT_PERMITTED",
      limitations: [],
    },
  };
}

describe("evaluateContextSufficiency", () => {
  it("authorizes the reliable recommendation path when every gate condition is satisfied", () => {
    const result = evaluateContextSufficiency(
      createReadyDiscoveryInput(),
    );

    expect(result.decisionEngineAuthorized).toBe(true);
    expect(result.reliableRecommendationAuthorized).toBe(true);
    expect(result.additionalContextRequired).toBe(false);
    expect(result.unsatisfiedRequirements).toEqual([]);
    expect(result.relevantRejections).toEqual([]);
  });

  it("blocks the Decision Engine when population failed", () => {
    const input = createReadyDiscoveryInput();

    input.populationResult = {
      ok: false,
      appliedCandidates: [],
      rejectedCandidates: [],
    };

    const result = evaluateContextSufficiency(input);

    expect(result.decisionEngineAuthorized).toBe(false);
    expect(result.reliableRecommendationAuthorized).toBe(false);
  });

  it("blocks when decision-type classification is not successful", () => {
    const input = createReadyDiscoveryInput();
    input.classification = {
      status: "AMBIGUOUS",
    };

    const result = evaluateContextSufficiency(input);

    expect(result.decisionEngineAuthorized).toBe(false);
    expect(result.reliableRecommendationAuthorized).toBe(false);
  });

  it("blocks when the selected policy does not match the classified decision type", () => {
    const input = createReadyDiscoveryInput();

    input.policy = candidateComparisonPolicy;

    const result = evaluateContextSufficiency(input);

    expect(result.decisionEngineAuthorized).toBe(false);
    expect(result.reliableRecommendationAuthorized).toBe(false);
  });

  it("blocks when a required policy requirement is unsatisfied", () => {
    const input = createReadyDiscoveryInput();

    if (!input.populationResult.ok) {
      throw new Error("Expected successful population.");
    }

    input.populationResult = {
      ...input.populationResult,
      context: {
        ...input.populationResult.context,
        userContext: {
          ...input.populationResult.context.userContext,
          needs: [],
        },
      },
      appliedCandidates:
        input.populationResult.appliedCandidates.filter(
          (item) => item.target !== "userContext.needs",
        ),
    };

    const result = evaluateContextSufficiency(input);

    expect(result.reliableRecommendationAuthorized).toBe(false);
    expect(result.additionalContextRequired).toBe(true);
    expect(result.unsatisfiedRequirements).toContainEqual({
      requirementId: "fundamental-user-need",
      reason: "Requirement is not satisfied.",
    });
  });

  it("blocks when a conditional requirement remains unresolved", () => {
    const input = createReadyDiscoveryInput();

    input.materialityAssessments =
      input.materialityAssessments.filter(
        (assessment) =>
          assessment.requirementId !== "material-priorities",
      );

    const result = evaluateContextSufficiency(input);

    expect(result.reliableRecommendationAuthorized).toBe(false);
    expect(result.additionalContextRequired).toBe(true);
  });

  it("blocks when domain sufficiency is not SUFFICIENT", () => {
    const input = createReadyDiscoveryInput();

    input.domainAssessment = {
      ...input.domainAssessment,
      outcome: "UNRESOLVED",
      evidenceLimitations: [
        "Domain evidence could not be established.",
      ],
    };

    const result = evaluateContextSufficiency(input);

    expect(result.decisionEngineAuthorized).toBe(false);
    expect(result.reliableRecommendationAuthorized).toBe(false);
    expect(result.limitations).toContain(
      "Domain evidence could not be established.",
    );
  });

  it("blocks on a relevant blocking population rejection and preserves it in the result", () => {
    const input = createReadyDiscoveryInput();

    if (!input.populationResult.ok) {
      throw new Error("Expected successful population.");
    }

    const rejected = candidate({
      id: "candidate-99",
      target: "userContext.constraints",
      value: "Bütçe 1.5 milyon TL",
    });

    input.populationResult = {
      ...input.populationResult,
      rejectedCandidates: [
        {
          candidate: rejected,
          reason: "UNRESOLVED_CONFLICT",
        },
      ],
    };

    input.rejectionAssessments = [
      {
        candidateId: "candidate-99",
        outcome: "BLOCKING",
        affectedRequirementIds: ["material-constraints"],
        limitations: ["Material constraint conflict is unresolved."],
      },
    ];

    const result = evaluateContextSufficiency(input);

    expect(result.reliableRecommendationAuthorized).toBe(false);
    expect(result.relevantRejections).toEqual([
      {
        candidate: rejected,
        reason: "UNRESOLVED_CONFLICT",
      },
    ]);
    expect(result.limitations).toContain(
      "Material constraint conflict is unresolved.",
    );
  });

  it("preserves limited-support permission without authorizing the existing Decision Engine", () => {
    const input = createReadyDiscoveryInput();

    input.domainAssessment = {
      ...input.domainAssessment,
      outcome: "INSUFFICIENT",
      missingDomainRequirements: ["candidate-domain-basis"],
    };

    input.limitedSupportAssessment = {
      outcome: "PERMITTED",
      limitations: [
        "Only bounded option exploration is currently supported.",
      ],
    };

    const result = evaluateContextSufficiency(input);

    expect(result.limitedSupportPermitted).toBe(true);
    expect(result.decisionEngineAuthorized).toBe(false);
    expect(result.reliableRecommendationAuthorized).toBe(false);
  });
});

describe("evaluateContextSufficiency acceptance edges", () => {
  it("blocks candidate comparison when required DecisionOptions are missing", () => {
    const decisionNeed = candidate({
      id: "candidate-200",
      target: "decisionNeed",
      value: "Bu iki araçtan hangisini almalıyım?",
    });

    const userNeed = candidate({
      id: "candidate-201",
      target: "userContext.needs",
      value: "Aile kullanımı",
    });

    const criteria = candidate({
      id: "candidate-202",
      target: "evaluationContext.decisionCriteria",
      value: "Yakıt tüketimi",
    });

    const input: ContextSufficiencyInput = {
      populationResult: {
        ok: true,
        context: {
          decisionNeed: "Bu iki araçtan hangisini almalıyım?",
          userContext: {
            needs: ["Aile kullanımı"],
            priorities: [],
            preferences: [],
            constraints: [],
            usageConditions: [],
          },
          evaluationContext: {
            decisionCriteria: ["Yakıt tüketimi"],
            decisionOptions: undefined,
          },
          domainContext: {
            contextualElements: undefined,
            contextualRelationships: undefined,
          },
        },
        appliedCandidates: [
          decisionNeed,
          userNeed,
          criteria,
        ],
        rejectedCandidates: [],
      },
      classification: {
        status: "CLASSIFIED",
        decisionType:
          "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
      },
      policy: candidateComparisonPolicy,
      confirmations: [],
      materialityAssessments:
        nonMaterialAssessments(candidateComparisonPolicy),
      domainAssessment: {
        policyId: candidateComparisonPolicy.policyId,
        decisionType:
          "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
        evaluableOptionIds: [],
        outcome: "SUFFICIENT",
        missingDomainRequirements: [],
        evidenceLimitations: [],
        relevantConflicts: [],
      },
      rejectionAssessments: [],
      limitedSupportAssessment: {
        outcome: "NOT_PERMITTED",
        limitations: [],
      },
    };

    const result = evaluateContextSufficiency(input);

    expect(result.decisionEngineAuthorized).toBe(false);
    expect(result.reliableRecommendationAuthorized).toBe(false);
    expect(result.additionalContextRequired).toBe(true);

    expect(result.unsatisfiedRequirements).toContainEqual({
      requirementId: "candidate-options",
      reason: "Requirement is not satisfied.",
    });
  });

  it("blocks when domain assessment belongs to another policy", () => {
    const input = createReadyDiscoveryInput();

    input.domainAssessment = {
      ...input.domainAssessment,
      policyId: candidateComparisonPolicy.policyId,
    };

    const result = evaluateContextSufficiency(input);

    expect(result.decisionEngineAuthorized).toBe(false);
    expect(result.reliableRecommendationAuthorized).toBe(false);
    expect(result.limitations).toContain(
      "Domain sufficiency assessment does not match the selected policy.",
    );
  });

  it("blocks when rejection relevance is unresolved", () => {
    const input = createReadyDiscoveryInput();

    if (!input.populationResult.ok) {
      throw new Error("Expected successful population.");
    }

    const rejected = candidate({
      id: "candidate-203",
      target: "userContext.priorities",
      value: "Güvenlik",
    });

    input.populationResult = {
      ...input.populationResult,
      rejectedCandidates: [
        {
          candidate: rejected,
          reason: "UNRESOLVED_CONFLICT",
        },
      ],
    };

    input.rejectionAssessments = [
      {
        candidateId: "candidate-203",
        outcome: "UNRESOLVED",
        affectedRequirementIds: ["material-priorities"],
        limitations: [
          "Rejection relevance could not be resolved.",
        ],
      },
    ];

    const result = evaluateContextSufficiency(input);

    expect(result.decisionEngineAuthorized).toBe(false);
    expect(result.reliableRecommendationAuthorized).toBe(false);

    expect(result.relevantRejections).toContainEqual({
      candidate: rejected,
      reason: "UNRESOLVED_CONFLICT",
    });

    expect(result.limitations).toContain(
      "Rejection relevance could not be resolved.",
    );
  });

  it("blocks a material user requirement supported only by unconfirmed inference", () => {
    const input = createReadyDiscoveryInput();

    if (!input.populationResult.ok) {
      throw new Error("Expected successful population.");
    }

    const inferredPriority = candidate({
      id: "candidate-204",
      target: "userContext.priorities",
      value: "Güvenlik",
      provenance: "INFERRED",
    });

    input.populationResult = {
      ...input.populationResult,
      context: {
        ...input.populationResult.context,
        userContext: {
          ...input.populationResult.context.userContext,
          priorities: ["Güvenlik"],
        },
      },
      appliedCandidates: [
        ...input.populationResult.appliedCandidates,
        inferredPriority,
      ],
    };

    input.materialityAssessments =
      input.materialityAssessments.map(
        (assessment) =>
          assessment.requirementId === "material-priorities"
            ? {
                ...assessment,
                outcome: "MATERIAL" as const,
                supportingCandidateIds: ["candidate-204"],
              }
            : assessment,
      );

    const result = evaluateContextSufficiency(input);

    expect(result.decisionEngineAuthorized).toBe(false);
    expect(result.reliableRecommendationAuthorized).toBe(false);
    expect(result.additionalContextRequired).toBe(true);

    expect(result.unsatisfiedRequirements).toContainEqual({
      requirementId: "material-priorities",
      reason:
        "Material inferred context requires explicit user confirmation.",
    });
  });

  it("does not let unresolved limited-support assessment authorize the Decision Engine", () => {
    const input = createReadyDiscoveryInput();

    input.domainAssessment = {
      ...input.domainAssessment,
      outcome: "INSUFFICIENT",
    };

    input.limitedSupportAssessment = {
      outcome: "UNRESOLVED",
      limitations: [
        "Limited-support eligibility could not be determined.",
      ],
    };

    const result = evaluateContextSufficiency(input);

    expect(result.limitedSupportPermitted).toBe(false);
    expect(result.decisionEngineAuthorized).toBe(false);
    expect(result.reliableRecommendationAuthorized).toBe(false);
  });
});
