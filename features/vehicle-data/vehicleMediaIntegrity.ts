import catalogPointer from "@/data/production/catalog/active.json";
import { activeCatalogPayload, activeCatalogReleaseVersion } from "@/data/production/catalog/activeCatalog.generated";
import governedMediaManifest from "@/data/production/media/governed-active.json";
import { productionVehicleMediaAssets } from "@/data/production/vehicleMediaAssets";
import { resolveVehicleImage } from "./resolveVehicleImage";
import type { ProductionCatalogReleasePayload } from "./productionCatalogRelease";

export function evaluateVehicleMediaIntegrity() {
  const payload = activeCatalogPayload as unknown as ProductionCatalogReleasePayload;
  const activeRelease = catalogPointer.active_catalog_release_version;
  const manifestReleases = [governedMediaManifest.catalogRelease];
  const resolutions = payload.records.map(({ variant }) => resolveVehicleImage({ variantId: variant.id, brand: variant.brand.value,
    model: variant.model.value, generation: variant.generation?.value, bodyStyle: variant.bodyStyle.value, modelYear: variant.modelYear.value }));
  const issueCodes = [
    ...(activeCatalogReleaseVersion !== activeRelease ? ["CATALOG_PAYLOAD_NOT_ACTIVE_RELEASE"] : []),
    ...manifestReleases.some((release) => release !== `v${activeRelease}`) ? ["MEDIA_MANIFEST_CATALOG_RELEASE_MISMATCH"] : [],
    ...(governedMediaManifest.catalogFingerprint !== catalogPointer.catalog_payload_hash ? ["MEDIA_MANIFEST_CATALOG_FINGERPRINT_MISMATCH"] : []),
    ...(governedMediaManifest.admittedAssetCount !== productionVehicleMediaAssets.length ? ["MEDIA_MANIFEST_ASSET_COUNT_MISMATCH"] : []),
    ...(resolutions.some((resolution) => resolution.status === "APPROXIMATE") ? ["APPROXIMATE_MEDIA_FORBIDDEN"] : []),
    ...(resolutions.some((resolution) => resolution.status === "PLACEHOLDER") ? ["PLACEHOLDER_MEDIA_COVERAGE_INCOMPLETE"] : []),
  ];
  const counts = Object.freeze({ governedAssetCount: productionVehicleMediaAssets.length,
    exact: resolutions.filter((item) => item.status === "EXACT").length,
    representative: resolutions.filter((item) => item.status === "REPRESENTATIVE").length,
    placeholder: resolutions.filter((item) => item.status === "PLACEHOLDER").length,
    approximate: resolutions.filter((item) => item.status === "APPROXIMATE").length });
  return Object.freeze({ schemaVersion: "1.0.0", disposition: issueCodes.length === 0 ? "READY" as const : "BLOCKED" as const,
    activeCatalogRelease: activeRelease, catalogFingerprint: catalogPointer.catalog_payload_hash,
    mediaManifestFingerprint: governedMediaManifest.manifestDigest,
    manifestCatalogReleases: Object.freeze(manifestReleases), counts, issueCodes: Object.freeze(issueCodes) });
}
