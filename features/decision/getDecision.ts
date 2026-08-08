import { decisionStore } from "@/features/decision/store/decisionStore";
import { DecisionResult } from "@/types/decision";

export function getDecision(
  decisionId: string,
): DecisionResult | undefined {
  return decisionStore.get(decisionId);
}
