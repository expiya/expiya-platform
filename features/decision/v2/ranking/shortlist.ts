import type { CandidateRanking, RankedShortlist } from "./types";

export function selectRankedCandidateShortlist(input: { readonly ranking: CandidateRanking; readonly maximumCandidates?: 1 | 2 | 3; readonly familyDiversity?: boolean; readonly explicitTrimComparisonRequested?: boolean; readonly singleRequested?: boolean }): RankedShortlist {
  const maximum = input.singleRequested ? 1 : input.maximumCandidates ?? 3; const diversity = input.familyDiversity !== false && !input.explicitTrimComparisonRequested; const families = new Set<string>(); const selected: string[] = [];
  const bestFunctionalScore = input.ranking.candidates[0]?.rankVector.find((tier) => tier.tier === "CONFIRMED_FUNCTIONAL_FIT")?.score ?? 0;
  const bestAffordabilityScore = input.ranking.candidates[0]?.rankVector.find((tier) => tier.tier === "AFFORDABILITY_TIER")?.score ?? 0;
  for (const candidate of input.ranking.candidates) {
    if (selected.length >= maximum) break;
    const functionalScore = candidate.rankVector.find((tier) => tier.tier === "CONFIRMED_FUNCTIONAL_FIT")?.score ?? 0;
    const affordabilityScore = candidate.rankVector.find((tier) => tier.tier === "AFFORDABILITY_TIER")?.score ?? 0;
    if (bestFunctionalScore > 0 && functionalScore < bestFunctionalScore) continue;
    if (bestFunctionalScore > 0 && affordabilityScore < bestAffordabilityScore) continue;
    if (diversity && families.has(candidate.modelFamilyId)) continue;
    selected.push(candidate.exactVariantId); families.add(candidate.modelFamilyId);
  }
  return Object.freeze({ candidateIds: Object.freeze(selected), mode: input.singleRequested ? "SINGLE_REQUESTED" : input.explicitTrimComparisonRequested ? "TRIM_COMPARISON" : "FAMILY_DIVERSE" });
}
