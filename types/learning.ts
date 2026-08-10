import { DecisionResult } from "@/types/decision";
import { DecisionFeedback } from "@/types/feedback";
import { DecisionOutcome } from "@/types/outcome";

export interface LearningRecord {
  id: string;
  decisionId: string;
  decision: DecisionResult;
  feedback: DecisionFeedback;
  outcome: DecisionOutcome;
}
