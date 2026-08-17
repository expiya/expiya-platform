export interface CatalogReleaseRepository {
  loadActivePointer(): Promise<unknown>;
  loadReleaseManifest(releaseVersion: string): Promise<unknown>;
  loadReleaseCatalog(releaseVersion: string): Promise<unknown>;
  loadDecisionFacets(releaseVersion: string): Promise<unknown>;
  releaseExists(releaseVersion: string): Promise<boolean>;
}

export const CATALOG_RELEASE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;

export function assertSafeCatalogReleaseVersion(releaseVersion: string): void {
  if (!CATALOG_RELEASE_VERSION_PATTERN.test(releaseVersion)) throw new TypeError("Invalid catalog release version.");
}
