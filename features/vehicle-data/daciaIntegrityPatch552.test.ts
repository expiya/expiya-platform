import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import catalog from "@/data/production/catalog/releases/v0.55.2/catalog.json";
import manifest from "@/data/production/catalog/releases/v0.55.2/manifest.json";
import quarantine from "@/data/production/catalog/releases/v0.55.2/quarantine-registry.json";
import pilot from "@/data/production/equipment-evidence/pilots/pilot-v1.0.2-catalog-v0.55.2-2026-08-18/pilot-manifest.json";
import matrix from "@/data/production/equipment-evidence/pilots/pilot-v1.0.2-catalog-v0.55.2-2026-08-18/pilot-matrix.json";

const excluded = new Set(quarantine.records.map((item) => item.exactVariantId));
const hash = (text: string) => `sha256:${createHash("sha256").update(text).digest("hex")}`;

describe("catalog v0.55.2 Dacia integrity patch", () => {
  it("excludes all 11 quarantined IDs and preserves 566 records", () => {
    expect(catalog.records).toHaveLength(566); expect(quarantine.records).toHaveLength(11);
    expect(catalog.records.some((item) => excluded.has(item.variant.id))).toBe(false);
  });
  it("forbids authorization aliases", () => expect(quarantine.records.every((item) => !item.authorizationAliasAllowed && !("replacementExactVariantId" in item))).toBe(true));
  it("matches manifest fingerprint and lineage", () => {
    expect(hash(readFileSync("data/production/catalog/releases/v0.55.2/catalog.json", "utf8"))).toBe(manifest.catalog_payload_hash);
    expect(manifest).toMatchObject({ catalog_release_version: "0.55.2", previous_release: "0.55.1", record_count: 566 });
  });
  it("fails closed on the new Jogger manual identity", () => expect(catalog.records.some((item) => item.variant.trim.value === "expression 5 koltuk Eco-G 120 6MT")).toBe(false));
  it("creates a clean 28x51 new pilot without quarantined IDs", () => {
    expect(pilot.pilotId).toBe("EE-PILOT-002"); expect(pilot.variants).toHaveLength(28); expect(matrix).toHaveLength(1428);
    expect(pilot.variants.some((item) => excluded.has(item.exactVariantId))).toBe(false);
    expect(matrix.every((item) => item.disposition === "NOT_RESEARCHED")).toBe(true);
  });
  it("pins the historical pilot to the immutable v0.55.2 fingerprint", () => {
    expect(pilot).toMatchObject({ catalogRelease: "v0.55.2", catalogFingerprint: manifest.catalog_payload_hash });
  });
});
