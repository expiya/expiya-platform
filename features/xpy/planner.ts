import type { XpyAssistantResult } from "./contracts";
import { classifyQuestionDeferral } from "./lifecycle";

export type XpyLifecyclePlan =
  | { readonly kind: "DEFER_PENDING"; readonly questionKey: string; readonly deferral: "UNKNOWN" | "SKIP" | "DEFER" }
  | { readonly kind: "PRESERVE_PENDING"; readonly questionKey: string }
  | { readonly kind: "RESPOND_WITHOUT_DECISION"; readonly message: string; readonly preserveQuestionKey?: string }
  | { readonly kind: "DOMAIN_PLAN" };

export function planPlatformLifecycle(input: { readonly message: string; readonly pendingQuestionKey?: string; readonly assistant: XpyAssistantResult<unknown> }): XpyLifecyclePlan {
  if (input.assistant.intent === "INFORMATION" && input.assistant.directResponse) return { kind: "RESPOND_WITHOUT_DECISION", message: input.assistant.directResponse, ...(input.pendingQuestionKey ? { preserveQuestionKey: input.pendingQuestionKey } : {}) };
  if (input.assistant.intent === "OFF_TOPIC" && input.assistant.directResponse) return { kind: "RESPOND_WITHOUT_DECISION", message: input.assistant.directResponse, ...(input.pendingQuestionKey ? { preserveQuestionKey: input.pendingQuestionKey } : {}) };
  if (input.pendingQuestionKey) {
    const deferral = classifyQuestionDeferral(input.message);
    if (deferral) return { kind: "DEFER_PENDING", questionKey: input.pendingQuestionKey, deferral };
    if (input.assistant.preservePendingQuestion) return { kind: "PRESERVE_PENDING", questionKey: input.pendingQuestionKey };
  }
  return { kind: "DOMAIN_PLAN" };
}
