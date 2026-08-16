import type { VehicleMediaAsset } from "@/types/vehicleMedia";

/**
 * Runtime media registry. Only rights-reviewed PUBLISHED assets belong here.
 * Public manufacturer URLs are not publication permission and must not be added
 * until their reuse terms or written permission have been verified.
 */
export const productionVehicleMediaAssets: readonly VehicleMediaAsset[] = Object.freeze([]);
