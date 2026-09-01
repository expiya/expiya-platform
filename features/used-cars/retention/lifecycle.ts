export type PersonalDataLifecycleState =
  | "ACTIVE" | "PURPOSE_COMPLETED" | "DELETION_DUE" | "DELETION_IN_PROGRESS"
  | "DELETED_PRIMARY" | "BACKUP_EXPIRY_PENDING" | "DESTROYED"
  | "ANONYMIZED" | "LEGAL_HOLD";

export interface RetentionDecisionContext {
  readonly legalBasisActive: boolean;
  readonly purposeActive: boolean;
  readonly retentionUntil: string | null;
  readonly legalHoldUntil: string | null;
  readonly now: string;
}

export function determineRetentionAction(context: RetentionDecisionContext):
  | "KEEP_ACTIVE" | "KEEP_UNTIL_APPROVED_DATE" | "APPLY_LEGAL_HOLD" | "DELETE_OR_ANONYMIZE" {
  if (context.legalHoldUntil && context.legalHoldUntil > context.now) return "APPLY_LEGAL_HOLD";
  if (context.legalBasisActive && context.purposeActive) return "KEEP_ACTIVE";
  if (context.retentionUntil && context.retentionUntil > context.now) return "KEEP_UNTIL_APPROVED_DATE";
  return "DELETE_OR_ANONYMIZE";
}

const retentionTransitions: Readonly<Record<PersonalDataLifecycleState, readonly PersonalDataLifecycleState[]>> = {
  ACTIVE: ["PURPOSE_COMPLETED", "LEGAL_HOLD"],
  PURPOSE_COMPLETED: ["DELETION_DUE", "ANONYMIZED", "LEGAL_HOLD"],
  DELETION_DUE: ["DELETION_IN_PROGRESS", "LEGAL_HOLD"],
  DELETION_IN_PROGRESS: ["DELETED_PRIMARY"],
  DELETED_PRIMARY: ["BACKUP_EXPIRY_PENDING", "DESTROYED"],
  BACKUP_EXPIRY_PENDING: ["DESTROYED"],
  LEGAL_HOLD: ["PURPOSE_COMPLETED", "DELETION_DUE"],
  DESTROYED: [], ANONYMIZED: [],
};

export function canTransitionPersonalData(from: PersonalDataLifecycleState, to: PersonalDataLifecycleState): boolean {
  return retentionTransitions[from].includes(to);
}

export interface ConsentWithdrawalEffect {
  readonly futureConsentProcessingBlocked: true;
  readonly pendingPortalGrantsRevoked: boolean;
  readonly deliveredRecipientNotificationRequired: boolean;
  readonly priorLawfulProcessingReversed: false;
}

export function evaluateConsentWithdrawal(deliveredAt: string | null): ConsentWithdrawalEffect {
  return Object.freeze({
    futureConsentProcessingBlocked: true,
    pendingPortalGrantsRevoked: deliveredAt === null,
    deliveredRecipientNotificationRequired: deliveredAt !== null,
    priorLawfulProcessingReversed: false,
  });
}
