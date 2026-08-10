import { generateSignals } from "@/features/learning/intelligence/service";
import { learningSignalStore } from "@/features/learning/intelligence/store/learningSignalStore";
import { LearningRecord } from "@/types/learning";
import { LearningSignal } from "@/types/learningSignal";

export function createLearningInsights(
  records: LearningRecord[],
): LearningSignal[] {
  const signals = generateSignals(records);

  for (const signal of signals) {
    learningSignalStore.save(signal);
  }

  return signals;
}
