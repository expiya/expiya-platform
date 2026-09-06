import activePointer from "@/data/production/personas/universal/active.json";
import projectionCandidate from "@/data/production/personas/universal/projection-materialization/XPY-UNIVERSAL-PERSONA-PROJECTION-TR-v0.1-owner-review/projection-candidate.json";
import expressionMappings from "@/data/production/personas/universal/projection-materialization/XPY-UNIVERSAL-PERSONA-PROJECTION-TR-v0.1-owner-review/turkish-expression-mappings.json";
import {
  rankWithBoundedSoftSignals,
  type XpyBoundedSoftRankingResult,
  type XpyCandidateSoftSignal,
  type XpyCategorySoftRankingAvailability,
  type XpySoftPreference,
  type XpySoftRankingAuthorityReference,
} from "@/features/xpy/boundedSoftRanking";

export const UNIVERSAL_PERSONA_PROJECTION_RELEASE =
  "XPY-UNIVERSAL-PERSONA-PROJECTION-TR-v0.1-owner-review" as const;
export const UNIVERSAL_PERSONA_PROJECTION_DIGEST =
  "sha256:62d2d5f23cb92b337052fdb0e3eb16c8b96126e3bc156fa16ebaac11be03f4aa" as const;
export const UNIVERSAL_PERSONA_PROJECTION_AUTHORITY = Object.freeze({
  authorityId: "universal-persona-projection",
  version: UNIVERSAL_PERSONA_PROJECTION_RELEASE,
  digest: UNIVERSAL_PERSONA_PROJECTION_DIGEST,
  decisionUse: "BOUNDED_SOFT_RANKING_ONLY",
} satisfies XpySoftRankingAuthorityReference);

if (
  activePointer.releaseId !== UNIVERSAL_PERSONA_PROJECTION_RELEASE ||
  activePointer.packageDigest !== UNIVERSAL_PERSONA_PROJECTION_DIGEST ||
  activePointer.state !== "ACTIVE_BOUNDED_PERSONA_ORDERING"
) {
  throw new TypeError("UNIVERSAL_PERSONA_ACTIVE_POINTER_INVALID");
}

const categoryBindings = new Map(projectionCandidate.categoryBindings.map((binding) => [binding.categoryId, binding]));
const recordsById = new Map(projectionCandidate.records.map((record) => [record.exactProductId, record]));

export function universalPersonaCategorySoftRanking(categoryId: string): XpyCategorySoftRankingAvailability {
  const binding = categoryBindings.get(categoryId);
  if (!binding || binding.status !== "INACTIVE_CANDIDATE_USABLE_MAPPING") {
    return Object.freeze({
      status: "FAILED_CLOSED",
      reason: "PRODUCT_AUTHORITY_REQUIRED",
      requiredClarification: "No evidence-qualified Persona projection is active for this category.",
    });
  }
  return Object.freeze({
    status: "ACTIVE",
    authority: [UNIVERSAL_PERSONA_PROJECTION_AUTHORITY],
    scoreCap: 0.75,
    selectionAuthority: "DOMAIN_SELECTION_CONTRACT_ONLY",
  });
}

export function resolveActivePersonaPreference(categoryId: string, expression: string): string | null {
  const normalized = expression.trim().toLocaleLowerCase("tr-TR");
  const binding = categoryBindings.get(categoryId);
  if (!binding || binding.status !== "INACTIVE_CANDIDATE_USABLE_MAPPING") return null;
  const match = expressionMappings.vocabulary.find(
    (entry) =>
      entry.categories.includes(categoryId) &&
      entry.turkishExpressions.some((candidate) => candidate.toLocaleLowerCase("tr-TR") === normalized),
  );
  return match?.trait ?? null;
}

export function rankWithActiveUniversalPersona(input: {
  readonly categoryId: string;
  readonly eligibleCandidateIds: readonly string[];
  readonly preferences: readonly XpySoftPreference[];
}): { readonly status: "READY"; readonly result: XpyBoundedSoftRankingResult } | { readonly status: "FAILED_CLOSED"; readonly reason: string } {
  const availability = universalPersonaCategorySoftRanking(input.categoryId);
  if (availability.status !== "ACTIVE") return { status: "FAILED_CLOSED", reason: availability.requiredClarification };
  const records = input.eligibleCandidateIds.map((exactCandidateId) => recordsById.get(exactCandidateId));
  if (records.some((record) => !record || record.categoryId !== input.categoryId)) {
    return { status: "FAILED_CLOSED", reason: "PERSONA_FUTURE_CATALOG_READINESS_REQUIRED" };
  }
  const signals: XpyCandidateSoftSignal[] = records.flatMap((record) =>
    record!.status === "GOVERNED_INHERITED"
      ? record!.traits.map((trait) => ({
          exactCandidateId: record!.exactProductId,
          preferenceKey: trait.trait,
          mappingRef: trait.inheritedFrom!.assertionId,
          evidenceRef: trait.sourceIds.join("+"),
          evidenceState: "KNOWN_MATCH" as const,
          contribution: trait.contribution,
          reasonCode: `PERSONA_${trait.trait}_${trait.evidenceClass}`,
          authority: UNIVERSAL_PERSONA_PROJECTION_AUTHORITY,
        }))
      : [],
  );
  return {
    status: "READY",
    result: rankWithBoundedSoftSignals({
      eligibleCandidateIds: input.eligibleCandidateIds,
      preferences: input.preferences,
      signals,
      scoreCap: 0.75,
      singleSelectionAuthorized: false,
    }),
  };
}
