import { describe, expect, it } from "vitest";

import { validateVehicleMediaAsset } from "@/features/vehicle-data/validateVehicleMediaAsset";
import type { VehicleMediaAsset } from "@/types/vehicleMedia";

const asset: VehicleMediaAsset = {
  id: "media-1", market: "TR", scope: "MODEL", brand: "Toyota", model: "Corolla",
  kind: "HERO_EXTERIOR", storagePath: "/media/corolla.webp", sourcePageUrl: "owner-upload://media-1",
  rightsHolder: "Declared by catalog owner", usagePermission: "OWNER_ATTESTED",
  publicationState: "PUBLISHED", isPrimary: true, reviewedAt: "2026-08-16T00:00:00.000Z",
  applicabilityNotes: [],
};

describe("validateVehicleMediaAsset", () => {
  it("requires an auditable declaration for OWNER_ATTESTED", () => {
    expect(validateVehicleMediaAsset(asset)).toEqual(["OWNER_ATTESTATION_REQUIRED"]);
  });

  it("accepts a complete commercial-display declaration", () => {
    expect(validateVehicleMediaAsset({ ...asset, ownerAttestation: {
      attestedBy: "Serdar Akgül", attestedAt: "2026-08-16T13:00:00.000Z",
      statement: "I attest that Expiya may display this supplied asset commercially.",
      evidenceReference: "media-intake:2026-08-16:001", permittedUses: ["COMMERCIAL_DISPLAY"],
    } })).toEqual([]);
  });
});
