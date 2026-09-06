export type PrivacyDrillScenario = "ACCOUNTLESS_LEAD_ACCESS" | "UNAUTHORIZED_REPRESENTATIVE" | "CROSS_TENANT_SCOPE_ATTACK" | "REDACTED_ENCRYPTED_EXPORT" | "DOWNLOAD_TOKEN_EXPIRY" | "LEAD_DELETION_CHAIN" | "NARROW_LEGAL_HOLD" | "SLA_ESCALATION" | "RECIPIENT_NOTIFICATION";
export const requiredPrivacyDrillScenarios: readonly PrivacyDrillScenario[] = Object.freeze(["ACCOUNTLESS_LEAD_ACCESS", "UNAUTHORIZED_REPRESENTATIVE", "CROSS_TENANT_SCOPE_ATTACK", "REDACTED_ENCRYPTED_EXPORT", "DOWNLOAD_TOKEN_EXPIRY", "LEAD_DELETION_CHAIN", "NARROW_LEGAL_HOLD", "SLA_ESCALATION", "RECIPIENT_NOTIFICATION"]);
export interface PrivacyDrillResult { readonly scenario: PrivacyDrillScenario; readonly environment: "STAGING"; readonly syntheticOnly: true; readonly passed: boolean; readonly rawPiiInEvidence: false; readonly evidenceChecksum: string; readonly privacyReviewerId: string | null; readonly securityReviewerId: string | null }

export function assessPrivacyOperationsDrill(results: readonly PrivacyDrillResult[]) {
  const checksum = /^sha256:[a-f0-9]{64}$/u;
  const missing = requiredPrivacyDrillScenarios.filter((scenario) => !results.some((result) => result.scenario === scenario && result.environment === "STAGING" && result.syntheticOnly && result.passed && !result.rawPiiInEvidence && checksum.test(result.evidenceChecksum) && Boolean(result.privacyReviewerId) && Boolean(result.securityReviewerId) && result.privacyReviewerId !== result.securityReviewerId));
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing), realRightsRequestProcessingAuthorized: false as const, personalDataMutationAuthorized: false as const });
}
