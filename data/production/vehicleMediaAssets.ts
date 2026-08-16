import type { VehicleMediaAsset } from "@/types/vehicleMedia";

/**
 * Runtime media registry. Only PUBLISHED assets with an accepted permission
 * basis belong here. OWNER_ATTESTED records require a complete, auditable owner
 * declaration; discovered public URLs cannot self-attest.
 */
export const productionVehicleMediaAssets: readonly VehicleMediaAsset[] = Object.freeze([]);
