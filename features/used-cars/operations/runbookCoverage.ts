import type { OperationsRole } from "./staffing";
export type OperationsRunbook = "DEALER_ONBOARDING" | "LISTING_MODERATION" | "FRAUD_TRIAGE" | "LEAD_SUPPORT" | "PRIVACY_REQUEST" | "SECURITY_INCIDENT" | "DEALER_SUSPENSION" | "PLATFORM_DEGRADED_MODE" | "PILOT_STOP";
export interface RunbookRehearsal { readonly rehearsalId: string; readonly runbook: OperationsRunbook; readonly participants: readonly { actorId: string; role: OperationsRole }[]; readonly startedAt: string; readonly completedAt: string | null; readonly passed: boolean; readonly evidenceChecksum: string | null; readonly findingsClosed: boolean }
export const requiredPilotRunbooks: readonly OperationsRunbook[] = Object.freeze(["DEALER_ONBOARDING", "LISTING_MODERATION", "FRAUD_TRIAGE", "LEAD_SUPPORT", "PRIVACY_REQUEST", "SECURITY_INCIDENT", "DEALER_SUSPENSION", "PLATFORM_DEGRADED_MODE", "PILOT_STOP"]);
export function assessRunbookRehearsals(rehearsals: readonly RunbookRehearsal[]) {
  const missing = requiredPilotRunbooks.filter((runbook) => !rehearsals.some((item) => item.runbook === runbook && item.passed && item.findingsClosed && item.completedAt && /^sha256:[a-f0-9]{64}$/u.test(item.evidenceChecksum ?? "") && new Set(item.participants.map((participant) => participant.actorId)).size >= 2));
  return Object.freeze({ ready: missing.length === 0, missing: Object.freeze(missing), rehearsalDoesNotAuthorizeProduction: true as const });
}
