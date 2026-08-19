import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { CatalogReleaseRepository } from "./repository";
import { assertSafeCatalogReleaseVersion } from "./repository";
import { normalizeCatalogReleaseVersion, resolveCatalogReleaseDirectory } from "./releasePath";

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

export function createFileSystemCatalogReleaseRepository(catalogRoot: string): CatalogReleaseRepository {
  const immutableReleaseJson = new Map<string, Promise<unknown>>();
  const readImmutableReleaseJson = (filePath: string) => {
    const existing = immutableReleaseJson.get(filePath);
    if (existing) return existing;
    const loaded = readJson(filePath);
    immutableReleaseJson.set(filePath, loaded);
    return loaded;
  };
  const releasePath = (version: string, file: string) => {
    const normalized = normalizeCatalogReleaseVersion(version);
    assertSafeCatalogReleaseVersion(normalized);
    return path.join(resolveCatalogReleaseDirectory(catalogRoot, normalized), file);
  };
  return {
    loadActivePointer: () => readJson(path.join(catalogRoot, "active.json")),
    loadReleaseManifest: (version) => readImmutableReleaseJson(releasePath(version, "manifest.json")),
    loadReleaseCatalog: (version) => readImmutableReleaseJson(releasePath(version, "catalog.json")),
    loadDecisionFacets: async (version) => {
      try { return await readImmutableReleaseJson(releasePath(version, "decision-facets.json")); } catch { return null; }
    },
    releaseExists: async (version) => {
      try { await access(releasePath(version, "manifest.json")); return true; } catch { return false; }
    },
  };
}

export function createProductionCatalogReleaseRepository(repositoryRoot: string): CatalogReleaseRepository {
  return createFileSystemCatalogReleaseRepository(path.join(repositoryRoot, "data", "production", "catalog"));
}
