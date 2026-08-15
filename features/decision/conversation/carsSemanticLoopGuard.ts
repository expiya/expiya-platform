import type { CarsConversationTrace, CarsQuestionPurpose } from "@/types/carsConversation";

export function carsSemanticFingerprint(trace: CarsConversationTrace): string {
  return JSON.stringify({
    phase: trace.phase,
    requirements: trace.requirements.map((entry) => `${entry.key}:${entry.value}`).sort(),
    unresolved: trace.requirements.filter((entry) => entry.evaluability === "NEEDS_CLARIFICATION").map((entry) => entry.key),
    purpose: trace.lastAssistantQuestion?.purpose,
    optionSet: trace.activeOptionSet?.id,
    selected: trace.activeOptionSet?.selectedOptionId,
    progress: trace.lastProgressEvent,
  });
}

export function isSemanticLoop(
  previous: CarsConversationTrace,
  nextPurpose: CarsQuestionPurpose | undefined,
): boolean {
  if (!nextPurpose) return false;
  const samePurpose = previous.lastAssistantQuestion?.purpose === nextPurpose
    || previous.askedQuestionPurposes.includes(nextPurpose);
  const noProgress = !previous.didConversationProgress;
  const sameRequirements = previous.capturedOnLatestTurn.length === 0;
  const noCorrection = !previous.requirements.some((entry) => entry.category === "CORRECTION" && previous.capturedOnLatestTurn.includes(entry.key));
  return samePurpose && noProgress && sameRequirements && noCorrection;
}

export function cannotRepeatQuestion(
  trace: CarsConversationTrace,
  purpose: CarsQuestionPurpose,
): boolean {
  if (purpose === "FINAL_PRIORITY") return true;
  if (trace.questionMemory?.some((entry) => entry.purpose === purpose && entry.status === "DEFERRED")) return false;
  const asked = trace.askedQuestionPurposes.includes(purpose);
  const answered = trace.answeredQuestionPurposes.includes(purpose);
  const corrected = trace.capturedOnLatestTurn.some((key) => (
    trace.requirements.find((entry) => entry.key === key)?.category === "CORRECTION"
  ));
  if (corrected) return false;
  if (answered || asked) return true;
  return false;
}
