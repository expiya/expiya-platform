export type OperationsRole = "PILOT_OWNER" | "DEALER_SUCCESS" | "SUPPORT_L1" | "MODERATOR_L1" | "MODERATOR_L2" | "FRAUD_ANALYST" | "SECURITY_ON_CALL" | "PRIVACY_OWNER" | "LEGAL_APPROVER" | "BILLING_OPERATIONS" | "INCIDENT_COMMANDER";
export interface OperationsAssignment {
  readonly assignmentId: string; readonly actorId: string; readonly role: OperationsRole; readonly trainedAt: string | null; readonly certificationExpiresAt: string | null; readonly shiftId: string | null; readonly backupActorId: string | null; readonly active: boolean; readonly productionActionsAuthorized: false;
}
export const requiredPilotOperationsRoles: readonly OperationsRole[] = Object.freeze(["PILOT_OWNER", "DEALER_SUCCESS", "SUPPORT_L1", "MODERATOR_L1", "MODERATOR_L2", "FRAUD_ANALYST", "SECURITY_ON_CALL", "PRIVACY_OWNER", "LEGAL_APPROVER", "INCIDENT_COMMANDER"]);

const incompatibleRoles: readonly (readonly [OperationsRole, OperationsRole])[] = Object.freeze([
  ["MODERATOR_L1", "MODERATOR_L2"], ["FRAUD_ANALYST", "LEGAL_APPROVER"], ["BILLING_OPERATIONS", "LEGAL_APPROVER"], ["PILOT_OWNER", "SECURITY_ON_CALL"],
]);
export function assessOperationsStaffing(assignments: readonly OperationsAssignment[], now: string) {
  const usable = assignments.filter((item) => item.active && item.trainedAt && item.certificationExpiresAt && item.certificationExpiresAt > now && item.shiftId && item.backupActorId && item.backupActorId !== item.actorId);
  const missingRoles = requiredPilotOperationsRoles.filter((role) => !usable.some((item) => item.role === role));
  const conflicts = incompatibleRoles.filter(([left, right]) => assignments.some((item) => item.role === left && assignments.some((other) => other.actorId === item.actorId && other.role === right))).map(([left, right]) => `${left}:${right}`);
  return Object.freeze({ ready: missingRoles.length === 0 && conflicts.length === 0, missingRoles: Object.freeze(missingRoles), segregationConflicts: Object.freeze(conflicts), productionActionsAuthorized: false as const });
}
