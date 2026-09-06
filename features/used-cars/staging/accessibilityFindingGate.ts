export type AccessibilityFindingSeverity = "CRITICAL" | "MAJOR" | "MINOR";
export interface AccessibilityFindingRecord { readonly findingId: string; readonly severity: AccessibilityFindingSeverity; readonly status: "OPEN" | "READY_FOR_RETEST" | "CLOSED"; readonly ownerId: string | null; readonly fixCommit: string | null; readonly retestEvidenceChecksum: string | null; readonly retestedBy: string | null; readonly originalTesterId: string }
export function assessAccessibilityFindingGate(findings: readonly AccessibilityFindingRecord[]) {
  const checksum = /^sha256:[a-f0-9]{64}$/u;
  const codes: string[] = [];
  for (const finding of findings) {
    if (!finding.ownerId) codes.push(`OWNER_REQUIRED:${finding.findingId}`);
    if (["CRITICAL", "MAJOR"].includes(finding.severity) && finding.status !== "CLOSED") codes.push(`RELEASE_BLOCKING:${finding.findingId}`);
    if (finding.status === "CLOSED" && (!finding.fixCommit || !checksum.test(finding.retestEvidenceChecksum ?? "") || !finding.retestedBy || finding.retestedBy === finding.ownerId)) codes.push(`INDEPENDENT_RETEST_REQUIRED:${finding.findingId}`);
  }
  return Object.freeze({ passed: codes.length === 0, codes: Object.freeze(codes), automaticWaiverAuthorized: false as const });
}
