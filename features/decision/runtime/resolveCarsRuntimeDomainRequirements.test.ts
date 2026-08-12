import { describe, expect, it } from "vitest";

import {
  candidateComparisonPolicy,
  optionDiscoveryRecommendationPolicy,
} from "@/features/decision/context/sufficiency/carsSufficiencyPolicies";
import type { PopulationResult } from "@/types/contextPopulation";

import { resolveCarsRuntimeDomainRequirements } from "./resolveCarsRuntimeDomainRequirements";

const decisionNeedCandidate = {
  id: "decision-need",
  target: "decisionNeed",
  value: "request",
  provenance: "EXPLICIT_USER",
  source: { kind: "USER_INPUT", referenceId: "request-1" },
} as const;
const populationResult: PopulationResult = {
  ok: true,
  context: {
    decisionNeed: "request",
    userContext: {
      needs: [], priorities: [], preferences: [], constraints: [], usageConditions: [],
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
  appliedCandidates: [decisionNeedCandidate],
  rejectedCandidates: [],
};

function assessments(policy: typeof optionDiscoveryRecommendationPolicy) {
  return policy.requirements.map((requirement) => ({
    requirementId: requirement.requirementId,
    outcome: requirement.mode === "REQUIRED"
      ? "MATERIAL" as const
      : "NOT_MATERIAL" as const,
    supportingCandidateIds: [],
    limitations: [],
  }));
}

describe("resolveCarsRuntimeDomainRequirements", () => {
  it("resolves context-only discovery requirements without fabricated bindings", () => {
    const result = resolveCarsRuntimeDomainRequirements({
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments: assessments(optionDiscoveryRecommendationPolicy),
      populationResult,
    });

    expect(result?.status).toBe("RESOLVED");
    expect(result?.requirements).toEqual([]);
  });

  it("resolves Type B candidate identity through canonical coverage", () => {
    const candidate = {
      id: "canonical-options",
      target: "evaluationContext.decisionOptions",
      value: [{ optionId: "1" }, { optionId: "2" }],
      provenance: "EXPLICIT_USER",
      source: { kind: "USER_INPUT", referenceId: "request-1" },
    } as const;
    const result = resolveCarsRuntimeDomainRequirements({
      policy: candidateComparisonPolicy,
      materialityAssessments: assessments(candidateComparisonPolicy),
      populationResult: {
        ...populationResult,
        appliedCandidates: [decisionNeedCandidate, candidate],
      },
      typeBProduction: {
        candidate,
        selectionTrace: [
          {
            inputIndex: 0,
            optionId: "1",
            userConfirmationReferenceId: "request-1",
            domainSourceReferenceId: "repo:data/car.ts#1",
          },
          {
            inputIndex: 1,
            optionId: "2",
            userConfirmationReferenceId: "request-1",
            domainSourceReferenceId: "repo:data/car.ts#2",
          },
        ],
      },
    });

    expect(result?.status).toBe("RESOLVED");
    expect(result?.resolutions).toContainEqual(expect.objectContaining({
      parentPolicyRequirementId: "candidate-options",
      status: "RESOLVED",
      reason: "CANDIDATE_IDENTITY_COVERED",
    }));
  });

  it("remains unresolved when a material conditional has no matching context", () => {
    const materialityAssessments = assessments(
      optionDiscoveryRecommendationPolicy,
    ).map((item) => item.requirementId === "material-constraints"
      ? { ...item, outcome: "MATERIAL" as const }
      : item);

    expect(resolveCarsRuntimeDomainRequirements({
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments,
      populationResult: { ...populationResult, appliedCandidates: [] },
    })?.status).toBe("UNRESOLVED");
  });

  it("binds explicit material context to authoritative catalog availability", () => {
    const constraint = {
      id: "constraint-1",
      target: "userContext.constraints",
      value: "automatic transmission",
      provenance: "EXPLICIT_USER",
      source: { kind: "USER_INPUT", referenceId: "request-1" },
    } as const;
    const materialityAssessments = assessments(
      optionDiscoveryRecommendationPolicy,
    ).map((item) => item.requirementId === "material-constraints"
      ? { ...item, outcome: "MATERIAL" as const }
      : item);

    const result = resolveCarsRuntimeDomainRequirements({
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments,
      populationResult: {
        ...populationResult,
        appliedCandidates: [decisionNeedCandidate, constraint],
      },
    });

    expect(result?.status).toBe("RESOLVED");
    expect(result?.requirements).toEqual([
      expect.objectContaining({
        identity: expect.objectContaining({
          parentPolicyRequirementId: "material-constraints",
          category: "Car.id",
          predicate: { relation: "RAW_FACT_REQUIRED" },
        }),
      }),
    ]);
  });

  it("uses the explicit decision request as lineage when extraction chooses another target", () => {
    const materialityAssessments = assessments(
      optionDiscoveryRecommendationPolicy,
    ).map((item) => item.requirementId === "material-priorities"
      ? { ...item, outcome: "MATERIAL" as const }
      : item);

    const result = resolveCarsRuntimeDomainRequirements({
      policy: optionDiscoveryRecommendationPolicy,
      materialityAssessments,
      populationResult,
    });

    expect(result?.status).toBe("RESOLVED");
    expect(result?.requirements[0]?.identity.contextLineage[0]?.candidateId)
      .toBe("decision-need");
  });
});
