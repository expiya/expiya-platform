export type PilotWave = "SANDBOX" | "INTERNAL_SHADOW" | "LIMITED_PUBLIC";
export interface PilotWavePromotionEvidence { readonly from: PilotWave; readonly to: PilotWave; readonly observationDays: number; readonly minimumEligibleStockObserved: number; readonly stopCodeCount: number; readonly openCriticalOrHighFindings: number; readonly dataQualityHealthy: boolean; readonly moderationSlaMet: boolean; readonly supportSlaMet: boolean; readonly rollbackRehearsalPassed: boolean; readonly approverIds: readonly string[]; readonly evidenceChecksum: string }
const allowedTransitions: Readonly<Record<PilotWave, readonly PilotWave[]>> = Object.freeze({ SANDBOX: ["INTERNAL_SHADOW"], INTERNAL_SHADOW: ["LIMITED_PUBLIC"], LIMITED_PUBLIC: [] });
export function assessPilotWavePromotion(evidence: PilotWavePromotionEvidence) {
  const codes: string[] = [];
  if (!allowedTransitions[evidence.from].includes(evidence.to)) codes.push("WAVE_TRANSITION_INVALID");
  if (evidence.observationDays < 14) codes.push("OBSERVATION_WINDOW_INSUFFICIENT");
  if (evidence.minimumEligibleStockObserved < 250) codes.push("STOCK_FLOOR_NOT_MET");
  if (evidence.stopCodeCount > 0) codes.push("STOP_CODE_PRESENT");
  if (evidence.openCriticalOrHighFindings > 0) codes.push("HIGH_RISK_FINDING_OPEN");
  if (!evidence.dataQualityHealthy || !evidence.moderationSlaMet || !evidence.supportSlaMet) codes.push("HEALTH_OR_SLA_GATE_FAILED");
  if (!evidence.rollbackRehearsalPassed) codes.push("ROLLBACK_REHEARSAL_REQUIRED");
  if (evidence.approverIds.length < 4 || new Set(evidence.approverIds).size !== evidence.approverIds.length) codes.push("PROMOTION_APPROVAL_INCOMPLETE");
  if (!/^sha256:[a-f0-9]{64}$/u.test(evidence.evidenceChecksum)) codes.push("EVIDENCE_CHECKSUM_INVALID");
  return Object.freeze({ ready: codes.length === 0, codes: Object.freeze(codes), promotionAuthorized: false as const });
}
