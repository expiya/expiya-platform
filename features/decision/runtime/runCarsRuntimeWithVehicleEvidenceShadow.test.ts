import { describe, expect, it, vi } from "vitest";

vi.mock("./runCarsRuntime", () => ({
  runCarsRuntime: vi.fn(async () => ({
    status: "SUCCEEDED", recommendations: [{ car: { id: "legacy-top" }, isTopPick: true }],
    reasons: [], lineage: { requestId: "request-1", contextReference: "context-1", stoppedAt: "AUTHORIZATION", inspectedStages: ["AUTHORIZATION"] },
  })),
}));

import { generatedVehicleEvidenceReadPort } from "@/features/vehicle-evidence/generatedVehicleEvidenceReadPort";
import type { RuntimeVehicleCandidateId, VehicleEvidenceReadPort } from "@/types/runtimeVehicleEvidence";
import { runCarsRuntimeWithVehicleEvidenceShadow, verifyVehicleEvidenceSeatsShadow } from "./runCarsRuntimeWithVehicleEvidenceShadow";

const IONIQ_9 = "a3728e65-51b2-447f-a6c3-a1f64db8a310";
const CAPTUR = "62465336-2cfb-4ccd-b9a7-36467d63497f";
const UNMAPPED = "11111111-1111-4111-8111-111111111111";

describe("Vehicle Evidence governed runtime shadow verification", () => {
  it("runs the real artifact, identity map, provider, linkage and sufficiency path", () => {
    const result = verifyVehicleEvidenceSeatsShadow({
      catalogVariantIds: [IONIQ_9, CAPTUR, UNMAPPED], minimumSeats: 7,
    });

    expect(result).toMatchObject({
      mode: "NON_AUTHORITATIVE_SHADOW",
      requirement: { category: "seats", relation: "AT_LEAST", operand: 7 },
      artifactIdentity: {
        artifactVersion: "0.4.0",
        artifactHash: "1a6ad63598db04076fc3c871dff31acd1da3f3301edff5cf0c3230b8df495bad",
        catalogReleaseVersion: "0.2.0",
        catalogPayloadHash: "393b548307e9e117415a4c54bf0d3d8c3f734f33518ed5bd5cd37be5158c18ba",
        mappingVersion: "0.3.0",
        mappingHash: "468d1728c4aabd94c6faa7a202b2e7ac4ae4c7bda0198f5b74788c8121f5c0ed",
      },
      scenarios: [
        {
          catalogVariantId: IONIQ_9, runtimeCandidateId: "RVC-PILOT-0001", configurationId: "CFG-000037",
          resolvedFact: 7, evidenceState: "VERIFIED", applicability: "EXACT", factId: "FAC-000178",
          assertionIds: ["AST-000332"], sourceIds: ["SRC-000050"],
          agreement: "LEGACY_CATEGORY_UNSUPPORTED", sufficiency: "SUFFICIENT", requirementResult: "SATISFIED",
        },
        {
          catalogVariantId: CAPTUR, runtimeCandidateId: "RVC-PILOT-0002", configurationId: "CFG-000055",
          resolvedFact: 5, evidenceState: "VERIFIED", applicability: "EXACT", factId: "FAC-000251",
          assertionIds: ["AST-000447"], sourceIds: ["SRC-000065"],
          agreement: "LEGACY_CATEGORY_UNSUPPORTED", sufficiency: "SUFFICIENT", requirementResult: "DOES_NOT_SATISFY",
        },
        {
          catalogVariantId: UNMAPPED, agreement: "IDENTITY_UNRESOLVED",
          sufficiency: "UNRESOLVED", requirementResult: "NOT_EVALUABLE",
        },
      ],
      userVisibleBehaviorChanged: false,
    });
  });

  it("preserves the authoritative recommendation result byte-for-structure", async () => {
    const execution = await runCarsRuntimeWithVehicleEvidenceShadow(
      { requestId: "request-1", contextReference: "context-1", query: "7 koltuklu araç öner" },
      { catalogVariantIds: [IONIQ_9, CAPTUR], minimumSeats: 7 },
    );
    expect(execution.authoritativeResult).toEqual({
      status: "SUCCEEDED", recommendations: [{ car: { id: "legacy-top" }, isTopPick: true }],
      reasons: [], lineage: { requestId: "request-1", contextReference: "context-1", stoppedAt: "AUTHORIZATION", inspectedStages: ["AUTHORIZATION"] },
    });
    expect(execution.shadow.userVisibleBehaviorChanged).toBe(false);
  });

  it("fails closed when the read port cannot produce evidence and never asks legacy for seats", () => {
    const readFact = vi.fn(() => ({
      status: "UNRESOLVED" as const, runtimeVehicleCandidateId: "RVC-PILOT-0001" as RuntimeVehicleCandidateId,
      configurationId: "UNRESOLVED", factKey: "seats" as const, assertionIds: [], sourceIds: [],
      limitations: ["PROVIDER_UNAVAILABLE"], artifactVersion: "failure-test",
    }));
    const port: VehicleEvidenceReadPort = {
      getArtifactIdentity: generatedVehicleEvidenceReadPort.getArtifactIdentity,
      resolveCatalogVariantId: generatedVehicleEvidenceReadPort.resolveCatalogVariantId,
      readFact,
    };
    const result = verifyVehicleEvidenceSeatsShadow({ catalogVariantIds: [IONIQ_9], minimumSeats: 7, port });
    expect(readFact).toHaveBeenCalledOnce();
    expect(result.scenarios[0]).toMatchObject({
      agreement: "VEHICLE_EVIDENCE_UNAVAILABLE", sufficiency: "UNRESOLVED",
      requirementResult: "NOT_EVALUABLE", limitations: ["PROVIDER_UNAVAILABLE"],
    });
  });

  it.each(["RVC-PILOT-0001", "CFG-000037"])("rejects raw wrong catalog identity %s", (rawId) => {
    expect(verifyVehicleEvidenceSeatsShadow({ catalogVariantIds: [rawId], minimumSeats: 7 }).scenarios[0])
      .toMatchObject({ agreement: "IDENTITY_UNRESOLVED", requirementResult: "NOT_EVALUABLE" });
  });
});
