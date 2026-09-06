import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { AppliancesAuthoritySnapshot, PriceProjectionLoadResult } from "../authority/types";

/** Test-only projection: carries forward reviewed observations and marks newly
 * admitted products unknown. It is never written or exposed as commerce authority. */
export function activeCatalogPriceFixture(
  authority: AppliancesAuthoritySnapshot,
  freshness: "READY" | "STALE" = "READY",
): PriceProjectionLoadResult {
  const source = JSON.parse(readFileSync(path.join(process.cwd(), "data/production/appliances/prices/snapshots/APPLIANCES-WM-TR-PRICE-2026-09-03T021000+0300.json"), "utf8")) as Record<string, unknown>;
  const prior = new Map((source.products as Record<string, unknown>[]).map(row => [String(row.productId), row]));
  const publishedAt = "2026-09-05T10:00:00.000+03:00";
  const expiresAt = freshness === "READY" ? "2099-09-06T10:00:00.000+03:00" : "2026-09-05T10:00:01.000+03:00";
  const products = [...authority.productIds].sort().map(productId => {
    const existing = prior.get(productId);
    return existing ? { ...existing, asOf: publishedAt, expiresAt } : { productId, status: "PRICE_UNKNOWN", observationRefs: [], asOf: publishedAt, expiresAt };
  });
  const core = {
    ...source,
    snapshotId: `TEST-ACTIVE-CATALOG-PRICE-${freshness}`,
    catalogReleaseVersion: authority.releaseVersion,
    catalogReleaseDigest: authority.catalogDigest,
    membershipDigest: String((authority.catalog as Record<string, unknown>).membershipDigest),
    publishedAt,
    expiresAt,
    products,
  };
  delete (core as { projectionFingerprint?: unknown }).projectionFingerprint;
  const projectionFingerprint = createHash("sha256").update(JSON.stringify(core)).digest("hex");
  return { status: freshness, projection: Object.freeze({ ...core, projectionFingerprint }) };
}
