import { describe, expect, it } from "vitest";

import { optionDiscoveryRecommendationPolicy } from "@/features/decision/context/sufficiency/carsSufficiencyPolicies";
import type { CarsDomainFactRequirementResolutionResult } from "@/types/carsDomainFactRequirement";

import { buildCarsRuntimeEvidenceDependencies } from "./buildCarsRuntimeEvidenceDependencies";

const requirementResolution: CarsDomainFactRequirementResolutionResult = {
  status: "RESOLVED",
  resolutions: [],
  requirements: [],
  limitations: [],
  errors: [],
};

describe("buildCarsRuntimeEvidenceDependencies", () => {
  it("provides validated authoritative zero-requirement evidence", () => {
    const result = buildCarsRuntimeEvidenceDependencies({
      decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      requirementResolution,
    });

    expect(result.evidence.status).toBe("AVAILABLE");
    expect(result).toMatchObject({
      evidence: { status: "AVAILABLE", linkage: { ok: true } },
      domainAssessment: { outcome: "SUFFICIENT" },
    });
  });

  it("creates authoritative catalog assertions for concrete requirements", () => {
    const requirement = {
      id: "cars-dfr:v1:test",
      identity: {
        version: "cars-dfr:v1" as const,
        policyId: optionDiscoveryRecommendationPolicy.policyId,
        policyVersion: optionDiscoveryRecommendationPolicy.version,
        parentPolicyRequirementId: "material-preferences",
        contextLineage: [],
        optionIds: ["1"],
        category: "fuel" as const,
        predicate: { relation: "RAW_FACT_REQUIRED" as const },
      },
      bindingSourceOccurrence: 0,
      relationSourceOccurrence: 0,
    };
    const resolution: CarsDomainFactRequirementResolutionResult = {
      status: "RESOLVED",
      resolutions: [{
        parentPolicyRequirementId: "material-preferences",
        status: "RESOLVED",
        requirements: [requirement],
      }],
      requirements: [requirement],
      limitations: [],
      errors: [],
    };
    const result = buildCarsRuntimeEvidenceDependencies({
      decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      requirementResolution: resolution,
    });

    expect(result).toMatchObject({
      evidence: {
        status: "AVAILABLE",
        linkage: {
          ok: true,
          value: {
            assertions: [{
              optionId: "1",
              category: "fuel",
              availability: "AVAILABLE",
              assertion: "Gasoline",
              provenance: "AUTHORITATIVE_SOURCE",
              limitations: [
                "catalog-only",
                "v0.1-authoritative-evidence-source",
              ],
            }],
          },
        },
      },
      domainAssessment: { outcome: "SUFFICIENT" },
    });
  });

  it("does not turn failed or unresolved requirements into evidence", () => {
    expect(buildCarsRuntimeEvidenceDependencies({
      decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      policy: optionDiscoveryRecommendationPolicy,
      requirementResolution: {
        ...requirementResolution,
        status: "UNRESOLVED",
      },
    })).toEqual({ evidence: { status: "UNAVAILABLE" } });
  });
});
