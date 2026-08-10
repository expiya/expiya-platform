import { LearningRecord } from "@/types/learning";
import { LearningSignal } from "@/types/learningSignal";

let learningSignalSequence = 0;

function createLearningSignalId(): string {
  learningSignalSequence += 1;
  return `sig_${Date.now()}${learningSignalSequence}`;
}

export function generateSignals(
  records: LearningRecord[],
): LearningSignal[] {
  const signals: LearningSignal[] = [];

  for (const record of records) {
    if (
      record.feedback.helpful === true &&
      record.outcome.status === "success"
    ) {
      signals.push({
        id: createLearningSignalId(),
        type: "observation",
        description:
          "Positive feedback and successful outcome observed.",
      });
    }
  }

  return signals;
}
