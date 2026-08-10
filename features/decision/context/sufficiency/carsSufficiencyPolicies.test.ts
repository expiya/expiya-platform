import { describe, expect, it } from "vitest";

import {
  CANDIDATE_COMPARISON_POLICY_ID,
  CARS_SUFFICIENCY_POLICY_VERSION,
  OPTION_DISCOVERY_POLICY_ID,
  candidateComparisonPolicy,
  carsSufficiencyPolicies,
  optionDiscoveryRecommendationPolicy,
} from "./carsSufficiencyPolicies";

describe("carsSufficiencyPolicies", () => {
  it("contains exactly the two approved Cars decision types", () => {
    expect(Object.keys(carsSufficiencyPolicies).sort()).toEqual([
      "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
      "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    ]);
  });

  it("keeps the approved policies explicitly versioned", () => {
    expect(CARS_SUFFICIENCY_POLICY_VERSION).toBe("1");

    expect(optionDiscoveryRecommendationPolicy).toMatchObject({
      policyId: OPTION_DISCOVERY_POLICY_ID,
      version: "1",
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });

    expect(candidateComparisonPolicy).toMatchObject({
      policyId: CANDIDATE_COMPARISON_POLICY_ID,
      version: "1",
      decisionType:
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
    });
  });

  it("does not require user-provided DecisionOptions for option discovery", () => {
    expect(
      optionDiscoveryRecommendationPolicy.decisionOptionsRule,
    ).toBe("USER_PROVIDED_NOT_REQUIRED");

    expect(
      optionDiscoveryRecommendationPolicy.requirements.some(
        (requirement) =>
          requirement.target ===
          "evaluationContext.decisionOptions",
      ),
    ).toBe(false);
  });

  it("requires DecisionOptions for candidate comparison", () => {
    expect(candidateComparisonPolicy.decisionOptionsRule).toBe(
      "REQUIRED",
    );

    expect(
      candidateComparisonPolicy.requirements,
    ).toContainEqual(
      expect.objectContaining({
        requirementId: "candidate-options",
        target: "evaluationContext.decisionOptions",
        mode: "REQUIRED",
      }),
    );
  });

  it("requires decision need and fundamental user need in both policies", () => {
    for (const policy of [
      optionDiscoveryRecommendationPolicy,
      candidateComparisonPolicy,
    ]) {
      expect(policy.requirements).toContainEqual(
        expect.objectContaining({
          requirementId: "decision-need",
          target: "decisionNeed",
          mode: "REQUIRED",
        }),
      );

      expect(policy.requirements).toContainEqual(
        expect.objectContaining({
          requirementId: "fundamental-user-need",
          target: "userContext.needs",
          mode: "REQUIRED",
        }),
      );
    }
  });

  it("keeps materially dependent user context conditional", () => {
    const conditionalTargets = [
      "userContext.priorities",
      "userContext.constraints",
      "userContext.usageConditions",
      "userContext.preferences",
    ];

    for (const policy of [
      optionDiscoveryRecommendationPolicy,
      candidateComparisonPolicy,
    ]) {
      for (const target of conditionalTargets) {
        expect(
          policy.requirements.find(
            (requirement) => requirement.target === target,
          )?.mode,
        ).toBe("CONDITIONAL");
      }
    }
  });

  it("does not treat inferred user context as directly accepted provenance", () => {
    const userTargets = [
      "decisionNeed",
      "userContext.needs",
      "userContext.priorities",
      "userContext.preferences",
      "userContext.constraints",
      "userContext.usageConditions",
    ];

    for (const policy of [
      optionDiscoveryRecommendationPolicy,
      candidateComparisonPolicy,
    ]) {
      for (const requirement of policy.requirements) {
        if (!userTargets.includes(requirement.target)) {
          continue;
        }

        expect(
          requirement.acceptedProvenance,
        ).not.toContain("INFERRED");
      }
    }
  });

  it("does not allow domain-supplied provenance to replace personal user context", () => {
    const personalUserTargets = [
      "decisionNeed",
      "userContext.needs",
      "userContext.priorities",
      "userContext.preferences",
      "userContext.constraints",
      "userContext.usageConditions",
    ];

    for (const policy of [
      optionDiscoveryRecommendationPolicy,
      candidateComparisonPolicy,
    ]) {
      for (const requirement of policy.requirements) {
        if (!personalUserTargets.includes(requirement.target)) {
          continue;
        }

        expect(
          requirement.acceptedProvenance,
        ).not.toContain("DOMAIN_SUPPLIED");
      }
    }
  });

  it("permits domain-supplied context only where the policy allows domain contribution", () => {
    const discoveryCriteria =
      optionDiscoveryRecommendationPolicy.requirements.find(
        (requirement) =>
          requirement.target ===
          "evaluationContext.decisionCriteria",
      );

    const comparisonCriteria =
      candidateComparisonPolicy.requirements.find(
        (requirement) =>
          requirement.target ===
          "evaluationContext.decisionCriteria",
      );

    const comparisonOptions =
      candidateComparisonPolicy.requirements.find(
        (requirement) =>
          requirement.target ===
          "evaluationContext.decisionOptions",
      );

    expect(
      discoveryCriteria?.acceptedProvenance,
    ).toContain("DOMAIN_SUPPLIED");

    expect(
      comparisonCriteria?.acceptedProvenance,
    ).toContain("DOMAIN_SUPPLIED");

    expect(
      comparisonOptions?.acceptedProvenance,
    ).toContain("DOMAIN_SUPPLIED");
  });
});
