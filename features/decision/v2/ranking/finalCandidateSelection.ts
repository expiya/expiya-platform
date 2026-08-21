import type { AffordabilityCandidatePool } from "../affordability/types";
import type { CandidateRanking, RankedShortlist } from "./types";
import type { CatalogSnapshot } from "../catalog/types";

function tierScore(candidate: CandidateRanking["candidates"][number], tier: "CONFIRMED_FUNCTIONAL_FIT" | "USAGE_SCENARIO_FIT"): number {
  return candidate.rankVector.find((item) => item.tier === tier)?.score ?? 0;
}

export function selectLeadingDecisionCohortIds(ranking: CandidateRanking): readonly string[] {
  if (!ranking.candidates.length) return Object.freeze([]);
  const bestFunctional = Math.max(...ranking.candidates.map((candidate) => tierScore(candidate, "CONFIRMED_FUNCTIONAL_FIT")));
  // Usage fit orders otherwise-equivalent candidates; it must not silently
  // turn a large compatible pool into an apparently terminal shortlist.
  return Object.freeze(ranking.candidates
    .filter((candidate) => tierScore(candidate, "CONFIRMED_FUNCTIONAL_FIT") === bestFunctional)
    .map((candidate) => candidate.exactVariantId));
}

export function selectBudgetNearestShortlist(input: {
  readonly ranking: CandidateRanking;
  readonly affordability: AffordabilityCandidatePool;
  readonly snapshot?: CatalogSnapshot;
  readonly targetAmountTry: number;
  readonly maximumCandidates?: 1 | 2 | 3;
}): RankedShortlist {
  const maximum = input.maximumCandidates ?? 3;
  // Once the conversation reaches the budget tie-break, preserve the best
  // functional match but do not let a generic usage score silently discard a
  // closer, verified-price option. Budget is the final discriminator here.
  const cohort = new Set(selectLeadingDecisionCohortIds(input.ranking));
  const rankingById = new Map(input.ranking.candidates.map((candidate) => [candidate.exactVariantId, candidate]));
  const decisionAmount = (candidate: AffordabilityCandidatePool["candidates"][number]) => candidate.priceAuthority.publicExactAmountTry
    ?? (candidate.priceAuthority.decisionUse === "INTERNAL_APPROXIMATE_AFFORDABILITY" ? input.snapshot?.variantById.get(candidate.exactVariantId)?.activeNewPrice?.amountTry : undefined);
  const priced = input.affordability.candidates
    .filter((candidate) => cohort.has(candidate.exactVariantId)
      && decisionAmount(candidate) !== undefined
      && decisionAmount(candidate)! <= input.targetAmountTry)
    .sort((left, right) => {
      const leftGap = input.targetAmountTry - decisionAmount(left)!;
      const rightGap = input.targetAmountTry - decisionAmount(right)!;
      return leftGap - rightGap || (rankingById.get(left.exactVariantId)?.finalOrdinal ?? Number.MAX_SAFE_INTEGER) - (rankingById.get(right.exactVariantId)?.finalOrdinal ?? Number.MAX_SAFE_INTEGER) || left.exactVariantId.localeCompare(right.exactVariantId);
    });
  const families = new Set<string>(); const selected: string[] = [];
  for (const candidate of priced) {
    const family = rankingById.get(candidate.exactVariantId)?.modelFamilyId;
    if (!family || families.has(family)) continue;
    selected.push(candidate.exactVariantId); families.add(family);
    if (selected.length >= maximum) break;
  }
  return Object.freeze({ candidateIds: Object.freeze(selected), mode: "FAMILY_DIVERSE" });
}
