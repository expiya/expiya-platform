import type { AffordabilityEvaluation } from "./affordability";

export type TechnicalEligibility = "ELIGIBLE" | "ELIMINATED" | "NOT_EVALUABLE";

export interface RankingContribution {
  readonly source: "FUNCTIONAL" | "DAILY_LIFE" | "SOFT_PREFERENCE" | "PERSONA" | "VALUE";
  readonly score: number;
  readonly explanationFactId?: string;
}

export interface CandidateEvaluation {
  readonly exactVariantId: string;
  readonly modelFamilyId: string;
  readonly technicalEligibility: TechnicalEligibility;
  readonly affordability: AffordabilityEvaluation;
  readonly rankingContributions: readonly RankingContribution[];
  readonly eliminationReasonCodes: readonly string[];
}

export interface CandidateEvaluationSet {
  readonly evaluatedFromCatalogFingerprint: string;
  readonly initialCandidateIds: readonly string[];
  readonly candidates: readonly CandidateEvaluation[];
  readonly fullyEligibleCandidateIds: readonly string[];
  readonly priceUnverifiedCandidateIds: readonly string[];
  readonly ineligibleCandidateIds: readonly string[];
}
