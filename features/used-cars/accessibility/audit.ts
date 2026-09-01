import type { AccessibilityMethod, AccessibilitySurface } from "./requirements";
import { usedCarsAccessibilityRequirements } from "./requirements";
export interface AccessibilityAuditResult { readonly auditId: string; readonly requirementId: string; readonly surface: AccessibilitySurface; readonly methods: readonly AccessibilityMethod[]; readonly outcome: "PASS" | "FAIL" | "NOT_TESTED"; readonly evidenceChecksum: string | null; readonly testerId: string | null; readonly testedAt: string; readonly expiresAt: string | null; readonly openFindingIds: readonly string[] }
export function assessAccessibilityAudit(results: readonly AccessibilityAuditResult[], now: string) {
  const missing: string[] = [];
  for (const requirement of usedCarsAccessibilityRequirements) for (const surface of requirement.surfaces) {
    const result = results.find((item) => item.requirementId === requirement.requirementId && item.surface === surface && item.outcome === "PASS" && item.openFindingIds.length === 0 && /^sha256:[a-f0-9]{64}$/u.test(item.evidenceChecksum ?? "") && item.testerId && (!item.expiresAt || item.expiresAt > now) && requirement.methods.every((method) => item.methods.includes(method)));
    if (!result) missing.push(`${requirement.requirementId}:${surface}`);
  }
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing), accessibilityConformanceClaimAuthorized: false as const, productionUiLaunchAuthorized: false as const });
}
