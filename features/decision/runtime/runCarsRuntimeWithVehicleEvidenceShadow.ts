import { candidateComparisonPolicy } from "@/features/decision/context/sufficiency/carsSufficiencyPolicies";
import { evaluateCarsDomainFactRequirement } from "@/features/decision/context/sufficiency/evaluateCarsDomainFactRequirement";
import { generatedVehicleEvidenceReadPort } from "@/features/vehicle-evidence/generatedVehicleEvidenceReadPort";
import { resolveVehicleEvidenceTypeBIdentity } from "@/features/vehicle-evidence/resolveVehicleEvidenceTypeBIdentity";
import type { CarsDomainFactRequirement, CarsDomainFactRequirementResolutionResult } from "@/types/carsDomainFactRequirement";
import type { VehicleEvidenceReadPort } from "@/types/runtimeVehicleEvidence";
import { buildCarsRuntimeEvidenceDependencies } from "./buildCarsRuntimeEvidenceDependencies";
import { runCarsRuntime, type CarsRuntimeInput, type CarsRuntimeResult } from "./runCarsRuntime";

export type VehicleEvidenceShadowAgreement =
  | "LEGACY_CATEGORY_UNSUPPORTED"
  | "IDENTITY_UNRESOLVED"
  | "VEHICLE_EVIDENCE_UNAVAILABLE";

export interface VehicleEvidenceShadowScenarioResult {
  readonly catalogVariantId: string;
  readonly runtimeCandidateId?: string;
  readonly configurationId?: string;
  readonly requestedFactCategory: "seats";
  readonly resolvedFact?: number;
  readonly evidenceState?: "VERIFIED";
  readonly applicability?: "EXACT";
  readonly factId?: string;
  readonly assertionIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly agreement: VehicleEvidenceShadowAgreement;
  readonly sufficiency: "SUFFICIENT" | "INSUFFICIENT" | "UNRESOLVED";
  readonly requirementResult: "SATISFIED" | "DOES_NOT_SATISFY" | "NOT_EVALUABLE";
  readonly limitations: readonly string[];
}

export interface VehicleEvidenceShadowResult {
  readonly mode: "NON_AUTHORITATIVE_SHADOW";
  readonly requirement: { readonly category: "seats"; readonly relation: "AT_LEAST"; readonly operand: number };
  readonly artifactIdentity: ReturnType<VehicleEvidenceReadPort["getArtifactIdentity"]>;
  readonly policy: { readonly id: string; readonly version: string };
  readonly scenarios: readonly VehicleEvidenceShadowScenarioResult[];
  readonly userVisibleBehaviorChanged: false;
}

export interface CarsRuntimeVehicleEvidenceShadowExecution {
  readonly authoritativeResult: CarsRuntimeResult;
  readonly shadow: VehicleEvidenceShadowResult;
}

function requirement(optionId: string, minimumSeats: number): CarsDomainFactRequirement {
  return {
    id: `cars-dfr:v1:shadow:seats:${optionId}`,
    identity: {
      version: "cars-dfr:v1", policyId: candidateComparisonPolicy.policyId,
      policyVersion: candidateComparisonPolicy.version,
      parentPolicyRequirementId: "material-preferences", contextLineage: [],
      optionIds: [optionId], category: "seats",
      predicate: { relation: "ORDERED_NUMERIC_COMPARISON", direction: "AT_LEAST", operand: minimumSeats },
    },
    bindingSourceOccurrence: 0, relationSourceOccurrence: 0,
  };
}

export function verifyVehicleEvidenceSeatsShadow(input: {
  readonly catalogVariantIds: readonly string[];
  readonly minimumSeats: number;
  readonly port?: VehicleEvidenceReadPort;
}): VehicleEvidenceShadowResult {
  const port = input.port ?? generatedVehicleEvidenceReadPort;
  const scenarios = input.catalogVariantIds.map((catalogVariantId): VehicleEvidenceShadowScenarioResult => {
    const identity = resolveVehicleEvidenceTypeBIdentity([catalogVariantId], port);
    if (identity.status === "UNRESOLVED") return {
      catalogVariantId, requestedFactCategory: "seats", assertionIds: [], sourceIds: [],
      agreement: "IDENTITY_UNRESOLVED", sufficiency: "UNRESOLVED",
      requirementResult: "NOT_EVALUABLE", limitations: [identity.reason],
    };
    const runtimeCandidateId = identity.optionIds[0];
    const fact = port.readFact(runtimeCandidateId, "seats");
    const scenarioPort: VehicleEvidenceReadPort = {
      getArtifactIdentity: () => port.getArtifactIdentity(),
      resolveCatalogVariantId: (vehicleVariantId) => port.resolveCatalogVariantId(vehicleVariantId),
      readFact: (candidateId, factKey) =>
        candidateId === runtimeCandidateId && factKey === "seats"
          ? fact
          : port.readFact(candidateId, factKey),
    };
    const factRequirement = requirement(runtimeCandidateId, input.minimumSeats);
    const resolution: CarsDomainFactRequirementResolutionResult = {
      status: "RESOLVED", resolutions: [{
        parentPolicyRequirementId: "material-preferences", status: "RESOLVED", requirements: [factRequirement],
      }], requirements: [factRequirement], limitations: [], errors: [],
    };
    const dependencies = buildCarsRuntimeEvidenceDependencies({
      decisionType: "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
      policy: candidateComparisonPolicy, requirementResolution: resolution,
      vehicleEvidenceReadPort: scenarioPort,
      typeBProduction: {
        candidate: { id: "vehicle-evidence-shadow", target: "evaluationContext.decisionOptions", value: [{ optionId: runtimeCandidateId }], provenance: "EXPLICIT_USER", source: { kind: "USER_INPUT", referenceId: "vehicle-evidence-shadow" } },
        selectionTrace: [{ inputIndex: 0, optionId: runtimeCandidateId, userConfirmationReferenceId: "vehicle-evidence-shadow", domainSourceReferenceId: `runtime-vehicle-candidate:${runtimeCandidateId}` }],
      },
      catalog: { cars: [], sourceId: "legacy-category-unsupported", revision: "shadow", limitations: [] },
    });
    const linkage = dependencies.evidence.status === "AVAILABLE" ? dependencies.evidence.linkage : undefined;
    const assertion = linkage?.ok ? linkage.value.assertions[0] : undefined;
    const evaluation = assertion ? evaluateCarsDomainFactRequirement(factRequirement, assertion) : { status: "UNRESOLVED" as const };
    return {
      catalogVariantId, runtimeCandidateId, configurationId: fact.configurationId,
      requestedFactCategory: "seats", resolvedFact: fact.value,
      evidenceState: fact.evidenceState, applicability: fact.applicability,
      factId: fact.factId, assertionIds: fact.assertionIds, sourceIds: fact.sourceIds,
      agreement: fact.status === "AVAILABLE" ? "LEGACY_CATEGORY_UNSUPPORTED" : "VEHICLE_EVIDENCE_UNAVAILABLE",
      sufficiency: "domainAssessment" in dependencies
        ? dependencies.domainAssessment?.outcome ?? "UNRESOLVED"
        : "UNRESOLVED",
      requirementResult: evaluation.status === "SATISFIED" ? "SATISFIED" : evaluation.status === "NEGATIVE" ? "DOES_NOT_SATISFY" : "NOT_EVALUABLE",
      limitations: fact.limitations,
    };
  });
  return {
    mode: "NON_AUTHORITATIVE_SHADOW",
    requirement: { category: "seats", relation: "AT_LEAST", operand: input.minimumSeats },
    artifactIdentity: port.getArtifactIdentity(),
    policy: { id: candidateComparisonPolicy.policyId, version: candidateComparisonPolicy.version },
    scenarios, userVisibleBehaviorChanged: false,
  };
}

export async function runCarsRuntimeWithVehicleEvidenceShadow(
  input: CarsRuntimeInput,
  shadow: { readonly catalogVariantIds: readonly string[]; readonly minimumSeats: number; readonly port?: VehicleEvidenceReadPort },
): Promise<CarsRuntimeVehicleEvidenceShadowExecution> {
  const authoritativeResult = await runCarsRuntime(input);
  return { authoritativeResult, shadow: verifyVehicleEvidenceSeatsShadow(shadow) };
}
