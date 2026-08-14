import { describe, expect, it } from "vitest";

import { candidateComparisonPolicy, optionDiscoveryRecommendationPolicy } from "@/features/decision/context/sufficiency/carsSufficiencyPolicies";
import type { CarsDomainFactRequirementResolutionResult } from "@/types/carsDomainFactRequirement";

import { buildCarsRuntimeEvidenceDependencies } from "./buildCarsRuntimeEvidenceDependencies";
import { generatedVehicleEvidenceReadPort } from "@/features/vehicle-evidence/generatedVehicleEvidenceReadPort";
import { evaluateCarsDomainFactRequirement } from "@/features/decision/context/sufficiency/evaluateCarsDomainFactRequirement";

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
                "test-fixture-only",
                "not-production-evidence",
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

  it("uses production UUIDs and source lineage when a database catalog is supplied", () => {
    const productionCar = {
      id: "db-corolla", brand: "Toyota", model: "Corolla", year: 2026, price: 1_850_000,
      km: 0, fuel: "Gasoline" as const, transmission: "Automatic" as const,
      bodyType: "Sedan" as const, image: "/cars/production-placeholder.svg",
      createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-14T00:00:00.000Z",
    };
    const result = buildCarsRuntimeEvidenceDependencies({
      decisionType: "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
      policy: candidateComparisonPolicy,
      requirementResolution,
      typeBProduction: {
        candidate: {
          id: "candidate", target: "evaluationContext.decisionOptions",
          value: [{ optionId: productionCar.id }], provenance: "EXPLICIT_USER",
          source: { kind: "USER_INPUT", referenceId: "request" },
        },
        selectionTrace: [{
          inputIndex: 0, optionId: productionCar.id, userConfirmationReferenceId: "request",
          domainSourceReferenceId: `postgres:vehicle-read-model#${productionCar.id}`,
        }],
      },
      catalog: {
        cars: [productionCar], sourceId: "postgres:vehicle-read-model",
        revision: "2026-08-14T00:00:00.000Z", limitations: [],
      },
    });
    expect(result).toMatchObject({
      evidence: { status: "AVAILABLE", linkage: { ok: true, value: { optionIds: ["db-corolla"] } } },
    });
  });

  it("uses VehicleEvidenceReadPort as the sole authority for migrated seats", () => {
    const requirement = {
      id: "cars-dfr:v1:seats",
      identity: {
        version: "cars-dfr:v1" as const,
        policyId: candidateComparisonPolicy.policyId,
        policyVersion: candidateComparisonPolicy.version,
        parentPolicyRequirementId: "material-preferences",
        contextLineage: [],
        optionIds: ["RVC-PILOT-0001"],
        category: "seats" as const,
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
      requirements: [requirement], limitations: [], errors: [],
    };
    const result = buildCarsRuntimeEvidenceDependencies({
      decisionType: "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
      policy: candidateComparisonPolicy,
      requirementResolution: resolution,
      vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort,
      typeBProduction: {
        candidate: {
          id: "candidate", target: "evaluationContext.decisionOptions",
          value: [{ optionId: "RVC-PILOT-0001" }], provenance: "EXPLICIT_USER",
          source: { kind: "USER_INPUT", referenceId: "request" },
        },
        selectionTrace: [{
          inputIndex: 0, optionId: "RVC-PILOT-0001",
          userConfirmationReferenceId: "request",
          domainSourceReferenceId: "runtime-vehicle-candidate:RVC-PILOT-0001",
        }],
      },
      catalog: { cars: [], sourceId: "unused", revision: "unused", limitations: [] },
    });

    expect(result).toMatchObject({
      evidence: { status: "AVAILABLE", linkage: { ok: true, value: {
        optionIds: ["RVC-PILOT-0001"],
        assertions: [{
          category: "seats", assertion: 7, provenance: "AUTHORITATIVE_SOURCE",
              source: { sourceId: "SRC-000050", reference: "0.3.0#AST-000332" },
        }],
      } } },
      domainAssessment: { outcome: "SUFFICIENT", evaluableOptionIds: ["RVC-PILOT-0001"] },
    });
  });

  it("runs real combined seats and cargo evidence through linkage and evaluation", () => {
    const requirements = ([
      ["seats", 5], ["cargo_volume_l", 350],
    ] as const).map(([category, operand]) => ({
      id: `cars-dfr:v1:${category}`,
      identity: {
        version: "cars-dfr:v1" as const, policyId: candidateComparisonPolicy.policyId,
        policyVersion: candidateComparisonPolicy.version, parentPolicyRequirementId: "material-preferences",
        contextLineage: [], optionIds: ["RVC-PILOT-0003"], category,
        predicate: { relation: "ORDERED_NUMERIC_COMPARISON" as const, direction: "AT_LEAST" as const, operand },
      }, bindingSourceOccurrence: 0, relationSourceOccurrence: 0,
    }));
    const resolution: CarsDomainFactRequirementResolutionResult = {
      status: "RESOLVED", resolutions: [{ parentPolicyRequirementId: "material-preferences", status: "RESOLVED", requirements }],
      requirements, limitations: [], errors: [],
    };
    const result = buildCarsRuntimeEvidenceDependencies({
      decisionType: "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON", policy: candidateComparisonPolicy,
      requirementResolution: resolution, vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort,
      typeBProduction: {
        candidate: { id: "combined", target: "evaluationContext.decisionOptions", value: [{ optionId: "RVC-PILOT-0003" }], provenance: "EXPLICIT_USER", source: { kind: "USER_INPUT", referenceId: "combined" } },
        selectionTrace: [{ inputIndex: 0, optionId: "RVC-PILOT-0003", userConfirmationReferenceId: "combined", domainSourceReferenceId: "runtime-vehicle-candidate:RVC-PILOT-0003" }],
      }, catalog: { cars: [], sourceId: "unused", revision: "unused", limitations: [] },
    });
    expect(result.evidence.status).toBe("AVAILABLE");
    const linkage = result.evidence.status === "AVAILABLE" ? result.evidence.linkage : undefined;
    expect(linkage?.ok).toBe(true);
    if (!linkage?.ok) return;
    expect(requirements.map((requirement) => evaluateCarsDomainFactRequirement(
      requirement, linkage.value.assertions.find((assertion) => assertion.category === requirement.identity.category)!,
    ).status)).toEqual(["SATISFIED", "SATISFIED"]);
  });
});
