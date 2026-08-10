import { describe, expect, it } from "vitest";

import type {
  CarsDomainEvidenceRecord,
  ValidatedCarsDomainEvidenceInput,
} from "@/types/carsDomainEvidence";
import type {
  MaterialityAssessment,
} from "@/types/contextSufficiency";

import {
  optionDiscoveryRecommendationPolicy,
} from "./carsSufficiencyPolicies";
import { assessCarsDomainSufficiency } from "./assessCarsDomainSufficiency";

function availableEvidence(
  evidenceId: string,
  optionId: string,
  requirementId: string,
): CarsDomainEvidenceRecord {
  return {
    evidenceId,
    optionId,
    requirementId,
    availability: "AVAILABLE",
    assertion: `${optionId}:${requirementId}`,
    source: {
      sourceId: `source-${evidenceId}`,
      reference: `reference-${evidenceId}`,
    },
    provenance: "AUTHORITATIVE_SOURCE",
    limitations: [],
    conflictReferences: [],
  };
}

function nonMaterialConditionalAssessments(): MaterialityAssessment[] {
  return optionDiscoveryRecommendationPolicy.requirements
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
}

function validInput(
  overrides: Partial<ValidatedCarsDomainEvidenceInput> = {},
): ValidatedCarsDomainEvidenceInput {
  return {
    optionIds: ["car-1"],
    evidence: [
      availableEvidence(
        "evidence-1",
        "car-1",
        "decision-need",
      ),
      availableEvidence(
        "evidence-2",
        "car-1",
        "fundamental-user-need",
      ),
    ],
    conflicts: [],
    optionMatches: [],
    ...overrides,
  };
}

describe("assessCarsDomainSufficiency", () => {
  it("returns SUFFICIENT when every applicable requirement has usable evidence", () => {
    const result = assessCarsDomainSufficiency({
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments:
        nonMaterialConditionalAssessments(),
      evidenceInput: validInput(),
    });

    expect(result).toEqual({
      policyId:
        optionDiscoveryRecommendationPolicy.policyId,
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      evaluableOptionIds: ["car-1"],
      outcome: "SUFFICIENT",
      missingDomainRequirements: [],
      evidenceLimitations: [],
      relevantConflicts: [],
    });
  });

  it("returns INSUFFICIENT when an applicable requirement is explicitly MISSING", () => {
    const input = validInput({
      evidence: [
        availableEvidence(
          "evidence-1",
          "car-1",
          "decision-need",
        ),
        {
          evidenceId: "evidence-2",
          optionId: "car-1",
          requirementId: "fundamental-user-need",
          availability: "MISSING",
          limitations: [],
          conflictReferences: [],
        },
      ],
    });

    const result = assessCarsDomainSufficiency({
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments:
        nonMaterialConditionalAssessments(),
      evidenceInput: input,
    });

    expect(result.outcome).toBe("INSUFFICIENT");
    expect(result.evaluableOptionIds).toEqual([]);
    expect(result.missingDomainRequirements).toContain(
      "fundamental-user-need",
    );
  });

  it("returns UNRESOLVED when applicable evidence is UNRESOLVED", () => {
    const input = validInput({
      evidence: [
        availableEvidence(
          "evidence-1",
          "car-1",
          "decision-need",
        ),
        {
          evidenceId: "evidence-2",
          optionId: "car-1",
          requirementId: "fundamental-user-need",
          availability: "UNRESOLVED",
          limitations: [
            "Evidence availability could not be established.",
          ],
          conflictReferences: [],
        },
      ],
    });

    const result = assessCarsDomainSufficiency({
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments:
        nonMaterialConditionalAssessments(),
      evidenceInput: input,
    });

    expect(result.outcome).toBe("UNRESOLVED");
    expect(result.evaluableOptionIds).toEqual([]);
    expect(result.evidenceLimitations).toContain(
      "Evidence availability could not be established.",
    );
  });

  it("does not treat UNKNOWN provenance as sufficient evidence", () => {
    const unknown = availableEvidence(
      "evidence-2",
      "car-1",
      "fundamental-user-need",
    );

    unknown.provenance = "UNKNOWN";

    const result = assessCarsDomainSufficiency({
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments:
        nonMaterialConditionalAssessments(),
      evidenceInput: validInput({
        evidence: [
          availableEvidence(
            "evidence-1",
            "car-1",
            "decision-need",
          ),
          unknown,
        ],
      }),
    });

    expect(result.outcome).toBe("UNRESOLVED");
    expect(result.evaluableOptionIds).toEqual([]);
  });

  it("returns UNRESOLVED when conditional materiality is unresolved", () => {
    const materialityAssessments =
      nonMaterialConditionalAssessments().filter(
        (assessment) =>
          assessment.requirementId !==
          "material-priorities",
      );

    const result = assessCarsDomainSufficiency({
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments,
      evidenceInput: validInput(),
    });

    expect(result.outcome).toBe("UNRESOLVED");
    expect(result.evidenceLimitations).toContain(
      "Materiality unresolved for requirement: material-priorities",
    );
  });

  it("requires evidence for a conditional requirement when it is MATERIAL", () => {
    const materialityAssessments =
      nonMaterialConditionalAssessments().map(
        (assessment) =>
          assessment.requirementId ===
          "material-priorities"
            ? {
                ...assessment,
                outcome: "MATERIAL" as const,
              }
            : assessment,
      );

    const result = assessCarsDomainSufficiency({
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments,
      evidenceInput: validInput(),
    });

    expect(result.outcome).toBe("INSUFFICIENT");
    expect(result.missingDomainRequirements).toContain(
      "material-priorities",
    );
  });

  it("returns UNRESOLVED for an unresolved relevant conflict", () => {
    const input = validInput({
      conflicts: [
        {
          conflictId: "conflict-1",
          optionId: "car-1",
          requirementId: "fundamental-user-need",
          evidenceIds: ["evidence-2"],
          resolutionStatus: "UNRESOLVED",
        },
      ],
    });

    const result = assessCarsDomainSufficiency({
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments:
        nonMaterialConditionalAssessments(),
      evidenceInput: input,
    });

    expect(result.outcome).toBe("UNRESOLVED");
    expect(result.relevantConflicts).toEqual([
      "conflict-1",
    ]);
  });

  it("does not block sufficiency for a resolved conflict by itself", () => {
    const input = validInput({
      conflicts: [
        {
          conflictId: "conflict-1",
          optionId: "car-1",
          requirementId: "fundamental-user-need",
          evidenceIds: ["evidence-2"],
          resolutionStatus: "RESOLVED",
        },
      ],
    });

    const result = assessCarsDomainSufficiency({
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments:
        nonMaterialConditionalAssessments(),
      evidenceInput: input,
    });

    expect(result.outcome).toBe("SUFFICIENT");
    expect(result.relevantConflicts).toEqual([]);
  });

  it("evaluates options independently", () => {
    const result = assessCarsDomainSufficiency({
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments:
        nonMaterialConditionalAssessments(),
      evidenceInput: validInput({
        optionIds: ["car-1", "car-2"],
        evidence: [
          availableEvidence(
            "evidence-1",
            "car-1",
            "decision-need",
          ),
          availableEvidence(
            "evidence-2",
            "car-1",
            "fundamental-user-need",
          ),
          availableEvidence(
            "evidence-3",
            "car-2",
            "decision-need",
          ),
          {
            evidenceId: "evidence-4",
            optionId: "car-2",
            requirementId: "fundamental-user-need",
            availability: "MISSING",
            limitations: [],
            conflictReferences: [],
          },
        ],
      }),
    });

    expect(result.evaluableOptionIds).toEqual([
      "car-1",
    ]);
  });

  it("preserves evidence limitations", () => {
    const first = availableEvidence(
      "evidence-1",
      "car-1",
      "decision-need",
    );

    first.limitations = [
      "Source coverage is bounded.",
    ];

    const result = assessCarsDomainSufficiency({
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments:
        nonMaterialConditionalAssessments(),
      evidenceInput: validInput({
        evidence: [
          first,
          availableEvidence(
            "evidence-2",
            "car-1",
            "fundamental-user-need",
          ),
        ],
      }),
    });

    expect(result.evidenceLimitations).toContain(
      "Source coverage is bounded.",
    );
  });

  it("does not mutate validated evidence input", () => {
    const evidenceInput = validInput();
    const before = structuredClone(evidenceInput);

    assessCarsDomainSufficiency({
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments:
        nonMaterialConditionalAssessments(),
      evidenceInput,
    });

    expect(evidenceInput).toEqual(before);
  });

  it("produces deterministic output for equivalent bounded inputs", () => {
    const request = {
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION" as const,
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments:
        nonMaterialConditionalAssessments(),
      evidenceInput: validInput(),
    };

    expect(
      assessCarsDomainSufficiency(request),
    ).toEqual(
      assessCarsDomainSufficiency(
        structuredClone(request),
      ),
    );
  });
});
