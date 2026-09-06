export type DependencyScope = "RUNTIME" | "BUILD" | "DEVELOPMENT";
export interface DependencyFinding { readonly packageName: string; readonly version: string; readonly scope: DependencyScope; readonly license: string | null; readonly vulnerabilitySeverity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; readonly fixAvailable: boolean; readonly transitive: boolean; readonly lastReviewedAt: string | null; readonly exceptionId: string | null; readonly exceptionExpiresAt: string | null }
export function assessDependencyFindings(findings: readonly DependencyFinding[], now: string) {
  const blockers: string[] = [];
  for (const finding of findings) {
    const ref = `${finding.packageName}@${finding.version}`;
    if (!finding.license) blockers.push(`LICENSE_UNKNOWN:${ref}`);
    if (["HIGH", "CRITICAL"].includes(finding.vulnerabilitySeverity)) blockers.push(`VULNERABILITY_BLOCKING:${ref}`);
    if (!finding.lastReviewedAt) blockers.push(`REVIEW_MISSING:${ref}`);
    if (finding.exceptionId && (!finding.exceptionExpiresAt || finding.exceptionExpiresAt <= now)) blockers.push(`EXCEPTION_EXPIRED:${ref}`);
  }
  return Object.freeze({ ready: blockers.length === 0, blockers: Object.freeze(blockers), automaticVulnerabilityExceptionAuthorized: false as const });
}
