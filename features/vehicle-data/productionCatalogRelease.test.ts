import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { stagedCatalogBatch01Records } from "@/data/production/stagedCatalogBatch01";
import { vehicleDataSourceById } from "@/data/production/vehicleDataSources";
import { buildPublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import { resolveRecommendationCatalog } from "@/features/vehicle-data/resolveRecommendationCatalog";
import {
  CATALOG_BOOTSTRAP_INSTANT, FIRST_RELEASE_VARIANT_IDS, canonicalizeValue, catalogPayloadHash,
  createFirstReleaseManifest, createFirstReleasePayload, serializeCanonical, validateProductionCatalogRelease,
} from "@/features/vehicle-data/productionCatalogRelease";
import { generateFirstProductionCatalogRelease } from "@/scripts/generate-production-catalog-release";
import { verifyProductionCatalogRelease } from "@/scripts/verify-production-catalog-release";
import { generateStagedProductionCatalogRelease } from "@/scripts/generate-staged-production-catalog-release";
import { validateProductionVehicleIdentity } from "@/features/vehicle-data/validateProductionVehicle";
import {
  SECOND_CATALOG_RELEASE_AS_OF, createSecondReleaseManifest, createSecondReleasePayload,
} from "@/features/vehicle-data/productionCatalogRelease";

const temporaryRoots: string[] = [];
afterEach(async () => Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

function realRelease() {
  const published = buildPublishedCatalog(pilotVehicleRecords, new Date(CATALOG_BOOTSTRAP_INSTANT));
  const payload = createFirstReleasePayload(published.records);
  return { published, payload, manifest: createFirstReleaseManifest(payload) };
}

describe("first immutable production catalog release", () => {
  it("integrates the real 10-record publication path with exact membership", () => {
    const { published, payload, manifest } = realRelease();
    expect(published.rejected).toEqual([]);
    expect(payload.records).toHaveLength(10);
    expect(payload.records.map(({ variant }) => variant.id)).toEqual(FIRST_RELEASE_VARIANT_IDS);
    expect(validateProductionCatalogRelease(payload, manifest, serializeCanonical(payload))).toEqual([]);
  });

  it("produces a deterministic hash and is invariant to input order", () => {
    const published = buildPublishedCatalog(pilotVehicleRecords, new Date(CATALOG_BOOTSTRAP_INSTANT));
    const forwards = createFirstReleasePayload(published.records);
    const backwards = createFirstReleasePayload([...published.records].reverse());
    expect(serializeCanonical(forwards)).toBe(serializeCanonical(backwards));
    expect(catalogPayloadHash(serializeCanonical(forwards))).toBe(catalogPayloadHash(serializeCanonical(backwards)));
  });

  it("canonicalizes object keys, set-like nested arrays, LF and final newline", () => {
    expect(serializeCanonical({ z: ["b", "a"], a: { y: 2, x: 1 }, omitted: undefined }))
      .toBe('{\n  "a": {\n    "x": 1,\n    "y": 2\n  },\n  "z": [\n    "a",\n    "b"\n  ]\n}\n');
    expect(canonicalizeValue({ n: null })).toEqual({ n: null });
  });

  it("rejects duplicates, unexpected count and unexpected membership", () => {
    const records = realRelease().published.records;
    expect(() => createFirstReleasePayload([...records.slice(0, 9), records[0]])).toThrow("Duplicate");
    expect(() => createFirstReleasePayload(records.slice(0, 9))).toThrow("Expected 10");
    const changed = [...records.slice(0, 9), { ...records[9], variant: { ...records[9].variant, id: "unexpected" } }];
    expect(() => createFirstReleasePayload(changed)).toThrow("Unexpected first-release membership");
  });

  it("rejects hash mismatch, unsupported schema, and count mismatch", () => {
    const { payload, manifest } = realRelease();
    expect(validateProductionCatalogRelease(payload, { ...manifest, catalog_payload_hash: "sha256:bad" })).toContain("PAYLOAD_HASH_MISMATCH");
    expect(validateProductionCatalogRelease(payload, { ...manifest, catalog_schema_version: "9" })).toContain("UNSUPPORTED_SCHEMA_VERSION");
    expect(validateProductionCatalogRelease(payload, { ...manifest, record_count: 9 })).toContain("RECORD_COUNT_MISMATCH");
  });

  it("rejects missing approval, missing staging evidence, and ACTIVE state", () => {
    const { payload, manifest } = realRelease();
    expect(validateProductionCatalogRelease(payload, { ...manifest, approval: { ...manifest.approval, reference: "" } })).toContain("APPROVAL_EVIDENCE_MISSING");
    expect(validateProductionCatalogRelease(payload, { ...manifest, staging: { ...manifest.staging, actor_reference: "" } })).toContain("STAGING_EVIDENCE_MISSING");
    const active = { ...manifest, staging: { ...manifest.staging, state: "ACTIVE" } } as unknown as typeof manifest;
    expect(validateProductionCatalogRelease(payload, active)).toContain("STAGING_EVIDENCE_MISSING");
  });

  it("rejects non-canonical payload bytes", () => {
    const { payload, manifest } = realRelease();
    expect(validateProductionCatalogRelease(payload, manifest, JSON.stringify(payload))).toContain("PAYLOAD_NOT_CANONICAL");
  });

  it("creates atomically, verifies, reproduces identity, and refuses overwrite", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "catalog-release-test-"));
    temporaryRoots.push(root);
    const destination = path.join(root, "v0.1.0");
    await expect(generateFirstProductionCatalogRelease(destination)).resolves.toBe("created");
    const firstBytes = await readFile(path.join(destination, "catalog.json"), "utf8");
    await expect(generateFirstProductionCatalogRelease(destination)).resolves.toBe("already-exists");
    await expect(verifyProductionCatalogRelease(destination)).resolves.toMatchObject({ records: 10 });
    await writeFile(path.join(destination, "manifest.json"), "{}\n", "utf8");
    await expect(generateFirstProductionCatalogRelease(destination)).rejects.toThrow("different content");
    expect(await readFile(path.join(destination, "catalog.json"), "utf8")).toBe(firstBytes);
  });

  it("keeps the immutable first release reproducible while fixture isolation remains intact", () => {
    expect(realRelease().payload.records.map(({ variant }) => variant.id)).toEqual(FIRST_RELEASE_VARIANT_IDS);
    expect(resolveRecommendationCatalog("fixture", new Date(CATALOG_BOOTSTRAP_INSTANT))).toMatchObject({
      mode: "fixture", limitations: ["test-fixture-only", "not-production-evidence"],
    });
  });
});

describe("small staged catalog expansion v0.2.0", () => {
  it("publishes exactly three independently sourced additions", () => {
    expect(stagedCatalogBatch01Records).toHaveLength(3);
    for (const record of stagedCatalogBatch01Records) {
      expect(validateProductionVehicleIdentity(record.identity, vehicleDataSourceById, new Date(SECOND_CATALOG_RELEASE_AS_OF)))
        .toEqual({ ok: true });
    }
    const published = buildPublishedCatalog(
      [...pilotVehicleRecords, ...stagedCatalogBatch01Records], new Date(SECOND_CATALOG_RELEASE_AS_OF),
    );
    expect(published.rejected).toEqual([]);
    const payload = createSecondReleasePayload(published.records);
    const manifest = createSecondReleaseManifest(payload);
    expect(payload.records).toHaveLength(13);
    expect(manifest).toMatchObject({ catalog_release_version: "0.2.0", previous_release: "0.1.0" });
    expect(validateProductionCatalogRelease(payload, manifest, serializeCanonical(payload))).toEqual([]);
  });

  it("keeps the historical v0.2.0 release immutable and verifiable", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "staged-catalog-release-test-"));
    temporaryRoots.push(root);
    const destination = path.join(root, "v0.2.0");
    await expect(generateStagedProductionCatalogRelease(destination)).resolves.toBe("created");
    await expect(verifyProductionCatalogRelease(destination)).resolves.toMatchObject({ version: "0.2.0", records: 13 });
  });
});
