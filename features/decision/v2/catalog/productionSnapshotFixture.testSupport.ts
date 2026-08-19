import { readFile } from "node:fs/promises";
import path from "node:path";

import { createProductionCatalogReleaseRepository } from "./fileSystemRepository.server";
import { canonicalCatalogReleaseDirectoryName, normalizeCatalogReleaseVersion } from "./releasePath";
import { buildCatalogSnapshot } from "./snapshot";

async function json(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(process.cwd(), relativePath), "utf8")) as unknown;
}

export const ACTIVE_PRODUCTION_CATALOG_EVALUATION_INSTANT = "2026-08-20T00:30:00.000Z";

export function activeProductionCatalogEvaluationDateForTest(): Date {
  return new Date(ACTIVE_PRODUCTION_CATALOG_EVALUATION_INSTANT);
}

export async function loadActiveProductionSnapshotForTest(
  now: Date = activeProductionCatalogEvaluationDateForTest(),
) {
  const root = "data/production/catalog/";
  const pointer = await json(`${root}active.json`) as { active_catalog_release_version: string };
  const releaseRoot = `${root}releases/${canonicalCatalogReleaseDirectoryName(pointer.active_catalog_release_version)}`;
  return buildCatalogSnapshot({
    pointer,
    manifest: await json(`${releaseRoot}/manifest.json`),
    catalog: await json(`${releaseRoot}/catalog.json`),
    decisionFacets: await json(`${releaseRoot}/decision-facets.json`),
    now,
  });
}

export async function loadPinnedHistoricalSnapshotForTest(releaseVersion: string, activatedAt: string, now: Date) {
  const normalized = normalizeCatalogReleaseVersion(releaseVersion);
  const root = `data/production/catalog/releases/${canonicalCatalogReleaseDirectoryName(normalized)}`;
  const manifest = await json(`${root}/manifest.json`) as { catalog_payload_hash: string };
  return buildCatalogSnapshot({
    pointer: { market: "TR", state: "ACTIVE", active_catalog_release_version: normalized, catalog_payload_hash: manifest.catalog_payload_hash, activated_at: activatedAt, activation_reference: `historical-${normalized}-test-fixture`, previous_active_release: "0.55.0", rollback_release: "0.55.0" },
    manifest,
    catalog: await json(`${root}/catalog.json`),
    decisionFacets: await json(`${root}/decision-facets.json`),
    now,
  });
}

/** @deprecated Prefer the lifecycle-explicit active fixture name. */
export const loadProductionCatalogSnapshotForTest = loadActiveProductionSnapshotForTest;

/** @deprecated Prefer the lifecycle-explicit pinned historical fixture name. */
export const loadHistoricalProductionCatalogSnapshotForTest = loadPinnedHistoricalSnapshotForTest;

export { createProductionCatalogReleaseRepository };
