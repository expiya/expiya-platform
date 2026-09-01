export type ModerationSubjectType =
  | "DEALER" | "TAXONOMY_IDENTITY_REQUEST" | "LISTING" | "LISTING_REVISION"
  | "DOCUMENT" | "CLASSIC_CLAIM" | "FRAUD_CASE" | "APPEAL";

export type ModerationDecision =
  | "APPROVE" | "APPROVE_WITH_LIMITATIONS" | "REQUEST_CHANGES"
  | "REJECT" | "ESCALATE_EXPERT" | "SUSPEND";

export interface ModerationEvent {
  readonly id: string;
  readonly subjectType: ModerationSubjectType;
  readonly subjectId: string;
  readonly subjectRevisionId?: string;
  readonly tenantId?: string;
  readonly decision: ModerationDecision;
  readonly reasonCode: string;
  readonly actorId: string;
  readonly occurredAt: string;
}
