import { describe, expect, it } from "vitest";

import { resolveVehicleImage } from "@/features/vehicle-data/resolveVehicleImage";
import type { VehicleMediaAsset } from "@/types/vehicleMedia";

const base: VehicleMediaAsset = {
  id: "media-corolla", market: "TR", scope: "MODEL_BODY", brand: "Toyota", model: "Corolla",
  bodyStyle: "Sedan", kind: "HERO_EXTERIOR", storagePath: "/media/corolla.webp",
  sourcePageUrl: "https://example.com/press", rightsHolder: "Example",
  usagePermission: "WRITTEN_PERMISSION", publicationState: "PUBLISHED", isPrimary: true,
  reviewedAt: "2026-08-16T00:00:00.000Z", applicabilityNotes: [],
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
    const exact: VehicleMediaAsset = { ...base, id: "media-exact", scope: "VARIANT", variantId: "variant-1", storagePath: "/media/exact.webp" };
    expect(resolveVehicleImage(identity, [base, exact])).toMatchObject({ path: "/media/exact.webp", status: "EXACT" });
  });

  it("prefers an official model image over an open-repository representative", () => {
    const official: VehicleMediaAsset = { ...base, id: "media-official-corolla", scope: "MODEL", sourceAuthority: "OFFICIAL_MANUFACTURER_OR_DISTRIBUTOR", storagePath: "/media/official-corolla.webp" };
    expect(resolveVehicleImage(identity, [base, official])).toMatchObject({ path: "/media/official-corolla.webp", status: "REPRESENTATIVE" });
  });

  it("never publishes candidate or rights-review assets", () => {
    const candidate: VehicleMediaAsset = { ...base, publicationState: "RIGHTS_REVIEW" };
    expect(resolveVehicleImage(identity, [candidate])).toEqual({
      path: "/cars/production-placeholder.svg", status: "PLACEHOLDER",
    });
  });

  it("publishes a complete owner-attested asset", () => {
    const attested: VehicleMediaAsset = {
      ...base, usagePermission: "OWNER_ATTESTED",
      ownerAttestation: {
        attestedBy: "Expiya catalog owner", attestedAt: "2026-08-16T13:00:00.000Z",
        statement: "I attest that Expiya may display this supplied asset commercially.",
        evidenceReference: "media-intake:2026-08-16:001", permittedUses: ["COMMERCIAL_DISPLAY"],
      },
    };
    expect(resolveVehicleImage(identity, [attested]).path).toBe("/media/corolla.webp");
  });

  it("rejects an OWNER_ATTESTED asset without its declaration", () => {
    expect(resolveVehicleImage(identity, [{ ...base, usagePermission: "OWNER_ATTESTED" }]).status).toBe("PLACEHOLDER");
  });

  it("does not cross body styles or model-year applicability", () => {
    expect(resolveVehicleImage(identity, [{ ...base, bodyStyle: "Hatchback" }]).status).toBe("APPROXIMATE");
    expect(resolveVehicleImage(identity, [{ ...base, modelYearTo: 2025 }]).status).toBe("APPROXIMATE");
  });

  it("selects the closest publishable same-brand image and exposes what it represents", () => {
    const suv: VehicleMediaAsset = { ...base, id: "media-rav4", model: "RAV4", bodyStyle: "SUV", storagePath: "/media/rav4.webp" };
    const sedan: VehicleMediaAsset = { ...base, id: "media-camry", model: "Camry", storagePath: "/media/camry.webp" };
    const missing = { ...identity, model: "C-HR", bodyStyle: "SUV" };
    expect(resolveVehicleImage(missing, [sedan, suv])).toMatchObject({
      path: "/media/rav4.webp", status: "APPROXIMATE", representedModel: "Toyota RAV4",
    });
  });
});
