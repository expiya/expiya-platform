import { describe, expect, it } from "vitest";

import { buildCatalogSnapshot, loadActiveCatalogSnapshot, loadPinnedCatalogSnapshot } from "./snapshot";
import { assertSafeCatalogReleaseVersion } from "./repository";
import { release, repository, variant } from "./testFixtures.testSupport";

const records = [variant("variant-a", "Brand Alpha", "Model 10", "Base"), variant("variant-b", "Brand Alpha", "Model 10", "Plus")];
const fixture = release("1.2.3", records);

describe("V2 catalog snapshot integrity and pinning", () => {
  it("loads an effective active pointer snapshot", async () => {
    const result = await loadActiveCatalogSnapshot({ repository: repository({ "1.2.3": fixture }, "1.2.3"), now: new Date("2026-08-19T00:00:00.000Z") });
    expect(result.status).toBe("READY");
  });

  it("reports a future effective release without changing the clock", async () => {
    const result = buildCatalogSnapshot({
      manifest: fixture.manifest,
      catalog: fixture.catalog,
      decisionFacets: fixture.facets,
      now: new Date("2026-08-16T00:00:00.000Z"),
    });
    expect(result).toMatchObject({ status: "UNAVAILABLE", reason: "NOT_YET_EFFECTIVE" });
  });

  it("loads a pinned old release even when active points to a newer release", async () => {
    const old = release("1.2.3", records, "2026-08-15T00:00:00.000Z");
    const current = release("1.2.4", [variant("variant-c", "Brand Beta", "Model 20", "Base")]);
    const result = await loadPinnedCatalogSnapshot({ repository: repository({ "1.2.3": old, "1.2.4": current }, "1.2.4"), releaseVersion: "1.2.3", catalogFingerprint: old.catalogHash, now: new Date("2026-08-19T00:00:00.000Z") });
    expect(result.status === "READY" && result.snapshot.authority.releaseVersion).toBe("1.2.3");
  });

  it("returns controlled unavailable for a missing pinned release and rejects traversal", async () => {
    const repo = repository({ "1.2.3": fixture }, "1.2.3");
    await expect(loadPinnedCatalogSnapshot({ repository: repo, releaseVersion: "1.2.2", catalogFingerprint: "sha256:missing", now: new Date() })).resolves.toMatchObject({ status: "UNAVAILABLE", reason: "CATALOG_SNAPSHOT_UNAVAILABLE" });
    await expect(loadPinnedCatalogSnapshot({ repository: repo, releaseVersion: "../1.2.3", catalogFingerprint: fixture.catalogHash, now: new Date() })).resolves.toMatchObject({ status: "UNAVAILABLE" });
    expect(() => assertSafeCatalogReleaseVersion("../../active")).toThrow();
  });

  it("fails closed for unknown boundary keys and unsupported schema versions", () => {
    expect(buildCatalogSnapshot({ pointer: { ...fixture.pointer, unknown: true }, manifest: fixture.manifest, catalog: fixture.catalog, decisionFacets: fixture.facets, now: new Date("2026-08-20T00:00:00.000Z") })).toMatchObject({ status: "UNAVAILABLE", reason: "ACTIVE_POINTER_INVALID" });
    expect(buildCatalogSnapshot({ manifest: { ...fixture.manifest, unknown: true }, catalog: fixture.catalog, decisionFacets: fixture.facets, now: new Date("2026-08-20T00:00:00.000Z") })).toMatchObject({ status: "UNAVAILABLE", reason: "UNSUPPORTED_SCHEMA" });
    expect(buildCatalogSnapshot({ manifest: fixture.manifest, catalog: { ...fixture.catalog, catalog_schema_version: "9.9" }, decisionFacets: fixture.facets, now: new Date("2026-08-20T00:00:00.000Z") })).toMatchObject({ status: "UNAVAILABLE", reason: "UNSUPPORTED_SCHEMA" });
  });

  it("fails closed on payload hash, included IDs, and duplicate IDs", () => {
    expect(buildCatalogSnapshot({ ...fixture, catalog: { ...fixture.catalog, effective_as_of: "2026-08-19T00:00:00.000Z" }, decisionFacets: fixture.facets, now: new Date("2026-08-20T00:00:00.000Z") })).toMatchObject({ status: "UNAVAILABLE", reason: "INTEGRITY_FAILURE" });
    expect(buildCatalogSnapshot({ ...fixture, manifest: { ...fixture.manifest, included_variant_ids: ["other"] }, decisionFacets: fixture.facets, now: new Date("2026-08-20T00:00:00.000Z") })).toMatchObject({ status: "UNAVAILABLE", diagnostics: expect.arrayContaining([expect.objectContaining({ code: "INCLUDED_VARIANT_IDS_MISMATCH" })]) });
    const duplicate = release("1.2.3", [records[0]!, records[0]!]);
    expect(buildCatalogSnapshot({ ...duplicate, decisionFacets: duplicate.facets, now: new Date("2026-08-20T00:00:00.000Z") })).toMatchObject({ status: "UNAVAILABLE", diagnostics: expect.arrayContaining([expect.objectContaining({ code: "DUPLICATE_VARIANT_ID" })]) });
  });

  it("exposes immutable projections and no Map mutation methods", () => {
    const result = buildCatalogSnapshot({ ...fixture, decisionFacets: fixture.facets, now: new Date("2026-08-20T00:00:00.000Z") });
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(Object.isFrozen(result.snapshot.variants)).toBe(true);
    expect(Object.isFrozen(result.snapshot.variants[0])).toBe(true);
    expect("set" in result.snapshot.variantById).toBe(false);
    expect(() => Object.assign(result.snapshot.variants[0]!, { model: "Changed" })).toThrow();
  });
});
