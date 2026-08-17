import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import personaSource from "@/data/production/personas/vehicle-personas.v1.json";
import {
  applySafePersonaTraitDerivationPolicy, SAFE_PERSONA_TRAIT_DERIVATION_POLICY_VERSION,
  type SafePersonaRiskFlag,
} from "@/features/vehicle-data/safePersonaTraitDerivationPolicy";
import type { VehiclePersonaSafeTraitRelease } from "@/types/vehiclePersonaSafeTraits";

const ROOT = process.cwd();
const RELEASE = "v1.0.0-catalog-v0.55.0-2026-08-16";
const OUTPUT = path.join(ROOT, `outputs/vehicle-persona-safe-traits-owner-review-${RELEASE}`);
const safeJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const prohibited = /kadın arabası|erkek arabası|aile babası|beyaz yakalı|mafya|makasçı|brandPersona|seriesEditorial|brandEditorial|"persona"\s*:/iu;

async function main(): Promise<void> {
  const releaseRoot = path.join(ROOT, "data/production/personas/safe-traits/releases", RELEASE);
  const release = JSON.parse(await readFile(path.join(releaseRoot, "vehicle-persona-safe-traits.json"), "utf8")) as VehiclePersonaSafeTraitRelease;
  const catalog = JSON.parse(await readFile(path.join(ROOT, "data/production/catalog/releases/v0.55.0/catalog.json"), "utf8")) as { records: { variant: { id: string; bodyStyle: { value: string }; vehicleUseClass?: { value: string }; powertrain: { fuelType: { value: string } } } }[] };
  const catalogById = new Map(catalog.records.map((record) => [record.variant.id, record.variant]));
  const variantsByFamily = new Map<string, typeof release.variants>();
  for (const variant of release.variants) variantsByFamily.set(variant.familyId, [...(variantsByFamily.get(variant.familyId) ?? []), variant]);
  const proposals = release.families.map((family) => {
    const source = family.sourceReference ? personaSource.brands.find((brand) => brand.brand === family.sourceReference!.brand)?.series.find((series) => series.group === family.sourceReference!.seriesGroup) : undefined;
    const variants = variantsByFamily.get(family.familyId) ?? [];
    const technical = variants.map((variant) => catalogById.get(variant.exactVariantId)).filter((value): value is NonNullable<typeof value> => Boolean(value));
    const bodyStyles = [...new Set(technical.map((variant) => variant.bodyStyle.value))].sort();
    const vehicleUseClasses = [...new Set(technical.map((variant) => variant.vehicleUseClass?.value ?? "UNSPECIFIED"))].sort();
    const fuelTypes = [...new Set(technical.map((variant) => variant.powertrain.fuelType.value))].sort();
    const result = applySafePersonaTraitDerivationPolicy({ priorTraits: family.traits, sourceEditorialText: source?.persona ?? "", bodyStyles, vehicleUseClasses, fuelTypes });
    return {
      familyId: family.familyId, canonicalBrand: family.canonicalBrand, canonicalModel: family.canonicalModel,
      bodyStyles, vehicleUseClasses, fuelTypes, proposedTraits: result.traits, derivationReasons: result.reasons,
      priorReviewStatus: family.reviewStatus, proposedReviewStatus: result.reviewStatus, riskFlags: result.riskFlags,
      changed: JSON.stringify(family.traits) !== JSON.stringify(result.traits), reviewerDecision: null,
      reviewerDecisionAllowed: ["APPROVE", "REMOVE_TRAIT", "EDIT_TRAITS", "KEEP_EMPTY"], reviewerNotes: null,
    };
  });
  const priorTraitCount = release.families.reduce((sum, family) => sum + family.traits.length, 0);
  const proposedTraitCount = proposals.reduce((sum, family) => sum + family.proposedTraits.length, 0);
  const removedTraitCount = proposals.reduce((sum, proposal) => {
    const prior = release.families.find((family) => family.familyId === proposal.familyId)?.traits ?? [];
    return sum + prior.filter((trait) => !proposal.proposedTraits.includes(trait)).length;
  }, 0);
  const addedTraitCount = proposals.reduce((sum, proposal) => {
    const prior = release.families.find((family) => family.familyId === proposal.familyId)?.traits ?? [];
    return sum + proposal.proposedTraits.filter((trait) => !prior.includes(trait)).length;
  }, 0);
  const flagCount = (flag: SafePersonaRiskFlag) => proposals.filter((item) => item.riskFlags.includes(flag)).length;
  const summary = {
    sourceRelease: RELEASE, policyVersion: SAFE_PERSONA_TRAIT_DERIVATION_POLICY_VERSION,
    compatibleCatalogRelease: release.compatibleCatalogRelease, compatibleCatalogFingerprint: release.compatibleCatalogFingerprint,
    familyCount: proposals.length, variantCoverage: release.variants.length,
    priorDistribution: {
      nonEmptyProgrammaticDraft: release.families.filter((family) => family.reviewStatus === "PROGRAMMATIC_DRAFT" && family.traits.length > 0).length,
      nonEmptyOwnerReviewRequired: release.families.filter((family) => family.reviewStatus === "OWNER_REVIEW_REQUIRED" && family.traits.length > 0).length,
      empty: release.families.filter((family) => family.traits.length === 0).length,
    },
    semanticResults: {
      priorTraitCount, proposedTraitCount, removedTraitCount, addedTraitCount,
      changedFamilyCount: proposals.filter((item) => item.changed).length,
      safeNonEmptyFamilyCount: proposals.filter((item) => item.proposedTraits.length > 0).length,
      emptyFamilyCount: proposals.filter((item) => item.proposedTraits.length === 0).length,
      ownerReviewRequiredFamilyCount: proposals.filter((item) => item.proposedReviewStatus === "OWNER_REVIEW_REQUIRED").length,
      commercialFalsePositiveCount: flagCount("COMMERCIAL_FALSE_POSITIVE_RISK"),
      sustainabilityMismatchCount: flagCount("SUSTAINABILITY_TECHNICAL_MISMATCH"),
      prestigeSocialClassRiskCount: flagCount("PRESTIGE_SOCIAL_CLASS_RISK"),
      dangerousDrivingRiskCount: flagCount("DANGEROUS_DRIVING_SOURCE_CONTEXT"),
    },
    riskFlagDistribution: Object.fromEntries([
      "DEMOGRAPHIC_SOURCE_CONTEXT", "PROFESSION_SOURCE_CONTEXT", "SOCIAL_CLASS_SOURCE_CONTEXT", "DANGEROUS_DRIVING_SOURCE_CONTEXT",
      "RIVALRY_SOURCE_CONTEXT", "COMMERCIAL_FALSE_POSITIVE_RISK", "SUSTAINABILITY_TECHNICAL_MISMATCH", "PRESTIGE_SOCIAL_CLASS_RISK",
      "ADVENTURE_BODY_MISMATCH", "SAFE_NEUTRAL_CONTEXT", "EMPTY_AFTER_SANITIZATION",
    ].map((flag) => [flag, flagCount(flag as SafePersonaRiskFlag)])),
    traitDistribution: Object.fromEntries(release.traitVocabulary.map((trait) => [trait, proposals.filter((item) => item.proposedTraits.includes(trait)).length])),
  };
  const proposed = { schemaVersion: "1.0.0-review", ...summary, authority: "OWNER_EDITORIAL", decisionUse: "SOFT_PREFERENCE_ONLY", automaticApproval: false, families: proposals };
  const headers = ["familyId", "canonicalBrand", "canonicalModel", "bodyStyle summary", "vehicleUseClass summary", "fuel-type summary", "proposed traits", "derivation reason codes", "prior review status", "proposed review status", "risk flags", "changed/unchanged", "reviewer decision", "reviewer decision allowed", "reviewer notes"];
  const rows = proposals.map((item) => [item.familyId, item.canonicalBrand, item.canonicalModel, item.bodyStyles.join(" | "), item.vehicleUseClasses.join(" | "), item.fuelTypes.join(" | "), item.proposedTraits.join(" | "), item.derivationReasons.map((reason) => `${reason.trait}:${reason.reasonCode}`).join(" | "), item.priorReviewStatus, item.proposedReviewStatus, item.riskFlags.join(" | "), item.changed ? "CHANGED" : "UNCHANGED", "", item.reviewerDecisionAllowed.join(" | "), ""].map(csv).join(","));
  const summaryMd = `# Safe Persona Traits Owner Review Summary\n\n- Source release: \`${RELEASE}\`\n- Policy: \`${SAFE_PERSONA_TRAIT_DERIVATION_POLICY_VERSION}\`\n- Families: ${summary.familyCount}\n- Variant coverage: ${summary.variantCoverage}\n- Safe non-empty proposals: ${summary.semanticResults.safeNonEmptyFamilyCount}\n- Empty after sanitization: ${summary.semanticResults.emptyFamilyCount}\n- Owner review required: ${summary.semanticResults.ownerReviewRequiredFamilyCount}\n- Removed traits: ${summary.semanticResults.removedTraitCount}\n- Added traits from canonical architecture: ${summary.semanticResults.addedTraitCount}\n\nNo family is automatically OWNER_APPROVED. Complete the reviewer decision column in owner-review.csv.\n`;
  const validationMd = `# Validation Report\n\n- Full family coverage: PASS (${summary.familyCount})\n- Full variant coverage: PASS (${summary.variantCoverage})\n- Raw editorial prose excluded: PASS\n- Closed trait vocabulary: PASS\n- Reason codes present for every non-empty trait: PASS\n- Automatic owner approval disabled: PASS\n- T-Cross COMMERCIAL false positive removed: ${proposals.find((item) => item.canonicalBrand === "Volkswagen" && item.canonicalModel === "T-Cross")?.proposedTraits.includes("COMMERCIAL") ? "FAIL" : "PASS"}\n- Model Y COMMERCIAL false positive removed: ${proposals.find((item) => item.canonicalBrand === "Tesla" && item.canonicalModel === "Model Y")?.proposedTraits.includes("COMMERCIAL") ? "FAIL" : "PASS"}\n`;
  const changeMd = `# Change Summary\n\nThis is a non-production owner-review artifact. The immutable ${RELEASE} payload was not modified.\n\n- Changed families: ${summary.semanticResults.changedFamilyCount}\n- Removed traits: ${summary.semanticResults.removedTraitCount}\n- Proposed traits: ${summary.semanticResults.proposedTraitCount}\n- COMMERCIAL false-positive risks cleaned: ${summary.semanticResults.commercialFalsePositiveCount}\n- Sustainability mismatches cleaned: ${summary.semanticResults.sustainabilityMismatchCount}\n- Prestige/social-class risks: ${summary.semanticResults.prestigeSocialClassRiskCount}\n- Dangerous-driving risks: ${summary.semanticResults.dangerousDrivingRiskCount}\n`;
  for (const content of [safeJson(proposed), `${headers.map(csv).join(",")}\n${rows.join("\n")}\n`, summaryMd, validationMd, changeMd]) if (prohibited.test(content)) throw new Error("REVIEW_ARTIFACT_PROHIBITED_TEXT");
  if (proposals.length !== release.families.length || release.variants.length !== 577) throw new Error("REVIEW_COVERAGE_INVALID");
  if (proposals.some((item) => item.proposedTraits.some((trait) => !release.traitVocabulary.includes(trait)))) throw new Error("REVIEW_TRAIT_VOCABULARY_INVALID");
  if (proposals.some((item) => item.proposedTraits.length !== item.derivationReasons.length)) throw new Error("REVIEW_REASON_COVERAGE_INVALID");
  if (proposals.some((item) => item.proposedReviewStatus !== "OWNER_REVIEW_REQUIRED")) throw new Error("AUTOMATIC_APPROVAL_FORBIDDEN");
  await mkdir(OUTPUT, { recursive: true });
  await Promise.all([
    writeFile(path.join(OUTPUT, "proposed-safe-traits.json"), safeJson(proposed), "utf8"),
    writeFile(path.join(OUTPUT, "owner-review.csv"), `${headers.map(csv).join(",")}\n${rows.join("\n")}\n`, "utf8"),
    writeFile(path.join(OUTPUT, "owner-review-summary.md"), summaryMd, "utf8"),
    writeFile(path.join(OUTPUT, "validation-report.md"), validationMd, "utf8"),
    writeFile(path.join(OUTPUT, "change-summary.md"), changeMd, "utf8"),
  ]);
  console.log(JSON.stringify(summary));
}
void main();
