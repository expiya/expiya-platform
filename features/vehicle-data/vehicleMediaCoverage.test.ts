import { describe, expect, it } from "vitest";

import { activeCatalogPayload } from "@/data/production/catalog/activeCatalog.generated";
import { resolveVehicleImage } from "@/features/vehicle-data/resolveVehicleImage";
import { productionVehicleMediaAssets } from "@/data/production/vehicleMediaAssets";
import type { ProductionCatalogReleasePayload } from "@/features/vehicle-data/productionCatalogRelease";

describe("v0.55.0 vehicle media coverage", () => {
  it("resolves only governed exact-family images or the explicit safe placeholder", () => {
    const payload = activeCatalogPayload as unknown as ProductionCatalogReleasePayload;
    const resolutions = payload.records.map(({ variant }) => resolveVehicleImage({
      variantId: variant.id, brand: variant.brand.value, model: variant.model.value,
      generation: variant.generation?.value, bodyStyle: variant.bodyStyle.value, modelYear: variant.modelYear.value,
    }));
    const governedAssets = new Map(productionVehicleMediaAssets.map((asset) => [asset.id, asset]));
    const directlyResolved = resolutions.filter((resolution) => resolution.assetId !== "owned-representative:vehicle");
    expect(directlyResolved.length).toBeGreaterThan(0);
    expect(directlyResolved.every(({ assetId, path }) => assetId !== undefined && governedAssets.get(assetId)?.storagePath === path)).toBe(true);
    expect(resolutions.filter((resolution) => resolution.status === "APPROXIMATE")).toHaveLength(0);
    expect(resolutions).toHaveLength(payload.records.length);
    expect(resolutions.filter((resolution) => resolution.status === "PLACEHOLDER")).toHaveLength(0);
    expect(resolutions.filter((resolution) => resolution.assetId === "owned-representative:vehicle")
      .every(({ path, disposition }) => path === "/cars/owned-representative.svg" && disposition === "OWNED_REPRESENTATIVE")).toBe(true);
  });
});
