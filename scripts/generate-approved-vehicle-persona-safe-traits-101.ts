import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateVehiclePersonaSafeTraitRelease, vehiclePersonaSafeTraitManifestSchema, vehiclePersonaSafeTraitReleaseSchema } from "@/features/vehicle-data/vehiclePersonaSafeTraits";
import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { buildModelFamilyIndexes } from "@/features/decision/v2/catalog/familyIndex";
import type { VehiclePersonaSafeTraitManifest, VehiclePersonaSafeTraitRelease } from "@/types/vehiclePersonaSafeTraits";

const ROOT = process.cwd();
const SOURCE_RELEASE = "v1.0.0-catalog-v0.55.0-2026-08-16";
const RELEASE_VERSION = "v1.0.1-catalog-v0.55.0-2026-08-16";
const APPROVED_AT = "2026-08-16T18:55:59.000Z";
const PROPOSED_PATH = "outputs/vehicle-persona-safe-traits-owner-review-v1.0.0-catalog-v0.55.0-2026-08-16/proposed-safe-traits.json";
const PROPOSED_CHECKSUM = "sha256:844fbac9b6e26c7f7c8a5ae0d79ae88545548f46260b60441ffcf46142be92db";
const CATALOG_RELEASE = "v0.55.0";
const CATALOG_FINGERPRINT = "sha256:fc0c03c45dae679545dc85d3ddc2e69a2663ce688541459cd7201c9c9dcba4b3";
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
async function immutable(file: string, content: string) { try { await writeFile(file, content, { encoding: "utf8", flag: "wx" }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; if (await readFile(file, "utf8") !== content) throw new Error(`IMMUTABLE_RELEASE_ARTIFACT_DIFFERS:${file}`); } }

async function main(): Promise<void> {
  const proposedRaw = await readFile(path.join(ROOT, PROPOSED_PATH), "utf8");
  const proposedHash = `sha256:${createHash("sha256").update(proposedRaw).digest("hex")}`;
  if (proposedHash !== PROPOSED_CHECKSUM) throw new Error("APPROVED_PROJECTION_CHECKSUM_MISMATCH");
  const proposed = JSON.parse(proposedRaw) as { policyVersion: string; families: { familyId: string; proposedTraits: VehiclePersonaSafeTraitRelease["families"][number]["traits"]; derivationReasons: NonNullable<VehiclePersonaSafeTraitRelease["families"][number]["traitDerivations"]> }[] };
  const draft = JSON.parse(await readFile(path.join(ROOT, "data/production/personas/safe-traits/releases", SOURCE_RELEASE, "vehicle-persona-safe-traits.json"), "utf8")) as VehiclePersonaSafeTraitRelease;
  const proposedByFamily = new Map(proposed.families.map((family) => [family.familyId, family]));
  const families = draft.families.map((family) => {
    const approved = proposedByFamily.get(family.familyId); if (!approved) throw new Error(`APPROVAL_FAMILY_MISSING:${family.familyId}`);
    return { ...family, traits: approved.proposedTraits, traitDerivations: approved.derivationReasons, reviewStatus: "OWNER_APPROVED" as const, ownerDecision: approved.proposedTraits.length > 0 ? "APPROVE" as const : "KEEP_EMPTY" as const };
  });
  const traitsByFamily = new Map(families.map((family) => [family.familyId, family.traits]));
  const variants = draft.variants.map((variant) => ({ ...variant, traits: traitsByFamily.get(variant.familyId) ?? [] }));
  const approval = { authority: "PRODUCT_OWNER" as const, reference: "owner-approved-safe-persona-projection-v1.0.1" as const, approvedSourceRelease: SOURCE_RELEASE, approvedProposedSafeTraitsChecksum: proposedHash, approvedAt: APPROVED_AT, sanitizationPolicyVersion: proposed.policyVersion, scope: "SANITIZED_PROJECTION_ONLY" as const };
  const release: VehiclePersonaSafeTraitRelease = { ...draft, schemaVersion: "1.1.0", releaseVersion: RELEASE_VERSION, families, variants, generatedAt: APPROVED_AT, approval };
  const rawPayload = json(release); const payloadSha256 = `sha256:${createHash("sha256").update(rawPayload).digest("hex")}`;
  const approvedNonEmptyFamilyCount = families.filter((family) => family.traits.length > 0).length;
  const keepEmptyFamilyCount = families.filter((family) => family.traits.length === 0).length;
  const traitDistribution = Object.fromEntries(release.traitVocabulary.map((trait) => [trait, families.filter((family) => family.traits.includes(trait)).length])) as VehiclePersonaSafeTraitManifest["traitDistribution"];
  const manifest: VehiclePersonaSafeTraitManifest = {
    releaseVersion: RELEASE_VERSION, schemaVersion: "1.1.0", authority: "OWNER_EDITORIAL", decisionUse: "SOFT_PREFERENCE_ONLY",
    compatibleCatalogRelease: CATALOG_RELEASE, compatibleCatalogFingerprint: CATALOG_FINGERPRINT,
    sourcePersonaDatasetVersion: release.sourcePersonaDatasetVersion, sourceSafeDraftRelease: SOURCE_RELEASE,
    sanitizationPolicyVersion: proposed.policyVersion, ownerApprovalReference: approval.reference,
    approvedNonEmptyFamilyCount, keepEmptyFamilyCount, approval,
    familyCount: families.length, variantCount: variants.length,
    matchCounts: { MATCHED: families.filter((family) => family.matchStatus === "MATCHED").length, AMBIGUOUS: families.filter((family) => family.matchStatus === "AMBIGUOUS").length, UNMATCHED: families.filter((family) => family.matchStatus === "UNMATCHED").length },
    emptyTraitFamilyCount: keepEmptyFamilyCount, emptyTraitVariantCount: variants.filter((variant) => variant.traits.length === 0).length,
    reviewCounts: { PROGRAMMATIC_DRAFT: 0, OWNER_REVIEW_REQUIRED: 0, OWNER_APPROVED: families.length }, traitDistribution,
    payloadSha256, validationStatus: "VALIDATED",
    declaredLimitations: ["approval-applies-only-to-sanitized-proposed-safe-traits-checksum", "raw-editorial-persona-text-is-not-approved-or-included", "removed-twenty-nine-traits-remain-excluded", "comfort-practicality-value-family-remain-disabled", "compatible-catalog-currently-future-effective-at-2026-08-16-runtime-clock", "catalog-version-or-fingerprint-change-requires-a-new-compatible-safe-persona-release"],
  };
  vehiclePersonaSafeTraitReleaseSchema.parse(release); vehiclePersonaSafeTraitManifestSchema.parse(manifest);
  const catalog = JSON.parse(await readFile(path.join(ROOT, "data/production/catalog/releases/v0.55.0/catalog.json"), "utf8")) as { records: { variant: { id: string; brand: { value: string }; model: { value: string } } }[] };
  const catalogVariants = catalog.records.map(({ variant }) => ({ id: variant.id, brand: variant.brand.value, model: variant.model.value })) as CatalogVariantSnapshot[];
  const catalogFamilies = buildModelFamilyIndexes(catalogVariants).familyIndex.values().map((family) => ({ familyId: family.familyId, variantIds: family.variantIds }));
  const errors = validateVehiclePersonaSafeTraitRelease({ release, manifest, rawPayload, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, catalogVariantIds: catalogVariants.map((variant) => variant.id), catalogFamilies });
  if (errors.length) throw new Error(`APPROVED_RELEASE_INVALID:${errors.join(",")}`);
  if (families.length !== 397 || variants.length !== 577 || approvedNonEmptyFamilyCount !== 232 || keepEmptyFamilyCount !== 165) throw new Error("OWNER_APPROVAL_COUNTS_INVALID");
  const directory = path.join(ROOT, "data/production/personas/safe-traits/releases", RELEASE_VERSION); await mkdir(directory, { recursive: true });
  await immutable(path.join(directory, "vehicle-persona-safe-traits.json"), rawPayload); await immutable(path.join(directory, "manifest.json"), json(manifest));
  console.log(JSON.stringify({ releaseVersion: RELEASE_VERSION, payloadSha256, approvedNonEmptyFamilyCount, keepEmptyFamilyCount, familyCount: families.length, variantCount: variants.length }));
}
void main();
