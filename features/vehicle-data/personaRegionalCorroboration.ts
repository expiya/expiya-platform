import { createHash } from "node:crypto";
import { z } from "zod";

import { VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY } from "@/types/vehiclePersonaSafeTraits";

const id = z.string().trim().min(1).max(1024);
const sha = z.string().regex(/^sha256:[a-f0-9]{64}$/u);

export const personaRegionalCorroborationSchema = z.strictObject({
  schemaVersion: z.literal("1.0.0-rc.1"),
  releaseVersion: id,
  compatiblePersonaEvidenceChecksum: sha,
  wave: z.literal("WAVE_01_EDITORIAL_ENRICHED_FAMILIES"),
  targetFamilyCount: z.literal(154),
  decisionUse: z.literal("RESEARCH_AND_OWNER_REVIEW_ONLY"),
  activationPerformed: z.literal(false),
  ownerApproval: z.null(),
  generatedAt: z.iso.datetime({ offset: false }),
  families: z.array(z.strictObject({
    familyId: id,
    canonicalBrand: id,
    canonicalModel: id,
    exactVariantIds: z.array(id).min(1),
    claims: z.array(z.strictObject({
      personaClaimId: id,
      trait: z.enum(VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY),
      status: z.enum(["CORROBORATES", "CONFLICTS", "MARKET_SPECIFIC", "RESEARCH_REQUIRED"]),
      regionalSourceIds: z.array(id),
      regionalMarkets: z.array(id),
      rationale: id,
    })).min(1),
    familyStatus: z.enum(["CORROBORATED", "CONFLICT_REVIEW_REQUIRED", "MARKET_SPECIFIC_REVIEW_REQUIRED", "RESEARCH_REQUIRED"]),
    rankingMutationAllowed: z.literal(false),
    ownerReviewRequired: z.literal(true),
  })).length(154),
}).superRefine((release, context) => {
  if (new Set(release.families.map((family) => family.familyId)).size !== 154) context.addIssue({ code: "custom", path: ["families"], message: "Wave 01 family IDs must be unique." });
  for (const family of release.families) {
    if (family.claims.some((claim) => claim.status === "CORROBORATES" && claim.regionalSourceIds.length === 0)) context.addIssue({ code: "custom", path: [family.familyId], message: "Corroboration requires a regional source." });
  }
});

export const regionalCorroborationChecksum = (raw: string): string => `sha256:${createHash("sha256").update(raw).digest("hex")}`;
