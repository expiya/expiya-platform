import type { PersonaState } from "../domain/conversationMemory";
import type { VehiclePersonaTrait } from "../domain/conversationEvent";
import type { AffordabilityCandidatePool } from "../affordability/types";
import type { CatalogSnapshot } from "../catalog/types";
import type { TechnicalCandidatePool } from "../filter/types";
import type { UsageSuitabilityEvaluation } from "../usage/types";
import type { DailyLifeLayerSnapshot, LayerDiagnostic, PersonaLayerSnapshot } from "../layers/types";

export type RankingTierId = "CONFIRMED_FUNCTIONAL_FIT" | "USAGE_SCENARIO_FIT" | "AFFORDABILITY_TIER" | "PREFERRED_BUDGET_FIT" | "GUIDED_DAILY_LIFE_FIT" | "EXPLICIT_SOFT_PREFERENCE" | "PERSONA_FIT" | "VERIFIED_VALUE_SIGNAL";
export interface RankingTierResult { readonly tier: RankingTierId; readonly score: number; readonly authority: string; readonly reasonCodes: readonly string[] }
export interface PersonaRankingTrace { readonly personaActivated: boolean; readonly activationSource?: "USER_EXPLICIT" | "ADVISOR_PROMPT_RESPONSE"; readonly requestedPersonaTraits: readonly VehiclePersonaTrait[]; readonly matchedPersonaTraits: readonly VehiclePersonaTrait[]; readonly personaScore: number; readonly affectedRanking: boolean; readonly sourceAuthority: string; readonly decisionUse: "LEXICOGRAPHIC_TIER_6" | "NONE" }
export interface DailyLifeRankingTrace { readonly mappings: readonly { readonly mappingId: string; readonly authority: string; readonly mappingClass: string; readonly decisionUse: string; readonly rankingEffect: number }[]; readonly score: number; readonly affectedRanking: boolean }
export interface CandidateRankingResult { readonly exactVariantId: string; readonly modelFamilyId: string; readonly affordabilityTier: import("../affordability/types").AffordabilityTier; readonly rankVector: readonly RankingTierResult[]; readonly rankingReasonCodes: readonly string[]; readonly explanationFactInputs: readonly string[]; readonly personaTrace: PersonaRankingTrace; readonly dailyLifeTrace: DailyLifeRankingTrace; readonly finalOrdinal: number }
export interface RankingSignal { readonly exactVariantId: string; readonly score: number; readonly reasonCode: string; readonly explanationFactId?: string }
export interface CandidateRanking { readonly catalogFingerprint: string; readonly decisionFingerprint: string; readonly rankedCandidateIds: readonly string[]; readonly priceUnresolvedCandidateIds: readonly string[]; readonly candidates: readonly CandidateRankingResult[]; readonly diagnostics: readonly LayerDiagnostic[] }
export interface RankCandidatesInput { readonly snapshot: CatalogSnapshot; readonly technicalPool: TechnicalCandidatePool; readonly affordabilityPool: AffordabilityCandidatePool; readonly persona: PersonaState; readonly usageEvaluations?: readonly UsageSuitabilityEvaluation[]; readonly confirmedFunctionalSignals?: readonly RankingSignal[]; readonly softPreferenceSignals?: readonly RankingSignal[]; readonly dailyLifeLayer?: DailyLifeLayerSnapshot; readonly personaLayer?: PersonaLayerSnapshot }
export interface RankedShortlist { readonly candidateIds: readonly string[]; readonly mode: "FAMILY_DIVERSE" | "SINGLE_REQUESTED" | "TRIM_COMPARISON" }
