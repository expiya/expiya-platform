import { DecisionResult } from "@/types/decision";
import { DecisionFeedback } from "@/types/feedback";
import { LearningRecord } from "@/types/learning";
import { DecisionOutcome } from "@/types/outcome";

let learningRecordSequence = 0;

function createLearningRecordId(): string {
  learningRecordSequence += 1;
  return `lrn_${Date.now()}${learningRecordSequence}`;
}

export function createLearningRecord(
  decision: DecisionResult,
  feedback: DecisionFeedback,
  outcome: DecisionOutcome,
): LearningRecord {
  return {
    id: createLearningRecordId(),
    decisionId: decision.decisionId,
    decision,
    feedback,
    outcome,
  };
}
