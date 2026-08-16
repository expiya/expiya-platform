import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import catalog from "@/data/production/catalog/releases/v0.55.0/catalog.json";
import activePointer from "@/data/production/technical-daily-life/active.json";
import manifestJson from "@/data/production/technical-daily-life/releases/v2.1-0.55.0-2026-08-16/manifest.json";
import layerJson from "@/data/production/technical-daily-life/releases/v2.1-0.55.0-2026-08-16/technical-daily-life.json";
import type { InterpretationClass, RankingEffect, TechnicalDailyLifeLayer, TechnicalDailyLifeManifest } from "@/types/technicalDailyLife";

import {
  assertActiveTechnicalDailyLifePointer,
  getTechnicalDailyLifeMappingById,
  getTechnicalDailyLifeMappings,
  loadActiveTechnicalDailyLifeLayer,
  resolveTechnicalDailyLifeMappings,
} from "./technicalDailyLifeResolver";
import { parseTechnicalDailyLifeLayer } from "./technicalDailyLifeSchema";
import {
  sha256Text,
  validateTechnicalDailyLifeCatalogCompatibility,
  validateTechnicalDailyLifeLayer,
} from "./validateTechnicalDailyLifeLayer";

const layer = parseTechnicalDailyLifeLayer(layerJson);
const manifest = manifestJson as TechnicalDailyLifeManifest;
const mappings = layer.fields.flatMap((field) => field.usageMappings);
const rawReleasePath = "data/production/technical-daily-life/releases/v2.1-0.55.0-2026-08-16/technical-daily-life.json";
const compatibility = (candidateLayer: TechnicalDailyLifeLayer = layer, records: readonly unknown[] = catalog.records, release = "v0.55.0") => (
  validateTechnicalDailyLifeCatalogCompatibility({ layer: candidateLayer, records, catalogRelease: release, expectedCatalogRelease: "v0.55.0" })
);
const mutableLayer = () => JSON.parse(JSON.stringify(layer)) as TechnicalDailyLifeLayer;

describe("technical daily-life production layer v2.1", () => {
  it("1. points the active pointer to an existing compatible release", () => {
    expect(() => assertActiveTechnicalDailyLifePointer()).not.toThrow();
    expect(activePointer).toMatchObject({ activeTechnicalDailyLifeRelease: manifest.releaseId, compatibleCatalogRelease: "v0.55.0", schemaVersion: 1 });
  });

  it("2. matches the manifest checksum to the canonical release bytes", () => {
    expect(sha256Text(readFileSync(rawReleasePath, "utf8"))).toBe(manifest.contentChecksum);
  });

  it("3. preserves 31 technical fields and 117 mappings", () => {
    expect(layer.fields).toHaveLength(31);
    expect(mappings).toHaveLength(117);
    expect(mappings.reduce((sum, mapping) => sum + mapping.dailyLifeExamples.length, 0)).toBe(220);
    expect(mappings.reduce((sum, mapping) => sum + mapping.advisorQuestions.length, 0)).toBe(321);
  });

  it("4. preserves interpretation class counts 13/56/48", () => {
    const count = (value: InterpretationClass) => mappings.filter((mapping) => mapping.interpretationClass === value).length;
    expect([count("DECISION_SAFE"), count("GUIDED_APPROXIMATION"), count("ILLUSTRATIVE_ONLY")]).toEqual([13, 56, 48]);
  });

  it("5. preserves ranking effect counts 13/56/48", () => {
    const count = (value: RankingEffect) => mappings.filter((mapping) => mapping.rankingEffect === value).length;
    expect([count("DIRECT_FILTER"), count("SOFT_UNTIL_CONFIRMED"), count("NONE")]).toEqual([13, 56, 48]);
  });

  it("6. requires globally unique mapping ids", () => {
    expect(new Set(mappings.map((mapping) => mapping.mappingId)).size).toBe(mappings.length);
  });

  it("7. accepts only the closed vocabulary encoded by the schema", () => {
    expect(() => parseTechnicalDailyLifeLayer(layerJson)).not.toThrow();
    expect(validateTechnicalDailyLifeLayer(layer)).toEqual([]);
  });

  it("8. validates active catalog paths, types and units", () => {
    expect(compatibility()).toEqual([]);
  });

  it("9. rejects an unintended numeric band overlap", () => {
    const changed = mutableLayer();
    const luggage = changed.fields.find((field) => field.technicalField === "luggageVolume")!;
    (luggage.usageMappings[1].technicalCondition as { min: number }).min = 299;
    expect(compatibility(changed).some((issue) => issue.code === "OVERLAPPING_NUMERIC_BANDS")).toBe(true);
  });

  it("10. covers categorical values used by decision-ready catalog fields", () => {
    expect(compatibility().filter((issue) => issue.code === "UNCOVERED_CATEGORICAL_VALUE")).toEqual([]);
  });

  it("11. resolves 420 L luggage to its exact band", () => {
    expect(resolveTechnicalDailyLifeMappings({ technicalField: "luggageVolume", technicalValue: 420 }).map((item) => item.mappingId))
      .toEqual(["luggage-volume--400-499"]);
  });

  it("12. resolves 300 L and 400 L boundaries to one band each", () => {
    expect(resolveTechnicalDailyLifeMappings({ technicalField: "luggageVolume", technicalValue: 300 }).map((item) => item.mappingId)).toEqual(["luggage-volume--300-399"]);
    expect(resolveTechnicalDailyLifeMappings({ technicalField: "luggageVolume", technicalValue: 400 }).map((item) => item.mappingId)).toEqual(["luggage-volume--400-499"]);
  });

  it("13. narrows results by usage context", () => {
    expect(resolveTechnicalDailyLifeMappings({ technicalField: "luggageVolume", technicalValue: 420, usageContexts: ["TRAVEL"] })).toHaveLength(1);
    expect(resolveTechnicalDailyLifeMappings({ technicalField: "luggageVolume", technicalValue: 420, usageContexts: ["CHARGING_HOME"] })).toEqual([]);
  });

  it("14. returns no result for an unknown technical field", () => {
    expect(getTechnicalDailyLifeMappings("unknownField")).toEqual([]);
    expect(resolveTechnicalDailyLifeMappings({ technicalField: "unknownField", technicalValue: 1 })).toEqual([]);
  });

  it("15. returns no result for a missing technical value", () => {
    expect(resolveTechnicalDailyLifeMappings({ technicalField: "luggageVolume", technicalValue: undefined })).toEqual([]);
  });

  it("16. never auto-triggers USER_PROVIDED_BOUND or USER_PROVIDED_EXACT_VALUE", () => {
    expect(resolveTechnicalDailyLifeMappings({ technicalField: "luggageVolume", technicalValue: 420 })
      .some((mapping) => mapping.technicalCondition.operator.startsWith("USER_PROVIDED"))).toBe(false);
  });

  it("17. enforces DECISION_SAFE invariants", () => {
    expect(mappings.filter((item) => item.interpretationClass === "DECISION_SAFE").every((item) => (
      item.rankingEffect === "DIRECT_FILTER" && item.hardFilterEligible && !item.confirmationRequiredForHardFilter
    ))).toBe(true);
  });

  it("18. prevents GUIDED_APPROXIMATION from direct hard filtering", () => {
    expect(mappings.filter((item) => item.interpretationClass === "GUIDED_APPROXIMATION").every((item) => (
      item.rankingEffect === "SOFT_UNTIL_CONFIRMED" && !item.hardFilterEligible && item.confirmationRequiredForHardFilter
    ))).toBe(true);
  });

  it("19. prevents ILLUSTRATIVE_ONLY from filtering or ranking", () => {
    const forbidden = new Set(["MAP_TO_TECHNICAL_RANGE", "SOFT_PREFERENCE_ONLY", "HARD_FILTER_AFTER_CONFIRMATION", "HARD_FILTER_DIRECT"]);
    expect(mappings.filter((item) => item.interpretationClass === "ILLUSTRATIVE_ONLY").every((item) => (
      item.rankingEffect === "NONE" && !item.hardFilterEligible && !item.confirmationRequiredForHardFilter
      && item.decisionUse.every((use) => !forbidden.has(use))
    ))).toBe(true);
  });

  it("20. keeps PHEV and BEV range/consumption mappings separate", () => {
    expect(resolveTechnicalDailyLifeMappings({ technicalField: "electricRange", technicalValue: 100, dependentFieldValues: { fuelType: "PHEV" } })
      .map((item) => item.mappingId)).toEqual(["electric-range--phev-10-150"]);
    expect(resolveTechnicalDailyLifeMappings({ technicalField: "electricRange", technicalValue: 500,
      dependentFieldValues: { fuelType: "BEV", combinedElectricConsumption: 18, maxDcChargePower: 150 } }).map((item) => item.mappingId))
      .toEqual(["electric-range--bev-3"]);
    expect(resolveTechnicalDailyLifeMappings({ technicalField: "combinedFuelConsumption", technicalValue: 2,
      dependentFieldValues: { fuelType: "PHEV", electricRange: 80, efficiencyProtocol: "WLTP" } }).map((item) => item.mappingId))
      .toEqual(["combined-fuel-consumption--phev-weighted"]);
  });

  it("21. accepts a new variant when its values stay inside existing bands and vocabularies", () => {
    const extra = JSON.parse(JSON.stringify(catalog.records[0]));
    extra.variant.id = "synthetic-compatible-variant";
    expect(compatibility(layer, [...catalog.records, extra])).toEqual([]);
  });

  it("22. rejects a new uncovered categorical value", () => {
    const records = JSON.parse(JSON.stringify(catalog.records));
    records[0].variant.powertrain.fuelType.value = "AMMONIA";
    expect(compatibility(layer, records).some((issue) => issue.code === "UNCOVERED_CATEGORICAL_VALUE" && issue.field === "fuelType")).toBe(true);
  });

  it("23. rejects an incompatible active catalog version", () => {
    expect(compatibility(layer, catalog.records, "v0.56.0").some((issue) => issue.code === "CATALOG_RELEASE_MISMATCH")).toBe(true);
  });

  it("24. keeps raw camelCase catalog keys out of user-facing copy", () => {
    const rawKeys = layer.fields.flatMap((field) => field.catalogPath?.match(/[a-z]+[A-Z][A-Za-z]+/g) ?? []);
    const userCopy = mappings.flatMap((mapping) => [
      ...mapping.dailyLifeExamples.map((item) => item.text), ...mapping.advisorQuestions.map((item) => item.text),
      ...mapping.userFacingExplanations.map((item) => item.text), mapping.userFacingQualifier,
    ]).join("\n");
    expect(rawKeys.filter((key) => userCopy.includes(key))).toEqual([]);
  });

  it("25. exposes exact mapping lookup and active release metadata without mutation", () => {
    expect(getTechnicalDailyLifeMappingById("luggage-volume--400-499")?.mappingId).toBe("luggage-volume--400-499");
    expect(loadActiveTechnicalDailyLifeLayer()).toMatchObject({ release: manifest.releaseId, compatibleCatalogRelease: "v0.55.0" });
  });

  it("26. keeps generated active-module sync idempotent", () => {
    const generated = "data/production/technical-daily-life/activeTechnicalDailyLife.generated.ts";
    const before = readFileSync(generated, "utf8");
    execFileSync("node", ["--import", "tsx", "scripts/sync-active-technical-daily-life.ts"], { stdio: "pipe" });
    expect(readFileSync(generated, "utf8")).toBe(before);
  });

  it("27. reports categorical values removed by a future catalog", () => {
    const withoutLpg = catalog.records.filter((record) => record.variant.powertrain.fuelType.value !== "LPG");
    expect(compatibility(layer, withoutLpg).some((issue) => issue.code === "STALE_CATEGORICAL_MAPPING_VALUE" && issue.field === "fuelType")).toBe(true);
  });

  it("28. reports critical coverage drift without blocking a one-variant count change", () => {
    const compatible = JSON.parse(JSON.stringify(catalog.records[0]));
    compatible.variant.id = "one-more-compatible";
    expect(compatibility(layer, [...catalog.records, compatible]).some((issue) => issue.code === "CRITICAL_COVERAGE_DRIFT")).toBe(false);
    const sparse = Array.from({ length: 100 }, (_, index) => {
      const record = JSON.parse(JSON.stringify(catalog.records[0]));
      record.variant.id = `sparse-${index}`;
      delete record.variant.dimensions.luggageLitres;
      return record;
    });
    expect(compatibility(layer, [...catalog.records, ...sparse]).some((issue) => issue.code === "CRITICAL_COVERAGE_DRIFT" && issue.field === "luggageVolume")).toBe(true);
  });
});
