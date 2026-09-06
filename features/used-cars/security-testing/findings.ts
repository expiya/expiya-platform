import { usedCarsSecurityTestPlan } from "./testPlan";

export type SecurityFindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type SecurityFindingState = "OPEN" | "FIX_IN_PROGRESS" | "READY_FOR_RETEST" | "RETEST_FAILED" | "CLOSED" | "RISK_ACCEPTED";
export interface SecurityFinding { readonly findingId: string; readonly scenarioId: string; readonly severity: SecurityFindingSeverity; readonly state: SecurityFindingState; readonly ownerId: string | null; readonly discoveredAt: string; readonly dueAt: string; readonly fixCommit: string | null; readonly retestEvidenceChecksum: string | null; readonly retestedBy: string | null; readonly originalTesterId: string; readonly riskAcceptanceId: string | null; readonly riskAcceptanceExpiresAt: string | null }
export function evaluateSecurityFinding(finding: SecurityFinding, now: string) {
  const codes: string[] = [];
  if (!finding.ownerId) codes.push("OWNER_REQUIRED");
  if (now >= finding.dueAt && !["CLOSED", "RISK_ACCEPTED"].includes(finding.state)) codes.push("REMEDIATION_SLA_BREACHED");
  if (finding.state === "CLOSED" && (!finding.fixCommit || !/^sha256:[a-f0-9]{64}$/u.test(finding.retestEvidenceChecksum ?? "") || !finding.retestedBy)) codes.push("RETEST_EVIDENCE_REQUIRED");
  if (finding.state === "CLOSED" && finding.retestedBy === finding.ownerId) codes.push("FIX_OWNER_CANNOT_RETEST");
  if (finding.state === "RISK_ACCEPTED" && (["CRITICAL", "HIGH"].includes(finding.severity) || !finding.riskAcceptanceId || !finding.riskAcceptanceExpiresAt || finding.riskAcceptanceExpiresAt <= now)) codes.push("RISK_ACCEPTANCE_FORBIDDEN_OR_INVALID");
  return Object.freeze({ releaseBlocking: ["CRITICAL", "HIGH"].includes(finding.severity) && finding.state !== "CLOSED", codes: Object.freeze(codes), automaticRiskAcceptanceAuthorized: false as const });
}

export interface SecurityTestResult { readonly scenarioId: string; readonly outcome: "PASS" | "FAIL"; readonly testerId: string; readonly executedAt: string; readonly evidenceChecksum: string; readonly findingIds: readonly string[] }
export function assessSecurityTestResults(results: readonly SecurityTestResult[], findings: readonly SecurityFinding[]) {
  const missing: string[] = [];
  const conflicting: string[] = [];
  for (const scenario of usedCarsSecurityTestPlan) {
    const scenarioResults = results.filter(result => result.scenarioId === scenario.scenarioId);
    const latestAt = scenarioResults.reduce((latest, result) => result.executedAt > latest ? result.executedAt : latest, "");
    const latest = scenarioResults.filter(result => result.executedAt === latestAt);
    const validPass = latest.length === 1 && latest[0].outcome === "PASS" && /^sha256:[a-f0-9]{64}$/u.test(latest[0].evidenceChecksum) && Boolean(latest[0].testerId);
    if (!validPass) missing.push(scenario.scenarioId);
    if (latest.length > 1 || scenarioResults.some(result => result.executedAt === latestAt && result.outcome === "FAIL")) conflicting.push(scenario.scenarioId);
  }
  const blockingFindings = findings.filter((finding) => evaluateSecurityFinding(finding, "9999-12-31").releaseBlocking).map((finding) => finding.findingId);
  return Object.freeze({ complete: missing.length === 0 && conflicting.length === 0 && blockingFindings.length === 0, missing: Object.freeze(missing), conflicting: Object.freeze(conflicting), blockingFindings: Object.freeze(blockingFindings), productionSecurityApprovalAuthorized: false as const });
}
