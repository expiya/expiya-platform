import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseTechnicalDailyLifeLayer } from "../features/vehicle-data/technicalDailyLifeSchema";
import { assertTechnicalDailyLifeCompatibility, sha256Text } from "../features/vehicle-data/validateTechnicalDailyLifeLayer";
import type { InterpretationClass, RankingEffect, TechnicalDailyLifeManifest } from "../types/technicalDailyLife";

async function main(): Promise<void> {
  const root = process.cwd();
  const technicalPointer = JSON.parse(await readFile(path.join(root, "data/production/technical-daily-life/active.json"), "utf8")) as {
    activeTechnicalDailyLifeRelease: string; compatibleCatalogRelease: string; schemaVersion: number;
  };
  const catalogPointer = JSON.parse(await readFile(path.join(root, "data/production/catalog/active.json"), "utf8")) as { active_catalog_release_version: string };
  const releaseDirectory = path.join(root, "data/production/technical-daily-life/releases", technicalPointer.activeTechnicalDailyLifeRelease);
  const [rawLayer, rawManifest, rawCatalog] = await Promise.all([
    readFile(path.join(releaseDirectory, "technical-daily-life.json"), "utf8"),
    readFile(path.join(releaseDirectory, "manifest.json"), "utf8"),
    readFile(path.join(root, `data/production/catalog/releases/v${catalogPointer.active_catalog_release_version}/catalog.json`), "utf8"),
  ]);
  const layer = parseTechnicalDailyLifeLayer(JSON.parse(rawLayer));
  const manifest = JSON.parse(rawManifest) as TechnicalDailyLifeManifest;
  if (technicalPointer.schemaVersion !== manifest.schemaVersion || technicalPointer.activeTechnicalDailyLifeRelease !== manifest.releaseId) throw new Error("TECHNICAL_DAILY_LIFE_POINTER_MANIFEST_MISMATCH");
  if (technicalPointer.compatibleCatalogRelease !== manifest.compatibleCatalogRelease) throw new Error("TECHNICAL_DAILY_LIFE_CATALOG_POINTER_MISMATCH");
  if (manifest.contentChecksum !== sha256Text(rawLayer)) throw new Error("TECHNICAL_DAILY_LIFE_CHECKSUM_MISMATCH");
  const mappings = layer.fields.flatMap((field) => field.usageMappings);
  const dailyLifeExamples = mappings.reduce((sum, mapping) => sum + mapping.dailyLifeExamples.length, 0);
  const advisorQuestions = mappings.reduce((sum, mapping) => sum + mapping.advisorQuestions.length, 0);
  const classCounts = (value: InterpretationClass) => mappings.filter((mapping) => mapping.interpretationClass === value).length;
  const rankingCounts = (value: RankingEffect) => mappings.filter((mapping) => mapping.rankingEffect === value).length;
  if (layer.fields.length !== manifest.counts.technicalFields || mappings.length !== manifest.counts.mappings
    || dailyLifeExamples !== manifest.counts.dailyLifeExamples || advisorQuestions !== manifest.counts.advisorQuestions
    || Object.entries(manifest.counts.interpretationClasses).some(([key, count]) => classCounts(key as InterpretationClass) !== count)
    || Object.entries(manifest.counts.rankingEffects).some(([key, count]) => rankingCounts(key as RankingEffect) !== count)) {
    throw new Error("TECHNICAL_DAILY_LIFE_MANIFEST_COUNT_MISMATCH");
  }
  const catalogRelease = `v${catalogPointer.active_catalog_release_version}`;
  assertTechnicalDailyLifeCompatibility({ layer, records: JSON.parse(rawCatalog).records, catalogRelease, expectedCatalogRelease: manifest.compatibleCatalogRelease });
  console.log(JSON.stringify({ event: "active_technical_daily_life_verified", release: manifest.releaseId,
    checksum: manifest.contentChecksum, catalogRelease, fields: layer.fields.length, mappings: mappings.length,
    dailyLifeExamples, advisorQuestions }));
}

void main();
