import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validateTechnicalDailyLifeManifestPreActivation } from "@/features/vehicle-data/validateTechnicalDailyLifeManifest";
import type { TechnicalDailyLifeLayer, TechnicalDailyLifeManifest } from "@/types/technicalDailyLife";

const ROOT = process.cwd();
const RELEASE = "v2.1.1-0.55.3-2026-08-19-compatibility-rebind";
const BASE = `data/production/technical-daily-life/releases/${RELEASE}`;
const rawPayload = readFileSync(path.join(ROOT, BASE, "technical-daily-life.json"), "utf8");
const payload = JSON.parse(rawPayload) as TechnicalDailyLifeLayer;
const manifest = JSON.parse(readFileSync(path.join(ROOT, BASE, "manifest.json"), "utf8")) as TechnicalDailyLifeManifest & { compatibilityRebind: { type: string; sourceRelease: string; catalogFingerprint: string }; declaredLimitations: string[] };
const pointer = JSON.parse(readFileSync(path.join(ROOT, BASE, "proposed-active-pointer.json"), "utf8")) as { activeTechnicalDailyLifeRelease: string; compatibleCatalogRelease: string; schemaVersion: number };
const generated = readFileSync(path.join(ROOT, BASE, "proposed-activeTechnicalDailyLife.generated.ts.txt"), "utf8");
const input = { manifest, rawPayload, payload, expectedReleaseId: RELEASE, expectedCatalogRelease: "v0.55.3", expectedCatalogFingerprint: "sha256:6ee79d18314d48cd63c771751815d42f3dab8486daa2e98e1eccfc0a49c2ecc8", sourceReleaseDirectory: path.join(ROOT, "data/production/technical-daily-life/releases/v2.1-0.55.2-2026-08-18-compatibility-rebind"), proposedPointer: pointer, proposedGeneratedModule: generated };

describe("Daily-Life immutable manifest repair v2.1.1", () => {
  it("passes the full pre-activation manifest contract", () => expect(validateTechnicalDailyLifeManifestPreActivation(input)).toEqual([]));
  it.each([
    ["schema", { ...manifest, schemaVersion: undefined }, "MANIFEST_SCHEMA_VERSION_INVALID"],
    ["producedAt", { ...manifest, producedAt: "invalid" }, "MANIFEST_PRODUCED_AT_INVALID"],
    ["source", { ...manifest, source: undefined }, "MANIFEST_SOURCE_INVALID"],
    ["counts", { ...manifest, counts: { ...manifest.counts, mappings: 116 } }, "MANIFEST_COUNTS_MISMATCH"],
    ["authority", { ...manifest, sourceAuthority: "INVALID" }, "MANIFEST_SOURCE_AUTHORITY_INVALID"],
    ["fingerprint", { ...manifest, compatibilityRebind: { ...manifest.compatibilityRebind, catalogFingerprint: "sha256:bad" } }, "CATALOG_COMPATIBILITY_MISMATCH"],
    ["checksum", { ...manifest, contentChecksum: "sha256:bad" }, "CONTENT_CHECKSUM_MISMATCH"],
  ])("rejects invalid %s", (_name, invalid, expected) => expect(validateTechnicalDailyLifeManifestPreActivation({ ...input, manifest: invalid as typeof manifest })).toContain(expected));
  it("rejects missing source release", () => expect(validateTechnicalDailyLifeManifestPreActivation({ ...input, sourceReleaseDirectory: path.join(ROOT, "missing-release") })).toContain("SOURCE_RELEASE_NOT_FOUND"));
  it("rejects generated module/release mismatch", () => expect(validateTechnicalDailyLifeManifestPreActivation({ ...input, proposedGeneratedModule: generated.replaceAll(RELEASE, "other") })).toContain("GENERATED_MODULE_RELEASE_MISMATCH"));
  it("keeps editorial counts and binds coverage metadata to 549 records", () => {
    expect(manifest.counts).toMatchObject({ technicalFields: 31, mappings: 117, dailyLifeExamples: 220, advisorQuestions: 321, interpretationClasses: { DECISION_SAFE: 13, GUIDED_APPROXIMATION: 56, ILLUSTRATIVE_ONLY: 48 }, rankingEffects: { DIRECT_FILTER: 13, SOFT_UNTIL_CONFIRMED: 56, NONE: 48 } });
    expect(payload.metadata).toMatchObject({ activeCatalogVersion: "0.55.3", activeVariantCount: 549, dailyLifeLayerVersion: RELEASE });
  });
  it("materializes only an immutable proposed pointer", () => expect(pointer.activeTechnicalDailyLifeRelease).toBe(RELEASE));
});
