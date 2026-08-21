import type { QuestionCandidate } from "./types";
import type { ConversationMemory } from "../domain/conversationMemory";

export type RecommendationReadiness =
  | "NEEDS_DISCOVERY"
  | "NEEDS_MATERIAL_DISCRIMINATOR"
  | "READY_FOR_OFFER"
  | "DIRECT_MODEL_SCOPE"
  | "HARD_CONFLICT"
  | "INSUFFICIENT_EVIDENCE";

export function assessRecommendationReadiness(input: {
  readonly memory: ConversationMemory;
  readonly candidateAvailability: string;
  readonly candidateCount: number;
  readonly comparisonScope: boolean;
  readonly unansweredDecisionFields: readonly string[];
  readonly questionCandidates: readonly QuestionCandidate[];
}): RecommendationReadiness {
  if (input.candidateAvailability === "HARD_CONFLICT" || input.candidateCount === 0) return "HARD_CONFLICT";
  if (["PRICE_UNRESOLVED", "TECHNICALLY_NOT_EVALUABLE", "EMPTY_SCOPE"].includes(input.candidateAvailability)) return "INSUFFICIENT_EVIDENCE";
  if (input.comparisonScope) return "DIRECT_MODEL_SCOPE";
  const hasMaterialQuestion = input.questionCandidates.length > 0;
  if (input.unansweredDecisionFields.length > 0) return input.memory.vehicleIntentEstablished ? "NEEDS_MATERIAL_DISCRIMINATOR" : "NEEDS_DISCOVERY";
  if (hasMaterialQuestion) return "NEEDS_MATERIAL_DISCRIMINATOR";
  if (input.candidateCount > 3) return "NEEDS_MATERIAL_DISCRIMINATOR";
  return input.candidateCount > 0 ? "READY_FOR_OFFER" : "INSUFFICIENT_EVIDENCE";
}
