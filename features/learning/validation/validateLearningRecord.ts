import { DecisionResult } from "@/types/decision";
import { DecisionFeedback } from "@/types/feedback";
import { DecisionOutcome } from "@/types/outcome";

export function validateLearningRecord(
  decision: DecisionResult | null | undefined,
  feedback: DecisionFeedback | null | undefined,
  outcome: DecisionOutcome | null | undefined,
): boolean {
  if (!decision) {
    return false;
  }

  if (!feedback) {
    return false;
  }

  if (!outcome) {
    return false;
  }

  if (!decision.decisionId) {
    return false;
  }

  if (!feedback.decisionId) {
    return false;
  }

  if (!outcome.decisionId) {
    return false;
  }

  if (decision.decisionId !== feedback.decisionId) {
    return false;
  }

  if (decision.decisionId !== outcome.decisionId) {
    return false;
  }

  return true;
}
