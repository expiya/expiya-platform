import { describe, expect, it } from "vitest";

import { productionVehicleMediaAssets } from "@/data/production/vehicleMediaAssets";
import { validateVehicleMediaAsset } from "@/features/vehicle-data/validateVehicleMediaAsset";

describe("productionVehicleMediaAssets", () => {
  it("contains unique, publishable, auditable media records", () => {
    expect(new Set(productionVehicleMediaAssets.map((asset) => asset.id)).size).toBe(productionVehicleMediaAssets.length);
    expect(productionVehicleMediaAssets).toHaveLength(42);
    for (const asset of productionVehicleMediaAssets) {
      expect(asset.publicationState).toBe("PUBLISHED");
      expect(asset.storagePath).toMatch(/^https:\/\/wylflrzf7gws55yp\.public\.blob\.vercel-storage\.com\/cars\/v0\.55\.[01]\//);
      expect(validateVehicleMediaAsset(asset)).toEqual([]);
    }
  });

  it("keeps unverified open-license discoveries outside the runtime registry", () => {
    expect(productionVehicleMediaAssets.some((asset) => asset.usagePermission === "OPEN_LICENSE" && !asset.identityVerification)).toBe(false);
  });
});
