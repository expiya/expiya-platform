import type { TaxonomyCoverageLayer } from "../taxonomy/releaseManifest";
export interface TaxonomyPilotLayerCandidate { readonly layer: TaxonomyCoverageLayer; readonly targetEntityCount: number; readonly minimumSourceCoverageRatio: number; readonly minimumTrMarketEvidenceRatio: number; readonly publicReleaseEligible: boolean; readonly specialistReviewRequired: boolean }
export interface TaxonomyPilotCandidateManifest { readonly candidateVersion: "tr-used-pilot-0.1.0-rc1"; readonly previousReleaseVersion: string | null; readonly payloadChecksum: string | null; readonly sourceLicenseManifestChecksum: string | null; readonly layers: readonly TaxonomyPilotLayerCandidate[]; readonly zeroCarCatalogUsedAsInventory: false; readonly completenessClaimAllowed: false; readonly generatedPayloadRef: string | null; readonly activationEnabled: false }
export const usedCarsTaxonomyPilotCandidate: TaxonomyPilotCandidateManifest = Object.freeze({ candidateVersion: "tr-used-pilot-0.1.0-rc1", previousReleaseVersion: null, payloadChecksum: null, sourceLicenseManifestChecksum: null, zeroCarCatalogUsedAsInventory: false, completenessClaimAllowed: false, generatedPayloadRef: null, activationEnabled: false, layers: Object.freeze([
  { layer: "TR_MODERN_COMMON", targetEntityCount: 500, minimumSourceCoverageRatio: 1, minimumTrMarketEvidenceRatio: 1, publicReleaseEligible: true, specialistReviewRequired: false },
  { layer: "TR_LAST_25_YEARS", targetEntityCount: 1_500, minimumSourceCoverageRatio: 1, minimumTrMarketEvidenceRatio: 1, publicReleaseEligible: true, specialistReviewRequired: false },
  { layer: "LIGHT_COMMERCIAL", targetEntityCount: 0, minimumSourceCoverageRatio: 1, minimumTrMarketEvidenceRatio: 1, publicReleaseEligible: false, specialistReviewRequired: false },
  { layer: "LOW_VOLUME_IMPORT", targetEntityCount: 0, minimumSourceCoverageRatio: 1, minimumTrMarketEvidenceRatio: 1, publicReleaseEligible: false, specialistReviewRequired: true },
  { layer: "CLASSIC", targetEntityCount: 0, minimumSourceCoverageRatio: 1, minimumTrMarketEvidenceRatio: 1, publicReleaseEligible: false, specialistReviewRequired: true },
  { layer: "RARE_SPECIAL", targetEntityCount: 0, minimumSourceCoverageRatio: 1, minimumTrMarketEvidenceRatio: 1, publicReleaseEligible: false, specialistReviewRequired: true },
] as const) });
export function validateTaxonomyPilotCandidateManifest(manifest: TaxonomyPilotCandidateManifest) {
  const codes: string[] = [];
  if (manifest.layers.length !== 6 || new Set(manifest.layers.map((item) => item.layer)).size !== 6) codes.push("LAYER_COVERAGE_REQUIRED");
  if (manifest.layers.some((item) => item.publicReleaseEligible && (item.minimumSourceCoverageRatio !== 1 || item.minimumTrMarketEvidenceRatio !== 1))) codes.push("PUBLIC_LAYER_PROVENANCE_THRESHOLD_INVALID");
  if (manifest.layers.some((item) => ["LOW_VOLUME_IMPORT", "CLASSIC", "RARE_SPECIAL"].includes(item.layer) && (!item.specialistReviewRequired || item.publicReleaseEligible))) codes.push("SPECIAL_LAYER_BOUNDARY_INVALID");
  if (manifest.zeroCarCatalogUsedAsInventory || manifest.completenessClaimAllowed) codes.push("CATALOG_OR_COMPLETENESS_BOUNDARY_VIOLATION");
  if (manifest.payloadChecksum || manifest.sourceLicenseManifestChecksum || manifest.generatedPayloadRef || manifest.activationEnabled) codes.push("CANDIDATE_ENABLEMENT_FORBIDDEN");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), datasetAcquisitionAuthorized: false as const, publicTaxonomyReleaseAuthorized: false as const });
}
