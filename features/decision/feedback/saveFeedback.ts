import { DecisionFeedback } from "@/types/feedback";

const feedbackStore: DecisionFeedback[] = [];

export function saveFeedback(feedback: DecisionFeedback): void {
  feedbackStore.push(feedback);
}
