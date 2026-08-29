import type { PreferenceEvent } from "../types";
import type { GovernedAnalystFact, GovernedAnalystHypothesis } from "./governance";

export type QuestionKind = "MATERIAL_DECISION_QUESTION" | "CONVERSATIONAL_CLARIFICATION";
export interface CandidateQuestionValue { readonly value: string; readonly candidateIds: readonly string[]; readonly unknownCandidateIds?: readonly string[] }
export interface MaterialQuestion { readonly key: string; readonly concept: string; readonly kind: QuestionKind; readonly text: string; readonly partitions: readonly CandidateQuestionValue[]; readonly reliability: number; readonly answerability?: number }
export interface CandidateSnapshot { readonly candidateIds: readonly string[] }
export interface CatalogCapabilitySnapshot { readonly reliableConcepts: readonly string[]; readonly questions: readonly MaterialQuestion[] }
export interface QuestionPlanningInput {
  readonly activePreferences: readonly PreferenceEvent[]; readonly analystFacts: readonly GovernedAnalystFact[]; readonly analystHypotheses: readonly GovernedAnalystHypothesis[];
  readonly candidateSnapshot: CandidateSnapshot; readonly catalogCapabilities: CatalogCapabilitySnapshot; readonly askedQuestionKeys: readonly string[];
  readonly answeredConcepts: readonly string[]; readonly rejectedConcepts: readonly string[]; readonly conversationTurn: number; readonly questionFatigue: number;
}
export interface QuestionEvaluation { readonly key: string; readonly concept: string; readonly semanticRelevance: number; readonly candidateReductionValue: number; readonly answerability: number; readonly catalogReliability: number; readonly novelty: number; readonly dependencyEligible: boolean; readonly fatiguePenalty: number; readonly finalScore: number; readonly disposition: "SELECTED" | "REJECTED" | "SUPPRESSED"; readonly reasonCodes: readonly string[] }
export type QuestionSuppressionReason = "NO_CANDIDATES" | "NO_ELIGIBLE_QUESTION" | "BELOW_MINIMUM_VALUE";
export interface QuestionPlanningResult { readonly selectedQuestion?: MaterialQuestion; readonly evaluatedCandidates: readonly QuestionEvaluation[]; readonly noQuestionReason?: QuestionSuppressionReason }

const activeValue = (input: QuestionPlanningInput, concepts: readonly string[]) => input.activePreferences.find((item) => item.status === "ACTIVE" && concepts.includes(item.concept))?.normalizedValue;
const dependencyEligible = (question: MaterialQuestion, input: QuestionPlanningInput) => {
  const fuel = activeValue(input, ["fuelType", "fuelPreference"]); if (question.concept === "transmissionPreference" && fuel === "BEV") return false;
  if (question.concept === "bodyStyleReference" && (activeValue(input, ["bodyStyle", "bodyStyleReference"]) !== undefined || input.answeredConcepts.includes(question.concept))) return false;
  if (question.concept === "passengerCapacity" && (activeValue(input, ["minimumSeats", "passengerCapacity"]) !== undefined || input.answeredConcepts.includes(question.concept))) return false;
  if (question.concept === "fuelPreference" && activeValue(input, ["fuelType", "fuelPreference"]) !== undefined) return false;
  if (question.concept === "transmissionPreference" && activeValue(input, ["transmission", "transmissionPreference"]) !== undefined) return false;
  if (question.concept === "equipmentRequirement" && input.activePreferences.some((item) => item.status === "ACTIVE" && item.field === "equipmentFeature" && question.key.includes(String(item.normalizedValue)))) return false;
  const usage = activeValue(input, ["primaryUsage"]); if (usage === "COMMERCIAL" && question.key.includes("family")) return false;
  if (usage === "PASSENGER_TRANSPORT" && question.key.includes("cargo") && !input.analystFacts.some((item) => item.concept === "cargoRequirement")) return false;
  return true;
};
function reduction(question: MaterialQuestion, candidateIds: readonly string[]): number {
  const total = candidateIds.length; if (total < 2) return 0; const universe = new Set(candidateIds); if (universe.size !== total) return 0;
  const flattened = question.partitions.flatMap((item) => item.candidateIds); const known = new Set(flattened);
  if (known.size < 2 || known.size !== flattened.length || flattened.some((id) => !universe.has(id))) return 0;
  const sizes = question.partitions.map((item) => new Set(item.candidateIds).size).filter(Boolean); if (sizes.length < 2) return 0;
  const unknown = Math.max(0, total - known.size); const unknownPenalty = unknown / total; const largestRatio = Math.max(...sizes) / known.size;
  const balancedSplit = 1 - Math.abs(0.5 - largestRatio) * 2; return Math.max(0, Math.min(1, balancedSplit * (1 - unknownPenalty)));
}
export function planDeterministicQuestion(input: QuestionPlanningInput, minimumScore = 0.08): QuestionPlanningResult {
  if (!input.candidateSnapshot.candidateIds.length) return { evaluatedCandidates: [], noQuestionReason: "NO_CANDIDATES" };
  const evaluations = input.catalogCapabilities.questions.map((question) => {
    const reasons: string[] = []; const material = question.kind === "MATERIAL_DECISION_QUESTION"; if (!material) reasons.push("CONVERSATIONAL_CLARIFICATION_OUT_OF_MATERIAL_PLANNER");
    const dependency = material && dependencyEligible(question, input); if (!dependency && material) reasons.push("CAPABILITY_DEPENDENCY_BLOCKED");
    const candidateReductionValue = reduction(question, input.candidateSnapshot.candidateIds); if (candidateReductionValue === 0) reasons.push("ZERO_CANDIDATE_REDUCTION");
    const reliable = input.catalogCapabilities.reliableConcepts.includes(question.concept) ? question.reliability : 0; if (reliable === 0) reasons.push("CATALOG_RELIABILITY_UNAVAILABLE");
    const alreadyAsked = input.askedQuestionKeys.includes(question.key); const answered = input.answeredConcepts.includes(question.concept); const rejected = input.rejectedConcepts.includes(question.concept); const novelty = alreadyAsked || answered || rejected ? 0 : 1; if (!novelty) reasons.push(alreadyAsked ? "QUESTION_ALREADY_ASKED" : "CONCEPT_ALREADY_RESOLVED");
    const analystRelevant = input.analystFacts.some((item) => item.concept === question.concept) || input.analystHypotheses.some((item) => item.concept === question.concept && item.decisionUse === "QUESTION_INPUT");
    const preferenceRelevant = input.activePreferences.some((item) => item.status === "ACTIVE" && (item.concept === question.concept || item.field === question.concept));
    const anyConversationSignal = input.analystFacts.length > 0 || input.analystHypotheses.some((item) => item.decisionUse === "QUESTION_INPUT") || input.activePreferences.length > 0;
    const semanticRelevance = analystRelevant ? 1 : preferenceRelevant ? 0.8 : anyConversationSignal ? 0.45 : 0; if (semanticRelevance === 0) reasons.push("NO_SEMANTIC_RELEVANCE"); const answerability = question.answerability ?? 0.9; const fatiguePenalty = Math.min(0.35, input.questionFatigue * 0.04);
    const finalScore = dependency && candidateReductionValue > 0 && reliable > 0 && novelty > 0 ? semanticRelevance * candidateReductionValue * answerability * reliable * novelty - fatiguePenalty : 0;
    return { key: question.key, concept: question.concept, semanticRelevance, candidateReductionValue, answerability, catalogReliability: reliable, novelty, dependencyEligible: dependency, fatiguePenalty, finalScore, disposition: "REJECTED" as const, reasonCodes: reasons };
  });
  const eligible = evaluations.filter((item) => item.finalScore >= minimumScore).sort((a, b) => b.finalScore - a.finalScore || a.key.localeCompare(b.key)); const selected = eligible[0];
  const evaluatedCandidates = evaluations.map((item) => ({ ...item, disposition: selected?.key === item.key ? "SELECTED" as const : item.finalScore === 0 ? "SUPPRESSED" as const : "REJECTED" as const }));
  return selected ? { selectedQuestion: input.catalogCapabilities.questions.find((item) => item.key === selected.key), evaluatedCandidates } : { evaluatedCandidates, noQuestionReason: evaluations.some((item) => item.finalScore > 0) ? "BELOW_MINIMUM_VALUE" : "NO_ELIGIBLE_QUESTION" };
}
