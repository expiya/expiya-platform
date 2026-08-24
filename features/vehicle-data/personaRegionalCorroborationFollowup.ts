import { createHash } from "node:crypto";
import { z } from "zod";

import { VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY } from "@/types/vehiclePersonaSafeTraits";

const id = z.string().trim().min(1).max(1024);
const sha = z.string().regex(/^sha256:[a-f0-9]{64}$/u);

export const personaRegionalCorroborationFollowupSchema = z.strictObject({
  schemaVersion: z.literal("1.0.0-rc.1"),
  releaseVersion: id,
  compatiblePersonaEvidenceChecksum: sha,
  predecessorReleaseChecksum: sha,
  wave: z.enum([
    "WAVE_02_PRESTIGE_VALUE_ADVENTURE",
    "WAVE_03_COMFORT_PRACTICALITY_TECHNOLOGY",
    "WAVE_04_FINAL_REMAINING_NEUTRAL_TRAITS",
  ]),
  includedTraits: z.array(z.enum(VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY)).min(1),
  targetFamilyCount: z.number().int().positive(),
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
    familyStatus: z.enum(["CORROBORATED", "PARTIALLY_CORROBORATED", "CONFLICT_REVIEW_REQUIRED", "MARKET_SPECIFIC_REVIEW_REQUIRED", "RESEARCH_REQUIRED"]),
    rankingMutationAllowed: z.literal(false),
    ownerReviewRequired: z.literal(true),
  })).min(1),
}).superRefine((release, context) => {
  if (release.families.length !== release.targetFamilyCount) {
    context.addIssue({ code: "custom", path: ["families"], message: "Target family count must match the ledger." });
  }
  if (new Set(release.families.map((family) => family.familyId)).size !== release.families.length) {
    context.addIssue({ code: "custom", path: ["families"], message: "Family IDs must be unique within a wave." });
  }
  const allowedTraits = new Set(release.includedTraits);
  for (const family of release.families) {
    for (const claim of family.claims) {
      if (!allowedTraits.has(claim.trait)) context.addIssue({ code: "custom", path: [family.familyId, claim.personaClaimId], message: "Claim is outside the wave trait scope." });
      if (claim.status === "CORROBORATES" && claim.regionalSourceIds.length === 0) context.addIssue({ code: "custom", path: [family.familyId, claim.personaClaimId], message: "Corroboration requires a regional source." });
    }
  }
});

export const regionalFollowupChecksum = (raw: string): string => `sha256:${createHash("sha256").update(raw).digest("hex")}`;
