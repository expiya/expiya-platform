import { DecisionResult } from "@/types/decision";
import { DecisionSummary } from "@/types/decisionSummary";

export function createDecisionSummary(
  decision: DecisionResult,
): DecisionSummary {
  return {
    decisionId: decision.decisionId,
    score: decision.score,
    recommendation: decision.recommendation,
    reasons: decision.reasons.map((reason) => reason.message),
    confidence: {
      value: decision.confidence.value,
      level: decision.confidence.level,
      explanation: decision.confidence.explanation,
    },
  };
}