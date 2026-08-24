import { createHash } from "node:crypto";
import { z } from "zod";

import { VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY } from "@/types/vehiclePersonaSafeTraits";
import type {
  VehiclePersonaSafeTraitManifest, VehiclePersonaSafeTraitPointer, VehiclePersonaSafeTraitRelease,
} from "@/types/vehiclePersonaSafeTraits";

const id = z.string().trim().min(1).max(256);
const sha256 = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
const trait = z.enum(VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY);
const review = z.enum(["PROGRAMMATIC_DRAFT", "OWNER_REVIEW_REQUIRED", "OWNER_APPROVED"]);
const match = z.enum(["MATCHED", "AMBIGUOUS", "UNMATCHED"]);
const authority = z.literal("OWNER_EDITORIAL");
const decisionUse = z.literal("SOFT_PREFERENCE_ONLY");
const sourceReference = z.strictObject({ personaDatasetVersion: id, brand: id, seriesGroup: id });
const approval = z.strictObject({
  authority: z.literal("PRODUCT_OWNER"), reference: id,
  approvedSourceRelease: id, approvedProposedSafeTraitsChecksum: sha256, approvedAt: z.iso.datetime({ offset: false }),
  sanitizationPolicyVersion: id, scope: z.literal("SANITIZED_PROJECTION_ONLY"),
});
const derivationReason = z.enum(["NEUTRAL_DESIGN_CHARACTER", "NEUTRAL_DRIVING_CHARACTER", "NEUTRAL_TECHNOLOGY_CHARACTER", "NEUTRAL_PRESTIGE_CHARACTER", "CANONICAL_COMMERCIAL_ARCHITECTURE", "ELECTRIFIED_SUSTAINABILITY_CHARACTER", "NEUTRAL_ADVENTURE_CHARACTER", "NEUTRAL_URBAN_CHARACTER", "NEUTRAL_MINIMALISM_CHARACTER", "OWNER_REVIEWED_EDITORIAL_CHARACTER"]);

export const vehiclePersonaSafeTraitReleaseSchema = z.strictObject({
  schemaVersion: z.enum(["1.0.0", "1.1.0"]), releaseVersion: id,
  compatibleCatalogRelease: id, compatibleCatalogFingerprint: sha256,
  sourcePersonaDatasetVersion: id, sourcePersonaSchemaVersion: id,
  authority, decisionUse, traitVocabulary: z.tuple(VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY.map((value) => z.literal(value)) as [z.ZodLiteral<"DESIGN">, ...z.ZodType[]]),
  families: z.array(z.strictObject({
    familyId: id, canonicalBrand: id, canonicalModel: id, sourceSeriesGroup: id.nullable(),
    traits: z.array(trait), traitDerivations: z.array(z.strictObject({ trait, reasonCode: derivationReason })).optional(), matchAuthority: z.literal("DETERMINISTIC_CATALOG_MATCH"), matchStatus: match,
    reviewStatus: review, ownerDecision: z.enum(["APPROVE", "KEEP_EMPTY"]).optional(), sourceReference: sourceReference.optional(),
  })).max(10_000),
  variants: z.array(z.strictObject({ exactVariantId: id, familyId: id, traits: z.array(trait), authority, decisionUse })).max(20_000),
  generatedAt: z.iso.datetime({ offset: false }), approval: approval.optional(),
}).superRefine((release, context) => {
  const canonical: readonly string[] = VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY;
  const check = (traits: readonly string[], path: (string | number)[]) => {
    if (new Set(traits).size !== traits.length || traits.some((value, index) => index > 0 && canonical.indexOf(value) <= canonical.indexOf(traits[index - 1]!))) {
      context.addIssue({ code: "custom", path, message: "Traits must be unique and in canonical vocabulary order." });
    }
  };
  release.families.forEach((family, index) => {
    check(family.traits, ["families", index, "traits"]);
    if (family.matchStatus === "MATCHED" && !family.sourceReference) context.addIssue({ code: "custom", path: ["families", index, "sourceReference"], message: "Matched family requires source reference." });
    if (family.matchStatus !== "MATCHED" && family.traits.length > 0) context.addIssue({ code: "custom", path: ["families", index, "traits"], message: "Unresolved family cannot carry traits." });
  });
  release.variants.forEach((variant, index) => check(variant.traits, ["variants", index, "traits"]));
  if (release.schemaVersion === "1.1.0") {
    if (!release.approval) context.addIssue({ code: "custom", path: ["approval"], message: "Approved schema requires approval provenance." });
    release.families.forEach((family, index) => {
      if (family.reviewStatus !== "OWNER_APPROVED") context.addIssue({ code: "custom", path: ["families", index, "reviewStatus"], message: "Approved release requires OWNER_APPROVED families." });
      if (family.traits.length > 0 && family.ownerDecision !== "APPROVE") context.addIssue({ code: "custom", path: ["families", index, "ownerDecision"], message: "Non-empty approved family requires APPROVE." });
      if (family.traits.length === 0 && family.ownerDecision !== "KEEP_EMPTY") context.addIssue({ code: "custom", path: ["families", index, "ownerDecision"], message: "Empty approved family requires KEEP_EMPTY." });
      if (!family.traitDerivations || JSON.stringify(family.traitDerivations.map((item) => item.trait)) !== JSON.stringify(family.traits)) context.addIssue({ code: "custom", path: ["families", index, "traitDerivations"], message: "Approved traits require one ordered safe derivation reason each." });
    });
  }
});

export const vehiclePersonaSafeTraitManifestSchema = z.strictObject({
  releaseVersion: id, schemaVersion: z.enum(["1.0.0", "1.1.0"]), authority, decisionUse,
  compatibleCatalogRelease: id, compatibleCatalogFingerprint: sha256, sourcePersonaDatasetVersion: id,
  sourceSafeDraftRelease: id.optional(), sanitizationPolicyVersion: id.optional(), ownerApprovalReference: id.optional(),
  approvedNonEmptyFamilyCount: z.number().int().nonnegative().optional(), keepEmptyFamilyCount: z.number().int().nonnegative().optional(), approval: approval.optional(),
  familyCount: z.number().int().nonnegative(), variantCount: z.number().int().nonnegative(),
  matchCounts: z.strictObject({ MATCHED: z.number().int().nonnegative(), AMBIGUOUS: z.number().int().nonnegative(), UNMATCHED: z.number().int().nonnegative() }),
  emptyTraitFamilyCount: z.number().int().nonnegative(), emptyTraitVariantCount: z.number().int().nonnegative(),
  reviewCounts: z.strictObject({ PROGRAMMATIC_DRAFT: z.number().int().nonnegative(), OWNER_REVIEW_REQUIRED: z.number().int().nonnegative(), OWNER_APPROVED: z.number().int().nonnegative() }),
  traitDistribution: z.record(trait, z.number().int().nonnegative()), payloadSha256: sha256,
  validationStatus: z.literal("VALIDATED"), declaredLimitations: z.array(z.string().trim().min(1)).max(64),
}).superRefine((manifest, context) => {
  if (manifest.schemaVersion === "1.1.0" && (!manifest.approval || manifest.approvedNonEmptyFamilyCount === undefined || manifest.keepEmptyFamilyCount === undefined || !manifest.sourceSafeDraftRelease || !manifest.sanitizationPolicyVersion || !manifest.ownerApprovalReference)) context.addIssue({ code: "custom", path: ["approval"], message: "Approved manifest provenance is incomplete." });
});

export const vehiclePersonaSafeTraitLifecycleManifestSchema = z.strictObject({
  releaseVersion: id,
  compatibleCatalogRelease: id,
  compatibleCatalogFingerprint: sha256,
  payloadSha256: sha256,
  familyCount: z.number().int().nonnegative(),
  variantCount: z.number().int().nonnegative(),
  authority,
  decisionUse,
  validationStatus: z.literal("VALIDATED_PRE_ACTIVATION"),
  activationPerformed: z.literal(false),
  activationApprovalId: z.null(),
});

export const vehiclePersonaSafeTraitPointerSchema = z.strictObject({
  state: z.literal("ACTIVE"), activeReleaseVersion: id, compatibleCatalogRelease: id,
  compatibleCatalogFingerprint: sha256, payloadSha256: sha256, schemaVersion: z.enum(["1.0.0", "1.1.0"]),
});

export function vehiclePersonaSafeTraitPayloadHash(rawPayload: string): string {
  return `sha256:${createHash("sha256").update(rawPayload).digest("hex")}`;
}

export function validateVehiclePersonaSafeTraitRelease(input: {
  readonly release: unknown; readonly manifest: unknown; readonly pointer?: unknown;
  readonly rawPayload: string; readonly catalogRelease: string; readonly catalogFingerprint: string;
  readonly catalogVariantIds: readonly string[]; readonly catalogFamilies: readonly { familyId: string; variantIds: readonly string[] }[];
}): readonly string[] {
  const errors: string[] = [];
  const releaseResult = vehiclePersonaSafeTraitReleaseSchema.safeParse(input.release);
  const canonicalManifestResult = vehiclePersonaSafeTraitManifestSchema.safeParse(input.manifest);
  const lifecycleManifestResult = canonicalManifestResult.success
    ? undefined
    : vehiclePersonaSafeTraitLifecycleManifestSchema.safeParse(input.manifest);
  const pointerResult = input.pointer === undefined ? undefined : vehiclePersonaSafeTraitPointerSchema.safeParse(input.pointer);
  if (!releaseResult.success) return Object.freeze([`PAYLOAD_SCHEMA_INVALID:${releaseResult.error.issues[0]?.message ?? "unknown"}`]);
  if (!canonicalManifestResult.success && !lifecycleManifestResult?.success) return Object.freeze([`MANIFEST_SCHEMA_INVALID:${canonicalManifestResult.error.issues[0]?.message ?? "unknown"}`]);
  if (pointerResult && !pointerResult.success) return Object.freeze(["ACTIVE_POINTER_INVALID"]);
  const release = releaseResult.data;
  const manifest = canonicalManifestResult.success
    ? canonicalManifestResult.data
    : lifecycleManifestResult?.success
      ? lifecycleManifestResult.data
      : undefined;
  if (!manifest) return Object.freeze(["MANIFEST_SCHEMA_INVALID:unknown"]);
  const pointer = pointerResult?.data;
  const hash = vehiclePersonaSafeTraitPayloadHash(input.rawPayload);
  if (hash !== manifest.payloadSha256 || pointer && hash !== pointer.payloadSha256) errors.push("PAYLOAD_CHECKSUM_MISMATCH");
  if (release.releaseVersion !== manifest.releaseVersion || pointer && release.releaseVersion !== pointer.activeReleaseVersion) errors.push("RELEASE_VERSION_MISMATCH");
  if (release.compatibleCatalogRelease !== input.catalogRelease || manifest.compatibleCatalogRelease !== input.catalogRelease || pointer && pointer.compatibleCatalogRelease !== input.catalogRelease) errors.push("CATALOG_RELEASE_INCOMPATIBLE");
  if (release.compatibleCatalogFingerprint !== input.catalogFingerprint || manifest.compatibleCatalogFingerprint !== input.catalogFingerprint || pointer && pointer.compatibleCatalogFingerprint !== input.catalogFingerprint) errors.push("CATALOG_FINGERPRINT_INCOMPATIBLE");
  const variantIds = release.variants.map((item) => item.exactVariantId);
  if (new Set(variantIds).size !== variantIds.length) errors.push("DUPLICATE_VARIANT_ID");
  const expectedIds = [...input.catalogVariantIds].sort();
  if (JSON.stringify([...variantIds].sort()) !== JSON.stringify(expectedIds)) errors.push("VARIANT_COVERAGE_MISMATCH");
  const families = new Map(input.catalogFamilies.map((family) => [family.familyId, family]));
  if (release.families.length !== families.size || release.families.some((family) => !families.has(family.familyId))) errors.push("FAMILY_COVERAGE_MISMATCH");
  const familyByVariant = new Map(input.catalogFamilies.flatMap((family) => family.variantIds.map((id) => [id, family.familyId] as const)));
  if (release.variants.some((item) => familyByVariant.get(item.exactVariantId) !== item.familyId)) errors.push("VARIANT_FAMILY_MISMATCH");
  if (manifest.familyCount !== release.families.length || manifest.variantCount !== release.variants.length) errors.push("MANIFEST_COUNT_MISMATCH");
  if (("schemaVersion" in manifest && release.schemaVersion !== manifest.schemaVersion) || pointer && release.schemaVersion !== pointer.schemaVersion) errors.push("SCHEMA_VERSION_MISMATCH");
  if (release.schemaVersion === "1.1.0" && "schemaVersion" in manifest) {
    const approvedNonEmpty = release.families.filter((family) => family.reviewStatus === "OWNER_APPROVED" && family.traits.length > 0).length;
    const keepEmpty = release.families.filter((family) => family.reviewStatus === "OWNER_APPROVED" && family.traits.length === 0).length;
    if (approvedNonEmpty !== manifest.approvedNonEmptyFamilyCount || keepEmpty !== manifest.keepEmptyFamilyCount) errors.push("OWNER_APPROVAL_COUNT_MISMATCH");
    if (JSON.stringify(release.approval) !== JSON.stringify(manifest.approval) || release.approval?.reference !== manifest.ownerApprovalReference) errors.push("OWNER_APPROVAL_PROVENANCE_MISMATCH");
  }
  return Object.freeze(errors);
}

export function createVehiclePersonaSafeTraitResolver(release: VehiclePersonaSafeTraitRelease) {
  const familyById = new Map(release.families.map((item) => [item.familyId, item]));
  const variantById = new Map(release.variants.map((item) => [item.exactVariantId, item]));
  return Object.freeze({
    releaseVersion: release.releaseVersion,
    compatibleCatalogRelease: release.compatibleCatalogRelease,
    compatibleCatalogFingerprint: release.compatibleCatalogFingerprint,
    resolveFamily: (familyId: string) => familyById.get(familyId),
    resolveVariant: (exactVariantId: string) => variantById.get(exactVariantId),
  });
}

export function selectOwnerApprovedSafePersonaSignals(release: VehiclePersonaSafeTraitRelease) {
  const approvedFamilies = new Set(release.families.filter((family) => family.reviewStatus === "OWNER_APPROVED").map((family) => family.familyId));
  const signals = release.variants.filter((variant) => approvedFamilies.has(variant.familyId) && variant.traits.length > 0)
    .flatMap((variant) => variant.traits.map((trait) => Object.freeze({
      exactVariantId: variant.exactVariantId, trait, authority: "OWNER_EDITORIAL" as const,
      decisionUse: "SOFT_PREFERENCE_ONLY" as const, matchStrength: 1 as const,
    })));
  return Object.freeze({ approvedFamilyCount: approvedFamilies.size, signals: Object.freeze(signals) });
}

export type { VehiclePersonaSafeTraitManifest, VehiclePersonaSafeTraitPointer, VehiclePersonaSafeTraitRelease };
