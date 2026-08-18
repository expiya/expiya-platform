import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import activeCatalog from "@/data/production/catalog/active.json";
import oldCatalog from "@/data/production/catalog/releases/v0.55.0/catalog.json";
import oldManifest from "@/data/production/catalog/releases/v0.55.0/manifest.json";
import newCatalog from "@/data/production/catalog/releases/v0.55.1/catalog.json";
import newManifest from "@/data/production/catalog/releases/v0.55.1/manifest.json";
import currentManifest from "@/data/production/catalog/releases/v0.55.2/manifest.json";
import activeDailyLife from "@/data/production/technical-daily-life/active.json";
import oldDailyLife from "@/data/production/technical-daily-life/releases/v2.1-0.55.0-2026-08-16/technical-daily-life.json";
import newDailyLife from "@/data/production/technical-daily-life/releases/v2.1-0.55.1-2026-08-16-compatibility-rebind/technical-daily-life.json";
import activePersona from "@/data/production/personas/safe-traits/active.json";
import oldPersona from "@/data/production/personas/safe-traits/releases/v1.0.1-catalog-v0.55.0-2026-08-16/vehicle-persona-safe-traits.json";
import newPersona from "@/data/production/personas/safe-traits/releases/v1.0.2-catalog-v0.55.1-2026-08-16/vehicle-persona-safe-traits.json";

import { catalogPayloadHash, serializeCanonical } from "./productionCatalogRelease";

describe("v0.55.1 temporal correction stack", () => {
  it("preserves every vehicle record and exact variant ID", () => {
    expect(newCatalog.records).toEqual(oldCatalog.records);
    expect(newCatalog.records.map((record) => record.variant.id).sort())
      .toEqual(oldCatalog.records.map((record) => record.variant.id).sort());
    expect(newCatalog.records).toHaveLength(577);
  });

  it("changes only the catalog release temporal envelope", () => {
    expect(newCatalog).toEqual({ ...oldCatalog, effective_as_of: "2026-08-16T09:40:33.000Z" });
    expect(newManifest.effective_as_of).toBe("2026-08-16T09:40:33.000Z");
    expect(newManifest.approval.at).toBe("2026-08-16T09:40:33.000Z");
    expect(newManifest.staging.at).toBe("2026-08-16T09:40:33.000Z");
    expect(new Date(newManifest.staging.at).getTime()).toBeLessThanOrEqual(new Date(newManifest.approval.at).getTime());
    expect(new Date(newManifest.approval.at).getTime()).toBeLessThanOrEqual(new Date(newManifest.effective_as_of).getTime());
    expect(new Date(newManifest.effective_as_of).getTime()).toBe(new Date(newCatalog.effective_as_of).getTime());
  });

  it("keeps hashes, lineage, rollback and decision facets coherent", () => {
    expect(catalogPayloadHash(serializeCanonical(newCatalog))).toBe(newManifest.catalog_payload_hash);
    expect(newManifest.catalog_payload_hash).toBe("sha256:96f318680dd788c9df0827cbe3ce5635a36a5f1b354ab8fc7e6654bfa3ddc07e");
    expect(newManifest.previous_release).toBe("0.55.0");
    expect(readFileSync("data/production/catalog/releases/v0.55.1/decision-facets.json", "utf8"))
      .toBe(readFileSync("data/production/catalog/releases/v0.55.0/decision-facets.json", "utf8"));
    expect(oldManifest.catalog_payload_hash).toBe("sha256:fc0c03c45dae679545dc85d3ddc2e69a2663ce688541459cd7201c9c9dcba4b3");
  });

  it("preserves the daily-life content in a compatibility-only rebind", () => {
    expect(newDailyLife.fields).toEqual(oldDailyLife.fields);
    expect(newDailyLife.metadata).toMatchObject({
      dailyLifeLayerVersion: "v2.1-0.55.1-2026-08-16-compatibility-rebind",
      activeCatalogVersion: "0.55.1",
    });
    const mappings = newDailyLife.fields.flatMap((field) => field.usageMappings as readonly {
      dailyLifeExamples: readonly unknown[];
      advisorQuestions: readonly unknown[];
    }[]);
    expect([newDailyLife.fields.length, mappings.length]).toEqual([31, 117]);
    expect(mappings.flatMap((mapping) => mapping.dailyLifeExamples)).toHaveLength(220);
    expect(mappings.flatMap((mapping) => mapping.advisorQuestions)).toHaveLength(321);
  });

  it("preserves approved safe persona projections in a compatibility-only rebind", () => {
    expect(newPersona.families).toEqual(oldPersona.families);
    expect(newPersona.variants).toEqual(oldPersona.variants);
    expect(newPersona).toMatchObject({
      releaseVersion: "v1.0.2-catalog-v0.55.1-2026-08-16",
      compatibleCatalogRelease: "v0.55.1",
      compatibleCatalogFingerprint: newManifest.catalog_payload_hash,
    });
    expect([newPersona.families.length, newPersona.variants.length]).toEqual([397, 577]);
    expect(newPersona.variants.reduce((sum, variant) => sum + variant.traits.length, 0)).toBe(534);
    for (const family of newPersona.families.filter((item) => ["T-Cross", "Model Y"].includes(item.canonicalModel))) {
      expect(family.traits).not.toContain("COMMERCIAL");
    }
  });

  it("preserves internal-only visibility for estimated prices", () => {
    const estimates = newCatalog.records.flatMap((record) => record.activeNewPrice?.priceType === "ESTIMATE" ? [record.activeNewPrice] : []);
    expect(estimates.length).toBeGreaterThan(0);
    expect(estimates.every((price) => price.consumerVisibility === "INTERNAL_ONLY")).toBe(true);
  });

  it("keeps the current v0.55.2 activation and rollback metadata coherent without rewriting history", () => {
    expect(activeCatalog).toMatchObject({
      active_catalog_release_version: currentManifest.catalog_release_version,
      catalog_payload_hash: currentManifest.catalog_payload_hash,
      previous_active_release: "0.55.1",
      rollback_release: "0.55.1",
    });
    expect(activeDailyLife).toMatchObject({ compatibleCatalogRelease: "v0.55.2" });
    expect(activePersona).toMatchObject({
      compatibleCatalogRelease: "v0.55.2",
      compatibleCatalogFingerprint: currentManifest.catalog_payload_hash,
    });
  });
});
