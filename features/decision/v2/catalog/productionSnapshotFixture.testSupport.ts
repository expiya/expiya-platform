import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildCatalogSnapshot } from "./snapshot";

async function json(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(process.cwd(), relativePath), "utf8")) as unknown;
}

export async function loadProductionCatalogSnapshotForTest(now: Date) {
  const root = "data/production/catalog/";
  const pointer = await json(`${root}active.json`) as { active_catalog_release_version: string };
  const releaseRoot = `${root}releases/v${pointer.active_catalog_release_version}`;
  return buildCatalogSnapshot({
    pointer,
    manifest: await json(`${releaseRoot}/manifest.json`),
    catalog: await json(`${releaseRoot}/catalog.json`),
    decisionFacets: await json(`${releaseRoot}/decision-facets.json`),
    now,
  });
}

export async function loadHistoricalProductionCatalogSnapshotForTest(releaseVersion: string, activatedAt: string, now: Date) {
  const root = `data/production/catalog/releases/v${releaseVersion}`;
  const manifest = await json(`${root}/manifest.json`) as { catalog_payload_hash: string };
  return buildCatalogSnapshot({
    pointer: { market: "TR", state: "ACTIVE", active_catalog_release_version: releaseVersion, catalog_payload_hash: manifest.catalog_payload_hash, activated_at: activatedAt, activation_reference: `historical-${releaseVersion}-test-fixture`, previous_active_release: "0.55.0", rollback_release: "0.55.0" },
    manifest,
    catalog: await json(`${root}/catalog.json`),
    decisionFacets: await json(`${root}/decision-facets.json`),
    now,
  });
}
