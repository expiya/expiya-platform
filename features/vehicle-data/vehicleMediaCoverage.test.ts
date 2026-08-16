import { describe, expect, it } from "vitest";

import catalog from "@/data/production/catalog/releases/v0.55.0/catalog.json";
import { resolveVehicleImage } from "@/features/vehicle-data/resolveVehicleImage";
import type { ProductionCatalogReleasePayload } from "@/features/vehicle-data/productionCatalogRelease";

describe("v0.55.0 vehicle media coverage", () => {
  it("resolves governed images for the collected catalog families", () => {
    const payload = catalog as unknown as ProductionCatalogReleasePayload;
    const resolutions = payload.records.map(({ variant }) => resolveVehicleImage({
      variantId: variant.id, brand: variant.brand.value, model: variant.model.value,
      generation: variant.generation?.value, bodyStyle: variant.bodyStyle.value, modelYear: variant.modelYear.value,
    }));
    const covered = resolutions.filter((resolution) => resolution.status !== "PLACEHOLDER");
    expect(covered).toHaveLength(491);
    expect(covered.every((resolution) => resolution.status === "REPRESENTATIVE")).toBe(true);
  });
});
