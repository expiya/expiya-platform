import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import { generatedVehicleEvidenceReadPort } from "@/features/vehicle-evidence/generatedVehicleEvidenceReadPort";
import type { VehicleEvidenceReadPort } from "@/types/runtimeVehicleEvidence";
import { CARS_RUNTIME_CATEGORY_AUTHORITY } from "./buildCarsRuntimeEvidenceDependencies";
import { runCarsRuntimeWithVehicleEvidence } from "./runCarsRuntimeWithVehicleEvidence";

const IONIQ_9 = "a3728e65-51b2-447f-a6c3-a1f64db8a310";
const CAPTUR = "62465336-2cfb-4ccd-b9a7-36467d63497f";
const YARIS_CROSS = "e3248126-f374-44ff-9dbe-5378ab308a02";
const CORSA = "01a559dd-917f-4f49-a4cf-84fe78e9de40";
const BMW_320I = "06d935f4-6d33-4bc7-9e89-375b8db885df";
const UNMAPPED = "11111111-1111-4111-8111-111111111111";

describe("controlled seats activation", () => {
  it.each([
    [IONIQ_9, 7, "RVC-PILOT-0001", 7, "SATISFIED"],
    [CAPTUR, 7, "RVC-PILOT-0002", 5, "DOES_NOT_SATISFY"],
    [IONIQ_9, 8, "RVC-PILOT-0001", 7, "DOES_NOT_SATISFY"],
    [CAPTUR, 5, "RVC-PILOT-0002", 5, "SATISFIED"],
    [YARIS_CROSS, 5, "RVC-PILOT-0003", 5, "SATISFIED"],
    [YARIS_CROSS, 7, "RVC-PILOT-0003", 5, "DOES_NOT_SATISFY"],
  ])("evaluates %s seats >= %i through the real governed slice", (variantId, threshold, runtimeId, _seats, result) => {
    const activation = runCarsRuntimeWithVehicleEvidence({
      catalogVehicleVariantId: variantId, minimumSeats: threshold,
      vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort,
    });
    expect(activation).toMatchObject({
      mode: "CONTROLLED_VEHICLE_EVIDENCE", runtimeVehicleCandidateId: runtimeId,
      evidenceSufficiency: "SUFFICIENT", requirementResult: result,
      telemetry: [
        "VEHICLE_EVIDENCE_USED",
        result === "SATISFIED" ? "VEHICLE_EVIDENCE_REQUIREMENT_SATISFIED" : "VEHICLE_EVIDENCE_REQUIREMENT_NOT_SATISFIED",
      ],
      trace: {
        catalogVehicleVariantId: variantId, runtimeVehicleCandidateId: runtimeId,
        evidenceState: "VERIFIED", applicability: "EXACT",
        predicate: { relation: "ORDERED_NUMERIC_COMPARISON", direction: "AT_LEAST", operand: threshold },
        requirementResult: result,
      },
    });
  });

  it.each([[CORSA, "RVC-PILOT-0004", "CFG-000054"], [BMW_320I, "RVC-PILOT-0005", "CFG-000063"]])(
    "keeps exact identity %s active while UNKNOWN seats is not evaluable",
    (variantId, runtimeId, configurationId) => {
      expect(runCarsRuntimeWithVehicleEvidence({ catalogVehicleVariantId: variantId, minimumSeats: 5, vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort }))
        .toMatchObject({ runtimeVehicleCandidateId: runtimeId, configurationId, evidenceSufficiency: "INSUFFICIENT", requirementResult: "NOT_EVALUABLE", telemetry: ["VEHICLE_EVIDENCE_UNAVAILABLE"] });
    },
  );

  it("keeps unmapped identity absent and fail-closed", () => {
    expect(runCarsRuntimeWithVehicleEvidence({
      catalogVehicleVariantId: UNMAPPED, minimumSeats: 5,
      vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort,
    })).toEqual({
      mode: "CONTROLLED_VEHICLE_EVIDENCE", catalogVehicleVariantId: UNMAPPED,
      requirement: { category: "seats", relation: "AT_LEAST", operand: 5 },
      evidenceSufficiency: "UNRESOLVED", requirementResult: "NOT_EVALUABLE",
      telemetry: ["VEHICLE_EVIDENCE_UNMAPPED"],
      limitations: ["CATALOG_VARIANT_NOT_IN_ACTIVE_ARTIFACT"],
    });
  });

  it("requires explicit provider activation and never falls back", () => {
    expect(runCarsRuntimeWithVehicleEvidence({ catalogVehicleVariantId: IONIQ_9, minimumSeats: 7 }))
      .toMatchObject({ evidenceSufficiency: "INSUFFICIENT", requirementResult: "NOT_EVALUABLE", telemetry: ["VEHICLE_EVIDENCE_UNAVAILABLE"] });
  });

  it.each(["RVC-PILOT-0001", "CFG-000037"])("rejects %s as a catalog variant identity", (rawId) => {
    expect(runCarsRuntimeWithVehicleEvidence({
      catalogVehicleVariantId: rawId, minimumSeats: 7,
      vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort,
    })).toMatchObject({ requirementResult: "NOT_EVALUABLE", telemetry: ["VEHICLE_EVIDENCE_UNMAPPED"] });
  });

  it.each(["artifactHash", "mappingHash", "datasetVersion", "dictionaryRevision"] as const)("rejects a mismatched %s pin", (key) => {
    const identity = generatedVehicleEvidenceReadPort.getArtifactIdentity();
    const port: VehicleEvidenceReadPort = {
      ...generatedVehicleEvidenceReadPort,
      getArtifactIdentity: () => ({ ...identity, [key]: "unsupported-or-mismatched" }),
    };
    expect(runCarsRuntimeWithVehicleEvidence({ catalogVehicleVariantId: IONIQ_9, minimumSeats: 7, vehicleEvidenceReadPort: port }))
      .toMatchObject({ evidenceSufficiency: "INSUFFICIENT", requirementResult: "NOT_EVALUABLE", telemetry: ["VEHICLE_EVIDENCE_UNAVAILABLE"] });
  });

  it("fails closed when the provider throws", () => {
    const port: VehicleEvidenceReadPort = {
      ...generatedVehicleEvidenceReadPort,
      readFact: vi.fn(() => { throw new Error("offline"); }),
    };
    expect(runCarsRuntimeWithVehicleEvidence({ catalogVehicleVariantId: IONIQ_9, minimumSeats: 7, vehicleEvidenceReadPort: port }))
      .toMatchObject({ requirementResult: "NOT_EVALUABLE", telemetry: ["VEHICLE_EVIDENCE_UNAVAILABLE"] });
  });

  it.each([
    ["UNRESOLVED", "VEHICLE_EVIDENCE_UNAVAILABLE"],
    ["CONFLICT", "VEHICLE_EVIDENCE_CONFLICT"],
  ] as const)("fails closed for an ineligible candidate with %s evidence", (status, telemetry) => {
    const port: VehicleEvidenceReadPort = {
      ...generatedVehicleEvidenceReadPort,
      resolveCatalogVariantId: () => "RVC-INELIGIBLE" as never,
      readFact: (runtimeVehicleCandidateId, factKey) => ({
        status, runtimeVehicleCandidateId, configurationId: "UNRESOLVED", factKey,
        assertionIds: [], sourceIds: [], limitations: ["CANDIDATE_INELIGIBLE"], artifactVersion: "0.1.0",
      }),
    };
    expect(runCarsRuntimeWithVehicleEvidence({ catalogVehicleVariantId: UNMAPPED, minimumSeats: 5, vehicleEvidenceReadPort: port }))
      .toMatchObject({ evidenceSufficiency: "INSUFFICIENT", requirementResult: "NOT_EVALUABLE", telemetry: [telemetry] });
  });

  it("declares exactly one authority per governed category", () => {
    expect(CARS_RUNTIME_CATEGORY_AUTHORITY).toEqual({
      "Car.id": "RUNTIME_IDENTITY", brand: "LEGACY_CATALOG", model: "LEGACY_CATALOG",
      year: "LEGACY_CATALOG", fuel: "LEGACY_CATALOG", transmission: "LEGACY_CATALOG",
      bodyType: "LEGACY_CATALOG", seats: "VEHICLE_EVIDENCE", cargo_volume_l: "VEHICLE_EVIDENCE",
    });
  });

  it("is an explicit seam and does not alter or invoke the default runtime", () => {
    const source = readFileSync(fileURLToPath(new URL("./runCarsRuntimeWithVehicleEvidence.ts", import.meta.url)), "utf8");
    expect(source).not.toContain('from "./runCarsRuntime"');
    const defaultSource = readFileSync(fileURLToPath(new URL("./runCarsRuntime.ts", import.meta.url)), "utf8");
    expect(defaultSource).not.toContain("runCarsRuntimeWithVehicleEvidence");
    expect(defaultSource).not.toContain("generatedVehicleEvidenceReadPort");
  });

  it("returns the complete real provenance chain", () => {
    expect(runCarsRuntimeWithVehicleEvidence({
      catalogVehicleVariantId: IONIQ_9, minimumSeats: 7,
      vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort,
    }).trace).toEqual({
      catalogVehicleVariantId: IONIQ_9, runtimeVehicleCandidateId: "RVC-PILOT-0001",
      configurationId: "CFG-000037", factId: "FAC-000178", assertionIds: ["AST-000332"],
      sourceIds: ["SRC-000050"], evidenceState: "VERIFIED", applicability: "EXACT",
      artifactIdentity: {
        artifactVersion: "0.3.0", artifactHash: "745b55fa1053ddc4d1bd67babb29f5574dda1f10ac34a8d8d8601419bd00885b",
        catalogReleaseVersion: "0.2.0", catalogPayloadHash: "393b548307e9e117415a4c54bf0d3d8c3f734f33518ed5bd5cd37be5158c18ba",
        datasetVersion: "0.4.1", datasetReleaseHash: "910507ec41cbb82a16a7b5ab31e37e0275c8d868a0c0baeb8275f0d29d18a7de",
        mappingVersion: "0.2.1", mappingHash: "3833bdc222152b47a759034e04856cc8b963e4911715c14de295401cf0a7b982",
        dictionaryRevision: "vehicle-evidence-0.4.1:data_dictionary.csv", dictionaryHash: "7aa8579ccd0a118c0bf98075f62ac7e62ee8297f44422125f40be956db676a95",
      },
      predicate: { relation: "ORDERED_NUMERIC_COMPARISON", direction: "AT_LEAST", operand: 7 },
      requirementResult: "SATISFIED",
    });
  });
});
