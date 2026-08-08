import { DecisionResult } from "@/types/decision";
import { DecisionDetail } from "@/types/decisionDetail";

export function createDecisionDetail(
  decision: DecisionResult,
): DecisionDetail {
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
    trace: {
      steps: [...decision.trace.steps],
    },
  };
}
