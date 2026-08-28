import type { VehicleMediaAsset } from "@/types/vehicleMedia";
import officialVehicleMedia from "@/data/production/media/official-vehicle-media.json";
import wikimediaVehicleMedia from "@/data/production/media/wikimedia-vehicle-media.json";
import { isPublishableVehicleMediaAsset } from "@/features/vehicle-data/validateVehicleMediaAsset";

/**
 * Runtime media registry. Only PUBLISHED assets with an accepted permission
 * basis belong here. OWNER_ATTESTED records require a complete, auditable owner
 * declaration; discovered public URLs cannot self-attest.
 */
const officialOwnerAttestedAssets = officialVehicleMedia.assets as unknown as readonly VehicleMediaAsset[];

const openLicenseAssets = wikimediaVehicleMedia.assets as readonly VehicleMediaAsset[];

const governedAndRightsReviewedAssets: readonly VehicleMediaAsset[] = [
  ...officialOwnerAttestedAssets,
  ...openLicenseAssets,
];

/** Runtime registry: discoveries remain in provenance until every publication gate passes. */
export const productionVehicleMediaAssets: readonly VehicleMediaAsset[] = Object.freeze(
  governedAndRightsReviewedAssets.filter(isPublishableVehicleMediaAsset),
);
