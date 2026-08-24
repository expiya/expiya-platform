import { createHash } from "node:crypto";
import { z } from "zod";

import { VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY } from "@/types/vehiclePersonaSafeTraits";

const id = z.string().trim().min(1).max(1024);
const sha = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
const trait = z.enum(VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY);

export const personaOwnerReviewedCandidateSchema = z.strictObject({
  schemaVersion: z.literal("3.9.0-owner-review.1"),
  releaseVersion: id,
  compatiblePersonaEvidenceChecksum: sha,
  compatibleCatalogRelease: id,
  compatibleCatalogFingerprint: sha,
  authority: z.literal("PRODUCT_OWNER"),
  decisionScope: z.literal("EVIDENCE_SUFFICIENT_ONLY"),
  scorePolicy: z.strictObject({
    formula: z.literal("BASE_SCORE_PLUS_CAPPED_PERSONA"),
    personaScoreCap: z.literal(0.75),
    decisionUse: z.literal("BOUNDED_SOFT_RANKING_ONLY"),
  }),
  ownerApproval: z.strictObject({
    reference: id,
    approvedAt: z.iso.datetime({ offset: false }),
    researchRequiredDisposition: z.literal("DEFER_RESEARCH"),
  }),
  activationPerformed: z.literal(false),
  families: z.array(z.strictObject({
    familyId: id,
    canonicalBrand: id,
    canonicalModel: id,
    exactVariantIds: z.array(id).min(1),
    decision: z.enum(["APPROVE_TRAITS", "APPROVE_PARTIAL_TRAITS", "DEFER_RESEARCH"]),
    approvedTraits: z.array(trait),
    deferredTraits: z.array(trait),
    approvedClaimIds: z.array(id),
    deferredClaimIds: z.array(id),
  })).length(385),
  claims: z.array(z.strictObject({
    claimId: id,
    familyId: id,
    trait,
    derivationPolicy: id,
    decision: z.enum(["APPROVE", "DEFER_RESEARCH"]),
    decisionBasis: z.enum(["EXACT_CATALOG_ARCHITECTURE", "REGIONAL_PROFESSIONAL_CORROBORATION", "REGIONAL_CORROBORATION_REQUIRED"]),
    sourceIds: z.array(id).min(1),
  })).length(600),
  variants: z.array(z.strictObject({
    exactVariantId: id,
    familyId: id,
    approvedTraits: z.array(trait),
  })).length(549),
}).superRefine((candidate, context) => {
  if (new Set(candidate.families.map((family) => family.familyId)).size !== candidate.families.length) context.addIssue({ code: "custom", path: ["families"], message: "Family IDs must be unique." });
  if (new Set(candidate.claims.map((claim) => claim.claimId)).size !== candidate.claims.length) context.addIssue({ code: "custom", path: ["claims"], message: "Claim IDs must be unique." });
  if (new Set(candidate.variants.map((variant) => variant.exactVariantId)).size !== candidate.variants.length) context.addIssue({ code: "custom", path: ["variants"], message: "Variant IDs must be unique." });
  for (const family of candidate.families) {
    if (family.decision === "APPROVE_TRAITS" && (family.approvedTraits.length === 0 || family.deferredTraits.length > 0)) context.addIssue({ code: "custom", path: [family.familyId], message: "Full approval requires non-empty approved traits and no deferred traits." });
    if (family.decision === "APPROVE_PARTIAL_TRAITS" && (family.approvedTraits.length === 0 || family.deferredTraits.length === 0)) context.addIssue({ code: "custom", path: [family.familyId], message: "Partial approval requires both approved and deferred traits." });
    if (family.decision === "DEFER_RESEARCH" && family.approvedTraits.length > 0) context.addIssue({ code: "custom", path: [family.familyId], message: "Deferred family cannot carry approved traits." });
  }
  for (const claim of candidate.claims) {
    if (claim.decisionBasis === "REGIONAL_CORROBORATION_REQUIRED" && claim.decision !== "DEFER_RESEARCH") context.addIssue({ code: "custom", path: [claim.claimId], message: "Research-required claim cannot be approved." });
  }
});

export const personaOwnerReviewedCandidateChecksum = (raw: string): string => `sha256:${createHash("sha256").update(raw).digest("hex")}`;
