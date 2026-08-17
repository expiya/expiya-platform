import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { CatalogReleaseRepository } from "./repository";
import { assertSafeCatalogReleaseVersion } from "./repository";

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

export function createFileSystemCatalogReleaseRepository(catalogRoot: string): CatalogReleaseRepository {
  const releasePath = (version: string, file: string) => {
    assertSafeCatalogReleaseVersion(version);
    return path.join(catalogRoot, "releases", `v${version}`, file);
  };
  return {
    loadActivePointer: () => readJson(path.join(catalogRoot, "active.json")),
    loadReleaseManifest: (version) => readJson(releasePath(version, "manifest.json")),
    loadReleaseCatalog: (version) => readJson(releasePath(version, "catalog.json")),
    loadDecisionFacets: async (version) => {
      try { return await readJson(releasePath(version, "decision-facets.json")); } catch { return null; }
    },
    releaseExists: async (version) => {
      try { await access(releasePath(version, "manifest.json")); return true; } catch { return false; }
    },
  };
}

export function createProductionCatalogReleaseRepository(repositoryRoot: string): CatalogReleaseRepository {
  return createFileSystemCatalogReleaseRepository(path.join(repositoryRoot, "data", "production", "catalog"));
}
