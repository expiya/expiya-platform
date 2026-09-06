import { describe, expect, it } from "vitest";

import { productionVehicleMediaAssets } from "@/data/production/vehicleMediaAssets";
import { validateVehicleMediaAsset } from "@/features/vehicle-data/validateVehicleMediaAsset";
import { toGovernedVehicleMediaCandidate } from "@/features/vehicle-data/validateVehicleMediaAsset";

describe("productionVehicleMediaAssets", () => {
  it("contains unique, publishable, auditable media records", () => {
    expect(new Set(productionVehicleMediaAssets.map((asset) => asset.id)).size).toBe(productionVehicleMediaAssets.length);
    expect(productionVehicleMediaAssets).toHaveLength(274);
    for (const asset of productionVehicleMediaAssets) {
      expect(asset.publicationState).toBe("PUBLISHED");
      expect(asset.storagePath).toMatch(/^https:\/\/wylflrzf7gws55yp\.public\.blob\.vercel-storage\.com\/cars\/v0\.55\.[01]\//);
      expect(validateVehicleMediaAsset(asset)).toEqual([]);
      expect(toGovernedVehicleMediaCandidate(asset)?.governance.identity.evidence.length).toBeGreaterThan(0);
    }
  });

  it("keeps owner-directed manufacturer page copies and identity-unproven open-license discoveries outside runtime", () => {
    expect(productionVehicleMediaAssets.some((asset) => asset.usagePermission === "OWNER_ATTESTED")).toBe(false);
    expect(productionVehicleMediaAssets.every((asset) => toGovernedVehicleMediaCandidate(asset)?.governance.disposition === "MODEL_FAMILY_LICENSED")).toBe(true);
  });
});
