import { createHash } from "node:crypto";
import { z } from "zod";

import { VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY } from "@/types/vehiclePersonaSafeTraits";

const id = z.string().trim().min(1).max(512);
const evidenceLocator = z.string().trim().min(1).max(4096);
const sha = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
const trait = z.enum(VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY);

export const personaEvidenceSourceSchema = z.strictObject({
  sourceId: id,
  url: z.url(),
  publisher: id,
  title: id,
  sourceType: z.enum(["OFFICIAL_MARKET_PAGE", "OFFICIAL_GLOBAL_PAGE", "OFFICIAL_TECHNICAL_DOCUMENT", "OFFICIAL_PRESS_KIT", "OFFICIAL_VIDEO", "EDITORIAL_REVIEW", "EDITORIAL_VIDEO"]),
  publicationDate: z.iso.date().nullable(),
  accessedAt: z.iso.datetime({ offset: false }),
  market: id,
  modelYearOrGeneration: id,
  authorityClass: z.enum(["A1_OFFICIAL_MARKET", "A2_OFFICIAL_GLOBAL", "B1_EDITORIAL"]),
  marketApplicability: z.enum(["EXACT_TR_CATALOG", "CHARACTER_ONLY_NO_EQUIPMENT_AUTHORITY"]),
  technicalAuthority: z.literal(false),
});

export const personaEvidenceClaimSchema = z.strictObject({
  claimId: id,
  trait,
  neutralSummary: id,
  sourceIds: z.array(id).min(1),
  supportedSpanOrTimestamp: evidenceLocator,
  exactVariantIds: z.array(id).min(1),
  derivationPolicy: z.enum(["EXACT_CATALOG_COMMERCIAL_ARCHITECTURE", "EXACT_CATALOG_ELECTRIFIED_ARCHITECTURE", "EDITORIAL_CHARACTER_CONSENSUS", "OFFICIAL_EDITORIAL_CHARACTER_CORROBORATION"]),
  conflictStatus: z.enum(["NONE", "CONFLICTING", "INSUFFICIENT"]),
});

export const personaEvidenceFamilySchema = z.strictObject({
  familyId: id,
  canonicalBrand: id,
  canonicalModel: id,
  exactVariantIds: z.array(id).min(1),
  sources: z.array(personaEvidenceSourceSchema),
  claims: z.array(personaEvidenceClaimSchema),
  proposedTraits: z.array(trait),
  evidenceStatus: z.enum(["SOURCE_BACKED", "SOURCE_DISCOVERED_TRAIT_EVIDENCE_INSUFFICIENT", "SOURCE_OUTAGE_OR_MISSING"]),
  reviewStatus: z.literal("OWNER_REVIEW_REQUIRED"),
  ownerDecision: z.null(),
  contaminationChecks: z.strictObject({ exactFamilyBound: z.boolean(), generationVerified: z.boolean(), marketVerified: z.boolean(), crossMarketRejected: z.boolean() }),
}).superRefine((family, context) => {
  const sourceIds = new Set(family.sources.map((source) => source.sourceId));
  const variants = new Set(family.exactVariantIds);
  const claimTraits = family.claims.filter((claim) => claim.conflictStatus === "NONE").map((claim) => claim.trait);
  if (new Set(family.proposedTraits).size !== family.proposedTraits.length) context.addIssue({ code: "custom", path: ["proposedTraits"], message: "Duplicate traits are forbidden." });
  if (family.claims.some((claim) => claim.sourceIds.some((sourceId) => !sourceIds.has(sourceId)))) context.addIssue({ code: "custom", path: ["claims"], message: "Claim references an unknown source." });
  if (family.claims.some((claim) => claim.exactVariantIds.some((variantId) => !variants.has(variantId)))) context.addIssue({ code: "custom", path: ["claims"], message: "Claim crosses the exact family boundary." });
  if (family.proposedTraits.some((value) => !claimTraits.includes(value))) context.addIssue({ code: "custom", path: ["proposedTraits"], message: "Every proposed trait requires a non-conflicting claim." });
  for (const claim of family.claims.filter((candidate) => candidate.derivationPolicy === "EDITORIAL_CHARACTER_CONSENSUS" && candidate.conflictStatus === "NONE")) {
    const cited = claim.sourceIds.map((sourceId) => family.sources.find((source) => source.sourceId === sourceId)).filter(Boolean);
    if (cited.length < 2 || new Set(cited.map((source) => source?.publisher)).size < 2 || cited.some((source) => source?.authorityClass !== "B1_EDITORIAL" || source.marketApplicability !== "CHARACTER_ONLY_NO_EQUIPMENT_AUTHORITY" || source.technicalAuthority !== false)) {
      context.addIssue({ code: "custom", path: ["claims", claim.claimId], message: "Editorial traits require two character-only, non-technical editorial sources." });
    }
  }
  for (const claim of family.claims.filter((candidate) => candidate.derivationPolicy === "OFFICIAL_EDITORIAL_CHARACTER_CORROBORATION" && candidate.conflictStatus === "NONE")) {
    const cited = claim.sourceIds.map((sourceId) => family.sources.find((source) => source.sourceId === sourceId)).filter(Boolean);
    if (!cited.some((source) => source?.authorityClass === "B1_EDITORIAL") || !cited.some((source) => source?.authorityClass === "A2_OFFICIAL_GLOBAL") || cited.some((source) => source?.marketApplicability !== "CHARACTER_ONLY_NO_EQUIPMENT_AUTHORITY" || source.technicalAuthority !== false)) {
      context.addIssue({ code: "custom", path: ["claims", claim.claimId], message: "Official-editorial corroboration requires both authorities and remains character-only." });
    }
  }
  if (family.proposedTraits.length > 0 && (!family.contaminationChecks.exactFamilyBound || !family.contaminationChecks.generationVerified || !family.contaminationChecks.marketVerified || !family.contaminationChecks.crossMarketRejected)) context.addIssue({ code: "custom", path: ["contaminationChecks"], message: "Trait-bearing families require all contamination checks." });
});

export const personaEvidenceReleaseSchema = z.strictObject({
  schemaVersion: z.literal("3.9.0-rc.1"),
  releaseVersion: id,
  compatibleCatalogRelease: id,
  compatibleCatalogFingerprint: sha,
  authority: z.literal("SOURCE_BACKED_OWNER_REVIEW"),
  decisionUse: z.literal("BOUNDED_SOFT_RANKING_ONLY"),
  scoreCap: z.literal(0.75),
  generatedAt: z.iso.datetime({ offset: false }),
  activationPerformed: z.literal(false),
  ownerApproval: z.null(),
  families: z.array(personaEvidenceFamilySchema).min(1),
});

export function validatePersonaEvidenceRelease(input: {
  release: unknown;
  catalogFamilyVariantIds: ReadonlyMap<string, readonly string[]>;
  catalogVariantIds: readonly string[];
  catalogRelease: string;
  catalogFingerprint: string;
}): readonly string[] {
  const parsed = personaEvidenceReleaseSchema.safeParse(input.release);
  if (!parsed.success) return Object.freeze([`SCHEMA_INVALID:${parsed.error.issues[0]?.message ?? "unknown"}`]);
  const release = parsed.data;
  const errors: string[] = [];
  if (release.compatibleCatalogRelease !== input.catalogRelease) errors.push("CATALOG_RELEASE_MISMATCH");
  if (release.compatibleCatalogFingerprint !== input.catalogFingerprint) errors.push("CATALOG_FINGERPRINT_MISMATCH");
  const expectedFamilies = [...input.catalogFamilyVariantIds.keys()].sort();
  const actualFamilies = release.families.map((family) => family.familyId).sort();
  if (JSON.stringify(expectedFamilies) !== JSON.stringify(actualFamilies)) errors.push("FAMILY_COVERAGE_MISMATCH");
  const actualVariants = release.families.flatMap((family) => family.exactVariantIds).sort();
  if (JSON.stringify([...input.catalogVariantIds].sort()) !== JSON.stringify(actualVariants)) errors.push("VARIANT_COVERAGE_MISMATCH");
  for (const family of release.families) {
    const expected = [...(input.catalogFamilyVariantIds.get(family.familyId) ?? [])].sort();
    if (JSON.stringify(expected) !== JSON.stringify([...family.exactVariantIds].sort())) errors.push(`FAMILY_VARIANT_MISMATCH:${family.familyId}`);
  }
  return Object.freeze(errors);
}

export const personaEvidencePayloadSha256 = (raw: string): string => `sha256:${createHash("sha256").update(raw).digest("hex")}`;
