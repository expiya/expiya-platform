import { describe, expect, it } from "vitest";

import { generatedVehicleEvidenceReadPort } from "./generatedVehicleEvidenceReadPort";
import type { RuntimeVehicleCandidateId } from "@/types/runtimeVehicleEvidence";
import { resolveVehicleEvidenceTypeBIdentity } from "./resolveVehicleEvidenceTypeBIdentity";

describe("generatedVehicleEvidenceReadPort", () => {
  it("resolves the approved one-to-one catalog identities exactly", () => {
    expect(generatedVehicleEvidenceReadPort.resolveCatalogVariantId(
      "a3728e65-51b2-447f-a6c3-a1f64db8a310",
    )).toBe("RVC-PILOT-0001");
    expect(generatedVehicleEvidenceReadPort.resolveCatalogVariantId("e3248126-f374-44ff-9dbe-5378ab308a02")).toBe("RVC-PILOT-0003");
    expect(generatedVehicleEvidenceReadPort.resolveCatalogVariantId("01a559dd-917f-4f49-a4cf-84fe78e9de40")).toBe("RVC-PILOT-0004");
    expect(generatedVehicleEvidenceReadPort.resolveCatalogVariantId("06d935f4-6d33-4bc7-9e89-375b8db885df")).toBe("RVC-PILOT-0005");
    expect(generatedVehicleEvidenceReadPort.resolveCatalogVariantId("not-mapped")).toBeUndefined();
  });

  it("preserves mapped identity when seats evidence is unknown", () => {
    expect(generatedVehicleEvidenceReadPort.readFact("RVC-PILOT-0004" as RuntimeVehicleCandidateId, "seats"))
      .toMatchObject({ status: "MISSING", configurationId: "CFG-000054", limitations: ["SEATS_EVIDENCE_UNKNOWN_IN_VEHICLE_EVIDENCE_V0.4.1"] });
  });

  it("returns configuration-scoped verified seats with pinned lineage", () => {
    expect(generatedVehicleEvidenceReadPort.readFact(
      "RVC-PILOT-0002" as RuntimeVehicleCandidateId,
      "seats",
    )).toEqual({
      status: "AVAILABLE", runtimeVehicleCandidateId: "RVC-PILOT-0002",
      configurationId: "CFG-000055", factKey: "seats", value: 5,
      factId: "FAC-000251", evidenceState: "VERIFIED", applicability: "EXACT",
      assertionIds: ["AST-000447"], sourceIds: ["SRC-000065"],
      unit: "count", measurementContext: "official configurator", limitations: [],
      artifactVersion: "0.3.0",
    });
  });

  it("fails closed for an identity outside the active artifact", () => {
    expect(generatedVehicleEvidenceReadPort.readFact(
      "RVC-PILOT-9999" as RuntimeVehicleCandidateId,
      "seats",
    )).toMatchObject({ status: "UNRESOLVED" });
  });

  it("preserves scalar, range, and missing cargo evidence", () => {
    expect(generatedVehicleEvidenceReadPort.readFact("RVC-PILOT-0003" as RuntimeVehicleCandidateId, "cargo_volume_l"))
      .toMatchObject({ status: "AVAILABLE", value: 397, unit: "L", factId: "FAC-000258" });
    expect(generatedVehicleEvidenceReadPort.readFact("RVC-PILOT-0002" as RuntimeVehicleCandidateId, "cargo_volume_l"))
      .toMatchObject({ status: "AVAILABLE", valueMin: 484, valueMax: 616, rangeSemantics: "MIN_MAX", unit: "L", factId: "FAC-000299" });
    expect(generatedVehicleEvidenceReadPort.readFact("RVC-PILOT-0004" as RuntimeVehicleCandidateId, "cargo_volume_l"))
      .toMatchObject({ status: "MISSING", configurationId: "CFG-000054" });
  });

  it("adapts Type B catalog IDs by exact mapping and rejects partial coverage", () => {
    expect(resolveVehicleEvidenceTypeBIdentity([
      "a3728e65-51b2-447f-a6c3-a1f64db8a310",
      "62465336-2cfb-4ccd-b9a7-36467d63497f",
    ], generatedVehicleEvidenceReadPort)).toEqual({
      status: "RESOLVED", optionIds: ["RVC-PILOT-0001", "RVC-PILOT-0002"],
    });
    expect(resolveVehicleEvidenceTypeBIdentity([
      "a3728e65-51b2-447f-a6c3-a1f64db8a310", "unmapped",
    ], generatedVehicleEvidenceReadPort)).toEqual({
      status: "UNRESOLVED", reason: "CATALOG_VARIANT_NOT_IN_ACTIVE_ARTIFACT",
      vehicleVariantId: "unmapped",
    });
  });
});
