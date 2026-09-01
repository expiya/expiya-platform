import type { ModerationDecision, ModerationSubjectType } from "./contracts";

export type ModerationTaskStatus = "OPEN" | "CLAIMED" | "DECIDED" | "APPEALED" | "SECOND_REVIEW" | "CLOSED";

export interface ModerationTask {
  readonly id: string;
  readonly subjectType: ModerationSubjectType;
  readonly subjectId: string;
  readonly subjectRevisionId: string;
  readonly status: ModerationTaskStatus;
  readonly assignedActorId: string | null;
  readonly firstDecisionActorId: string | null;
  readonly decision: ModerationDecision | null;
  readonly reasonCode: string | null;
}

const transitions: Readonly<Record<ModerationTaskStatus, readonly ModerationTaskStatus[]>> = {
  OPEN: ["CLAIMED"], CLAIMED: ["DECIDED"], DECIDED: ["APPEALED", "CLOSED"],
  APPEALED: ["SECOND_REVIEW"], SECOND_REVIEW: ["CLOSED"], CLOSED: [],
};

export function canTransitionModerationTask(from: ModerationTaskStatus, to: ModerationTaskStatus): boolean {
  return transitions[from].includes(to);
}

export function canPerformSecondReview(task: ModerationTask, actorId: string): boolean {
  return task.status === "SECOND_REVIEW" && Boolean(task.firstDecisionActorId) && task.firstDecisionActorId !== actorId;
}

export function isModerationDecisionComplete(task: ModerationTask): boolean {
  return task.status === "DECIDED" && Boolean(task.assignedActorId && task.decision && task.reasonCode && task.subjectRevisionId);
}
