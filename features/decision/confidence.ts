import { DecisionConfidence } from "@/types/confidence";
import { DecisionReason } from "@/types/decision";

export function calculateConfidence(
  reasons: DecisionReason[],
): DecisionConfidence {
  const reasonCount = reasons.length;

  if (reasonCount >= 3) {
    return {
      value: 85,
      level: "High",
      explanation: "Based on multiple supporting factors.",
    };
  }

  if (reasonCount >= 1) {
    return {
      value: 70,
      level: "Medium",
      explanation: "Based on limited supporting factors.",
    };
  }

  return {
    value: 40,
    level: "Low",
    explanation: "Limited decision evidence available.",
  };
}
