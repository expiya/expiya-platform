import path from "node:path";

export const CATALOG_RELEASE_INPUT_PATTERN = /^(?:v)?(\d+\.\d+\.\d+)$/u;

export function normalizeCatalogReleaseVersion(value: string): string {
  const match = CATALOG_RELEASE_INPUT_PATTERN.exec(value);
  if (!match) throw new TypeError("Invalid catalog release version.");
  return match[1];
}

export function canonicalCatalogReleaseDirectoryName(value: string): `v${string}` {
  return `v${normalizeCatalogReleaseVersion(value)}`;
}

export function resolveCatalogReleaseDirectory(catalogRoot: string, value: string): string {
  return path.join(catalogRoot, "releases", canonicalCatalogReleaseDirectoryName(value));
}
