import { classifyContextualAnswer } from "../../conversation-kernel/lifecycle";

export type PendingAnswerPolarity = "YES" | "NO";

export function pendingAnswerPolarity(message: string): PendingAnswerPolarity | undefined {
  const result = classifyContextualAnswer(message);
  return result === "AFFIRM" ? "YES" : result === "DECLINE" ? "NO" : undefined;
}

export function isUnboundShortAnswer(message: string): boolean {
  return pendingAnswerPolarity(message) !== undefined;
}
