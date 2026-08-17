import type { ActionPolicy } from "./types";
export const ACTION_POLICY_V1: ActionPolicy = Object.freeze({ policyId: "v2-conversation-action", policyVersion: "1.0.0", budgetQuestionHighPriorityPoolSize: 10, deferredQuestionCooldownTurns: 1, offTopicEndThreshold: 3 });
