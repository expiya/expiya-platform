export type PilotStopAction = "DISABLE_PUBLIC_LISTINGS" | "DISABLE_PARTNER_WRITES" | "REVOKE_SERVICE_ACCOUNTS" | "STOP_LEAD_HANDOFF" | "PRESERVE_AUDIT" | "OPEN_INCIDENT" | "NOTIFY_OWNERS";
export const requiredPilotStopActions: readonly PilotStopAction[] = Object.freeze(["DISABLE_PUBLIC_LISTINGS", "DISABLE_PARTNER_WRITES", "REVOKE_SERVICE_ACCOUNTS", "STOP_LEAD_HANDOFF", "PRESERVE_AUDIT", "OPEN_INCIDENT", "NOTIFY_OWNERS"]);
export interface PilotEmergencyStopEvidence { readonly incidentId: string; readonly stopCode: string; readonly executedActions: readonly PilotStopAction[]; readonly executedAt: string | null; readonly incidentCommanderId: string | null; readonly evidenceChecksum: string | null; readonly syntheticOnly: true }
export function assessPilotEmergencyStop(evidence: PilotEmergencyStopEvidence) {
  const missingActions = requiredPilotStopActions.filter((action) => !evidence.executedActions.includes(action));
  const valid = missingActions.length === 0 && Boolean(evidence.executedAt && evidence.incidentCommanderId) && /^sha256:[a-f0-9]{64}$/u.test(evidence.evidenceChecksum ?? "");
  return Object.freeze({ complete: valid, missingActions: Object.freeze(missingActions), restartAuthorized: false as const, productionMutationAuthorized: false as const });
}
