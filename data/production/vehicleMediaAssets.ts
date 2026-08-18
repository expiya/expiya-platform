import type { VehicleMediaAsset } from "@/types/vehicleMedia";
import officialVehicleMedia from "@/data/production/media/official-vehicle-media.json";
import wikimediaVehicleMedia from "@/data/production/media/wikimedia-vehicle-media.json";

/**
 * Runtime media registry. Only PUBLISHED assets with an accepted permission
 * basis belong here. OWNER_ATTESTED records require a complete, auditable owner
 * declaration; discovered public URLs cannot self-attest.
 */
const officialOwnerAttestedAssets = officialVehicleMedia.assets as unknown as readonly VehicleMediaAsset[];

const openLicenseAssets = wikimediaVehicleMedia.assets as readonly VehicleMediaAsset[];

export const productionVehicleMediaAssets: readonly VehicleMediaAsset[] = Object.freeze([
  ...officialOwnerAttestedAssets,
  ...openLicenseAssets,
]);
