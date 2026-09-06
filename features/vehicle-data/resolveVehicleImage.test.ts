import { describe, expect, it } from "vitest";

import { resolveVehicleGallery, resolveVehicleImage } from "@/features/vehicle-data/resolveVehicleImage";
import { GOVERNED_PRODUCT_MEDIA_SCHEMA } from "@/features/media/governedProductMedia";
import type { VehicleMediaAsset } from "@/types/vehicleMedia";

const base: VehicleMediaAsset = {
  id: "media-corolla", market: "TR", scope: "MODEL_BODY", brand: "Toyota", model: "Corolla",
  bodyStyle: "Sedan", kind: "HERO_EXTERIOR", storagePath: "/media/corolla.webp",
  sourcePageUrl: "https://example.com/press", rightsHolder: "Example",
  usagePermission: "WRITTEN_PERMISSION", publicationState: "PUBLISHED", isPrimary: true,
  reviewedAt: "2026-08-16T00:00:00.000Z", applicabilityNotes: [],
  governance: {
    schemaVersion: GOVERNED_PRODUCT_MEDIA_SCHEMA, disposition: "MODEL_FAMILY_LICENSED", rightsBasis: "MANUFACTURER_PRESS_MEDIA_LICENSE",
    provider: "Example manufacturer", permissionReference: "https://example.com/media-terms", allowedSurfaces: ["STAGE_1_CARD", "STAGE_2_HERO", "DETAIL_GALLERY"],
    requiredLinkTarget: null, requiredDisclosure: "Temsilî model ailesi görseli.", requiredAttribution: "Example",
    cache: { mode: "PERSISTENT", expiresAt: null, maxAgeSeconds: null }, retrievedAt: "2026-08-16T00:00:00.000Z",
    identity: { scope: "MODEL_FAMILY", evidence: ["Model and body style matched in the media kit."] }, revokedAt: null,
  },
};
const identity = {
  variantId: "variant-1", brand: "Toyota", model: "Corolla", generation: "E210",
  bodyStyle: "Sedan", modelYear: 2026,
};

describe("resolveVehicleImage", () => {
  it("inherits a rights-approved model/body image as representative", () => {
    expect(resolveVehicleImage(identity, [base])).toMatchObject({
      path: "/media/corolla.webp", status: "REPRESENTATIVE", assetId: "media-corolla",
    });
  });

  it("prefers an exact variant image over broader matches", () => {
    const exact: VehicleMediaAsset = { ...base, id: "media-exact", scope: "VARIANT", variantId: "variant-1", storagePath: "/media/exact.webp", governance: { ...base.governance!, disposition: "EXACT_LICENSED", identity: { scope: "EXACT_PRODUCT", evidence: ["Exact variant media-kit identifier matched."] } } };
    expect(resolveVehicleImage(identity, [base, exact])).toMatchObject({ path: "/media/exact.webp", status: "EXACT" });
  });

  it("returns all governed matching media for the interactive gallery", () => {
    const interior: VehicleMediaAsset = { ...base, id: "media-interior", kind: "INTERIOR", isPrimary: false, storagePath: "/media/interior.webp" };
    const cargo: VehicleMediaAsset = { ...base, id: "media-cargo", kind: "CARGO", isPrimary: false, storagePath: "/media/cargo.webp" };
    expect(resolveVehicleGallery(identity, [base, interior, cargo]).map((item) => item.path)).toEqual(["/media/corolla.webp", "/media/cargo.webp", "/media/interior.webp"]);
  });

  it("prefers an official model image over an open-repository representative", () => {
    const official: VehicleMediaAsset = { ...base, id: "media-official-corolla", scope: "MODEL", sourceAuthority: "OFFICIAL_MANUFACTURER_OR_DISTRIBUTOR", storagePath: "/media/official-corolla.webp" };
    expect(resolveVehicleImage(identity, [base, official])).toMatchObject({ path: "/media/official-corolla.webp", status: "REPRESENTATIVE" });
  });

  it("never publishes candidate or rights-review assets", () => {
    const candidate: VehicleMediaAsset = { ...base, publicationState: "RIGHTS_REVIEW" };
    expect(resolveVehicleImage(identity, [candidate])).toEqual({
      path: "/cars/owned-representative.svg", status: "REPRESENTATIVE", assetId: "owned-representative:vehicle", attributionText: "Expiya görseli", representedModel: "genel araç illüstrasyonu", disposition: "OWNED_REPRESENTATIVE", disclosure: "Temsilî illüstrasyon; önerilen aracın birebir fotoğrafı değildir.",
    });
  });

  it("publishes a complete owner-attested asset", () => {
    const attested: VehicleMediaAsset = {
      ...base, usagePermission: "OWNER_ATTESTED", governance: { ...base.governance!, rightsBasis: "OWNED_OR_COMMISSIONED", permissionReference: "owned-asset-ledger:media-corolla" },
      ownerAttestation: {
        attestedBy: "Expiya catalog owner", attestedAt: "2026-08-16T13:00:00.000Z",
        statement: "I attest that Expiya may display this supplied asset commercially.",
        evidenceReference: "media-intake:2026-08-16:001", permittedUses: ["COMMERCIAL_DISPLAY"],
      },
    };
    expect(resolveVehicleImage(identity, [attested]).path).toBe("/media/corolla.webp");
  });

  it("rejects an OWNER_ATTESTED asset without its declaration", () => {
    expect(resolveVehicleImage(identity, [{ ...base, usagePermission: "OWNER_ATTESTED", governance: undefined }])).toMatchObject({ disposition: "OWNED_REPRESENTATIVE" });
  });

  it("rejects an open-license discovery without the 95% exact-identity record", () => {
    expect(resolveVehicleImage(identity, [{
      ...base, usagePermission: "OPEN_LICENSE", fileHash: `sha256:${"a".repeat(64)}`,
    }])).toMatchObject({ disposition: "OWNED_REPRESENTATIVE" });
  });

  it("does not cross body styles or model-year applicability", () => {
    expect(resolveVehicleImage(identity, [{ ...base, bodyStyle: "Hatchback" }])).toMatchObject({ disposition: "OWNED_REPRESENTATIVE" });
    expect(resolveVehicleImage(identity, [{ ...base, modelYearTo: 2025 }])).toMatchObject({ disposition: "OWNED_REPRESENTATIVE" });
  });

  it("never falls back to a different brand even when body style matches", () => {
    expect(resolveVehicleImage(identity, [{ ...base, brand: "Porsche", model: "Taycan" }])).toMatchObject({ path: "/cars/owned-representative.svg", disposition: "OWNED_REPRESENTATIVE" });
  });

  it("rejects another model even when brand and body style match", () => {
    const suv: VehicleMediaAsset = { ...base, id: "media-rav4", model: "RAV4", bodyStyle: "SUV", storagePath: "/media/rav4.webp" };
    const sedan: VehicleMediaAsset = { ...base, id: "media-camry", model: "Camry", storagePath: "/media/camry.webp" };
    const missing = { ...identity, model: "C-HR", bodyStyle: "SUV" };
    expect(resolveVehicleImage(missing, [sedan, suv])).toMatchObject({ path: "/cars/owned-representative.svg", disposition: "OWNED_REPRESENTATIVE" });
  });
});
