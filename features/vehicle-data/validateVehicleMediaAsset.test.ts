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
    } })).toEqual(["OWNER_ATTESTATION_NOT_A_RIGHTS_LICENSE", "GOVERNED_MEDIA_INVALID"]);
  });

  it("does not publish an open-license discovery before exact-identity verification", () => {
    expect(validateVehicleMediaAsset({
      ...asset, scope: "VARIANT", variantId: "variant-1", usagePermission: "OPEN_LICENSE", ownerAttestation: undefined,
      licenseName: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    })).toContain("OPEN_LICENSE_IDENTITY_VERIFICATION_REQUIRED");
  });

  it("accepts an open-license generation image only with a complete 95% verification record", () => {
    const hash = `sha256:${"a".repeat(64)}` as const;
    expect(validateVehicleMediaAsset({
      ...asset, scope: "GENERATION_BODY", generation: "E210", bodyStyle: "Sedan",
      usagePermission: "OPEN_LICENSE", ownerAttestation: undefined, fileHash: hash,
      licenseName: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      attributionText: "Example attribution",
      identityVerification: {
        status: "VERIFIED_EXACT", method: "GOVERNED_REFERENCE_PIXEL_SIMILARITY_V1",
        similarityScore: 0.97, threshold: 0.95, metadataExact: true,
        governedReferenceAssetId: "governed-corolla-e210", governedReferenceFileHash: `sha256:${"b".repeat(64)}`,
        candidateFileHash: hash, verifiedAt: "2026-08-22T10:00:00.000Z",
      },
    })).toEqual([]);
  });

  it("requires source and attribution for remote previews", () => {
    expect(validateVehicleMediaAsset({ ...asset, usagePermission: "REMOTE_PREVIEW", ownerAttestation: undefined })).toEqual(["REMOTE_PREVIEW_SOURCE_REQUIRED", "REMOTE_PREVIEW_ATTRIBUTION_REQUIRED", "GOVERNED_MEDIA_INVALID"]);
  });

  it("keeps a non-persisted remote preview as discovery until a display license is encoded", () => {
    expect(validateVehicleMediaAsset({ ...asset, usagePermission: "REMOTE_PREVIEW", ownerAttestation: undefined, storagePath: "", sourcePageUrl: "https://manufacturer.example/model", originalAssetUrl: "https://manufacturer.example/model/hero.jpg", attributionText: "Image: Manufacturer media kit" })).toEqual(["GOVERNED_MEDIA_INVALID"]);
  });
});
