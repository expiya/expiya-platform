import { candidateComparisonPolicy } from "@/features/decision/context/sufficiency/carsSufficiencyPolicies";
import { evaluateCarsDomainFactRequirement } from "@/features/decision/context/sufficiency/evaluateCarsDomainFactRequirement";
import { resolveVehicleEvidenceTypeBIdentity } from "@/features/vehicle-evidence/resolveVehicleEvidenceTypeBIdentity";
import type { CarsDomainFactRequirement, CarsDomainFactRequirementResolutionResult } from "@/types/carsDomainFactRequirement";
import type { VehicleEvidenceReadPort } from "@/types/runtimeVehicleEvidence";
import { buildCarsRuntimeEvidenceDependencies } from "./buildCarsRuntimeEvidenceDependencies";

const ACTIVE_AUTHORITY = Object.freeze({
  artifactVersion: "0.3.0",
  artifactHash: "745b55fa1053ddc4d1bd67babb29f5574dda1f10ac34a8d8d8601419bd00885b",
  catalogReleaseVersion: "0.2.0",
  catalogPayloadHash: "393b548307e9e117415a4c54bf0d3d8c3f734f33518ed5bd5cd37be5158c18ba",
  datasetVersion: "0.4.1",
  datasetReleaseHash: "910507ec41cbb82a16a7b5ab31e37e0275c8d868a0c0baeb8275f0d29d18a7de",
  mappingVersion: "0.2.1",
  mappingHash: "3833bdc222152b47a759034e04856cc8b963e4911715c14de295401cf0a7b982",
  dictionaryRevision: "vehicle-evidence-0.4.1:data_dictionary.csv",
  dictionaryHash: "7aa8579ccd0a118c0bf98075f62ac7e62ee8297f44422125f40be956db676a95",
});

export type VehicleEvidenceActivationTelemetry =
  | "VEHICLE_EVIDENCE_USED"
  | "VEHICLE_EVIDENCE_UNMAPPED"
  | "VEHICLE_EVIDENCE_UNAVAILABLE"
  | "VEHICLE_EVIDENCE_CONFLICT"
  | "VEHICLE_EVIDENCE_REQUIREMENT_SATISFIED"
  | "VEHICLE_EVIDENCE_REQUIREMENT_NOT_SATISFIED";

export interface ControlledSeatsActivationResult {
  readonly mode: "CONTROLLED_VEHICLE_EVIDENCE";
  readonly catalogVehicleVariantId: string;
  readonly runtimeVehicleCandidateId?: string;
  readonly configurationId?: string;
  readonly requirement: { readonly category: "seats"; readonly relation: "AT_LEAST"; readonly operand: number };
  readonly evidenceSufficiency: "SUFFICIENT" | "INSUFFICIENT" | "UNRESOLVED";
  readonly requirementResult: "SATISFIED" | "DOES_NOT_SATISFY" | "NOT_EVALUABLE";
  readonly telemetry: readonly VehicleEvidenceActivationTelemetry[];
  readonly trace?: {
    readonly catalogVehicleVariantId: string;
    readonly runtimeVehicleCandidateId: string;
    readonly configurationId: string;
    readonly factId: string;
    readonly assertionIds: readonly string[];
    readonly sourceIds: readonly string[];
    readonly artifactIdentity: typeof ACTIVE_AUTHORITY;
    readonly evidenceState: "VERIFIED";
    readonly applicability: "EXACT";
    readonly predicate: { readonly relation: "ORDERED_NUMERIC_COMPARISON"; readonly direction: "AT_LEAST"; readonly operand: number };
    readonly requirementResult: "SATISFIED" | "DOES_NOT_SATISFY";
  };
  readonly limitations: readonly string[];
}

function seatsRequirement(optionId: string, minimumSeats: number): CarsDomainFactRequirement {
  return {
    id: `cars-dfr:v1:controlled:seats:${optionId}`,
    identity: {
      version: "cars-dfr:v1", policyId: candidateComparisonPolicy.policyId,
      policyVersion: candidateComparisonPolicy.version,
      parentPolicyRequirementId: "material-preferences", contextLineage: [], optionIds: [optionId], category: "seats",
      predicate: { relation: "ORDERED_NUMERIC_COMPARISON", direction: "AT_LEAST", operand: minimumSeats },
    },
    bindingSourceOccurrence: 0, relationSourceOccurrence: 0,
  };
}

function unavailable(catalogVehicleVariantId: string, minimumSeats: number, limitation: string, telemetry: VehicleEvidenceActivationTelemetry): ControlledSeatsActivationResult {
  return {
    mode: "CONTROLLED_VEHICLE_EVIDENCE", catalogVehicleVariantId,
    requirement: { category: "seats", relation: "AT_LEAST", operand: minimumSeats },
    evidenceSufficiency: telemetry === "VEHICLE_EVIDENCE_UNMAPPED" ? "UNRESOLVED" : "INSUFFICIENT",
    requirementResult: "NOT_EVALUABLE", telemetry: [telemetry], limitations: [limitation],
  };
}

function authorityMismatch(port: VehicleEvidenceReadPort): string | undefined {
  const actual = port.getArtifactIdentity();
  for (const [key, expected] of Object.entries(ACTIVE_AUTHORITY)) {
    if (actual[key as keyof typeof actual] !== expected) return `ACTIVE_AUTHORITY_${key.toUpperCase()}_MISMATCH`;
  }
}

/** Explicit internal activation seam. Calling this function is the activation switch. */
export function runCarsRuntimeWithVehicleEvidence(input: {
  readonly catalogVehicleVariantId: string;
  readonly minimumSeats: number;
  readonly vehicleEvidenceReadPort?: VehicleEvidenceReadPort;
}): ControlledSeatsActivationResult {
  const { catalogVehicleVariantId, minimumSeats, vehicleEvidenceReadPort: port } = input;
  if (!port) return unavailable(catalogVehicleVariantId, minimumSeats, "VEHICLE_EVIDENCE_READ_PORT_UNAVAILABLE", "VEHICLE_EVIDENCE_UNAVAILABLE");
  try {
    const mismatch = authorityMismatch(port);
    if (mismatch) return unavailable(catalogVehicleVariantId, minimumSeats, mismatch, "VEHICLE_EVIDENCE_UNAVAILABLE");
    const identity = resolveVehicleEvidenceTypeBIdentity([catalogVehicleVariantId], port);
    if (identity.status === "UNRESOLVED") return unavailable(catalogVehicleVariantId, minimumSeats, identity.reason, "VEHICLE_EVIDENCE_UNMAPPED");
    const runtimeVehicleCandidateId = identity.optionIds[0];
    const fact = port.readFact(runtimeVehicleCandidateId, "seats");
    if (fact.status !== "AVAILABLE" || fact.value === undefined || !fact.factId || fact.evidenceState !== "VERIFIED" || fact.applicability !== "EXACT") {
      const telemetry = fact.status === "CONFLICT" ? "VEHICLE_EVIDENCE_CONFLICT" : "VEHICLE_EVIDENCE_UNAVAILABLE";
      return { ...unavailable(catalogVehicleVariantId, minimumSeats, fact.limitations[0] ?? `VEHICLE_EVIDENCE_${fact.status}`, telemetry), runtimeVehicleCandidateId, configurationId: fact.configurationId };
    }
    const requirement = seatsRequirement(runtimeVehicleCandidateId, minimumSeats);
    const requestLocalPort: VehicleEvidenceReadPort = {
      getArtifactIdentity: () => port.getArtifactIdentity(),
      resolveCatalogVariantId: (vehicleVariantId) => port.resolveCatalogVariantId(vehicleVariantId),
      readFact: (candidateId, factKey) =>
        candidateId === runtimeVehicleCandidateId && factKey === "seats"
          ? fact
          : port.readFact(candidateId, factKey),
    };
    const resolution: CarsDomainFactRequirementResolutionResult = {
      status: "RESOLVED", resolutions: [{ parentPolicyRequirementId: "material-preferences", status: "RESOLVED", requirements: [requirement] }],
      requirements: [requirement], limitations: [], errors: [],
    };
    const dependencies = buildCarsRuntimeEvidenceDependencies({
      decisionType: "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON", policy: candidateComparisonPolicy,
      requirementResolution: resolution, vehicleEvidenceReadPort: requestLocalPort,
      typeBProduction: {
        candidate: { id: "controlled-seats-activation", target: "evaluationContext.decisionOptions", value: [{ optionId: runtimeVehicleCandidateId }], provenance: "EXPLICIT_USER", source: { kind: "USER_INPUT", referenceId: "controlled-seats-activation" } },
        selectionTrace: [{ inputIndex: 0, optionId: runtimeVehicleCandidateId, userConfirmationReferenceId: "controlled-seats-activation", domainSourceReferenceId: `runtime-vehicle-candidate:${runtimeVehicleCandidateId}` }],
      },
      catalog: { cars: [], sourceId: "not-authoritative-for-seats", revision: "controlled-seats", limitations: [] },
    });
    const linkage = dependencies.evidence.status === "AVAILABLE" ? dependencies.evidence.linkage : undefined;
    const assertion = linkage?.ok ? linkage.value.assertions[0] : undefined;
    const evaluation = assertion ? evaluateCarsDomainFactRequirement(requirement, assertion) : { status: "UNRESOLVED" as const };
    if (evaluation.status === "UNRESOLVED") return { ...unavailable(catalogVehicleVariantId, minimumSeats, "VEHICLE_EVIDENCE_EVALUATION_UNRESOLVED", "VEHICLE_EVIDENCE_UNAVAILABLE"), runtimeVehicleCandidateId, configurationId: fact.configurationId };
    const requirementResult = evaluation.status === "SATISFIED" ? "SATISFIED" : "DOES_NOT_SATISFY";
    const outcomeTelemetry = evaluation.status === "SATISFIED" ? "VEHICLE_EVIDENCE_REQUIREMENT_SATISFIED" : "VEHICLE_EVIDENCE_REQUIREMENT_NOT_SATISFIED";
    return {
      mode: "CONTROLLED_VEHICLE_EVIDENCE", catalogVehicleVariantId, runtimeVehicleCandidateId,
      configurationId: fact.configurationId,
      requirement: { category: "seats", relation: "AT_LEAST", operand: minimumSeats },
      evidenceSufficiency: "SUFFICIENT", requirementResult,
      telemetry: ["VEHICLE_EVIDENCE_USED", outcomeTelemetry], limitations: fact.limitations,
      trace: {
        catalogVehicleVariantId, runtimeVehicleCandidateId, configurationId: fact.configurationId,
        factId: fact.factId, assertionIds: fact.assertionIds, sourceIds: fact.sourceIds,
        artifactIdentity: ACTIVE_AUTHORITY, evidenceState: fact.evidenceState, applicability: fact.applicability,
        predicate: requirement.identity.predicate as { relation: "ORDERED_NUMERIC_COMPARISON"; direction: "AT_LEAST"; operand: number },
        requirementResult,
      },
    };
  } catch {
    return unavailable(catalogVehicleVariantId, minimumSeats, "VEHICLE_EVIDENCE_READ_PORT_UNAVAILABLE", "VEHICLE_EVIDENCE_UNAVAILABLE");
  }
}
