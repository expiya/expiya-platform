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

  it("never publishes candidate or rights-review assets", () => {
    const candidate: VehicleMediaAsset = { ...base, publicationState: "RIGHTS_REVIEW" };
    expect(resolveVehicleImage(identity, [candidate])).toEqual({
      path: "/cars/production-placeholder.svg", status: "PLACEHOLDER",
    });
  });

  it("does not cross body styles or model-year applicability", () => {
    expect(resolveVehicleImage(identity, [{ ...base, bodyStyle: "Hatchback" }]).status).toBe("PLACEHOLDER");
    expect(resolveVehicleImage(identity, [{ ...base, modelYearTo: 2025 }]).status).toBe("PLACEHOLDER");
  });
});
