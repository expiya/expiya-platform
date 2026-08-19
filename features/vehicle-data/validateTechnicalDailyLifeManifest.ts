import { existsSync } from "node:fs";

import { sha256Text } from "@/features/vehicle-data/validateTechnicalDailyLifeLayer";
import type { TechnicalDailyLifeLayer, TechnicalDailyLifeManifest } from "@/types/technicalDailyLife";
import { TECHNICAL_DAILY_LIFE_RELEASE_PATTERN } from "@/features/vehicle-data/technicalDailyLifeReleaseName";

export interface TechnicalDailyLifePreActivationInput {
  readonly manifest: TechnicalDailyLifeManifest & {
    readonly compatibilityRebind?: { readonly type?: string; readonly sourceRelease?: string; readonly catalogFingerprint?: string };
    readonly declaredLimitations?: readonly string[];
  };
  readonly rawPayload: string;
  readonly payload: TechnicalDailyLifeLayer;
  readonly expectedReleaseId: string;
  readonly expectedCatalogRelease: string;
  readonly expectedCatalogFingerprint: string;
  readonly sourceReleaseDirectory: string;
  readonly proposedPointer: { readonly activeTechnicalDailyLifeRelease: string; readonly compatibleCatalogRelease: string; readonly schemaVersion: number };
  readonly proposedGeneratedModule: string;
}

export function validateTechnicalDailyLifeManifestPreActivation(input: TechnicalDailyLifePreActivationInput): readonly string[] {
  const issues: string[] = [];
  const { manifest, payload } = input;
  const mappings = payload.fields.flatMap((field) => field.usageMappings);
  const examples = mappings.flatMap((mapping) => mapping.dailyLifeExamples);
  const questions = mappings.flatMap((mapping) => mapping.advisorQuestions);
  const classCounts = Object.fromEntries(["DECISION_SAFE", "GUIDED_APPROXIMATION", "ILLUSTRATIVE_ONLY"].map((key) => [key, mappings.filter((mapping) => mapping.interpretationClass === key).length]));
  const rankingCounts = Object.fromEntries(["DIRECT_FILTER", "SOFT_UNTIL_CONFIRMED", "NONE"].map((key) => [key, mappings.filter((mapping) => mapping.rankingEffect === key).length]));
  if (manifest.schemaVersion !== 1) issues.push("MANIFEST_SCHEMA_VERSION_INVALID");
  if (!TECHNICAL_DAILY_LIFE_RELEASE_PATTERN.test(manifest.releaseId) || !TECHNICAL_DAILY_LIFE_RELEASE_PATTERN.test(input.proposedPointer.activeTechnicalDailyLifeRelease)) issues.push("MANIFEST_RELEASE_NAME_INVALID");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.producedAt) || Number.isNaN(Date.parse(`${manifest.producedAt}T00:00:00Z`))) issues.push("MANIFEST_PRODUCED_AT_INVALID");
  if (!manifest.source?.identity || !manifest.source.repositoryPath || !/^[0-9a-f]{40}$/.test(manifest.source.sourceHead)) issues.push("MANIFEST_SOURCE_INVALID");
  if (!manifest.counts || manifest.counts.technicalFields !== payload.fields.length || manifest.counts.mappings !== mappings.length || manifest.counts.dailyLifeExamples !== examples.length || manifest.counts.advisorQuestions !== questions.length || JSON.stringify(manifest.counts.interpretationClasses) !== JSON.stringify(classCounts) || JSON.stringify(manifest.counts.rankingEffects) !== JSON.stringify(rankingCounts)) issues.push("MANIFEST_COUNTS_MISMATCH");
  if (manifest.sourceAuthority !== "OWNER_EDITORIAL") issues.push("MANIFEST_SOURCE_AUTHORITY_INVALID");
  if (manifest.releaseId !== input.expectedReleaseId || input.proposedPointer.activeTechnicalDailyLifeRelease !== manifest.releaseId || !input.proposedGeneratedModule.includes(`/releases/${manifest.releaseId}/technical-daily-life.json`)) issues.push("GENERATED_MODULE_RELEASE_MISMATCH");
  if (manifest.compatibleCatalogRelease !== input.expectedCatalogRelease || input.proposedPointer.compatibleCatalogRelease !== input.expectedCatalogRelease || manifest.compatibilityRebind?.catalogFingerprint !== input.expectedCatalogFingerprint) issues.push("CATALOG_COMPATIBILITY_MISMATCH");
  if (manifest.contentChecksum !== sha256Text(input.rawPayload)) issues.push("CONTENT_CHECKSUM_MISMATCH");
  if (manifest.compatibilityRebind?.type !== "COMPATIBILITY_ONLY" || !manifest.compatibilityRebind.sourceRelease || !existsSync(input.sourceReleaseDirectory)) issues.push("SOURCE_RELEASE_NOT_FOUND");
  if (payload.fields.length !== 31 || mappings.length !== 117 || examples.length !== 220 || questions.length !== 321) issues.push("EDITORIAL_COUNTS_CHANGED");
  return issues;
}

export function assertTechnicalDailyLifeManifestPreActivation(input: TechnicalDailyLifePreActivationInput): void {
  const issues = validateTechnicalDailyLifeManifestPreActivation(input);
  if (issues.length) throw new Error(`TECHNICAL_DAILY_LIFE_MANIFEST_PRE_ACTIVATION_FAILED:${issues.join(",")}`);
}
