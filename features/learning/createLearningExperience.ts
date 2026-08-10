import { createLearningRecord } from "@/features/learning/createLearningRecord";
import { learningStore } from "@/features/learning/store/learningStore";
import { validateLearningRecord } from "@/features/learning/validation/validateLearningRecord";
import { DecisionResult } from "@/types/decision";
import { DecisionFeedback } from "@/types/feedback";
import { LearningRecord } from "@/types/learning";
import { DecisionOutcome } from "@/types/outcome";

export function createLearningExperience(
  decision: DecisionResult,
  feedback: DecisionFeedback,
  outcome: DecisionOutcome,
): LearningRecord | undefined {
  if (!validateLearningRecord(decision, feedback, outcome)) {
    return undefined;
  }

  const record = createLearningRecord(decision, feedback, outcome);
  learningStore.save(record);
  return record;
}
