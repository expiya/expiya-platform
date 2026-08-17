import type { AffordabilityCandidatePool } from "../affordability/types";
import type { TechnicalCandidatePool } from "../filter/types";
import type { CandidateRanking } from "../ranking/types";
import type { CandidateDecisionAvailability } from "./types";

export function classifyCandidateDecisionAvailability(input: { readonly technicalPool: TechnicalCandidatePool; readonly affordabilityPool: AffordabilityCandidatePool; readonly ranking?: CandidateRanking }): CandidateDecisionAvailability {
  if (input.technicalPool.initialCandidateIds.length === 0) return "EMPTY_SCOPE";
  if (input.affordabilityPool.selectableCandidateIds.length) { const leading = input.ranking?.candidates[0]; const approximateIds = new Set([...input.affordabilityPool.internalEstimateWithinCandidateIds, ...input.affordabilityPool.estimatedOverBudgetConditionalCandidateIds]); const approximateOnly = input.affordabilityPool.selectableCandidateIds.every((id) => approximateIds.has(id)); return leading?.affordabilityTier === "ESTIMATED_WITHIN_BUDGET" || leading?.affordabilityTier === "ESTIMATED_OVER_BUDGET_CONDITIONAL" || (!leading && approximateOnly) ? "READY_WITH_APPROXIMATE_BUDGET" : "READY"; }
  if (input.affordabilityPool.priceUnresolvedCandidateIds.length) return "PRICE_UNRESOLVED";
  if (input.affordabilityPool.technicallyNotEvaluableCandidateIds.length) return "TECHNICALLY_NOT_EVALUABLE";
  return "HARD_CONFLICT";
}
