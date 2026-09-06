export type AccessibilityJourney = "B2C_NEEDS_CAPTURE" | "B2C_MATCH_RESULTS" | "B2C_VEHICLE_TRUST_DETAIL" | "B2C_LEAD_CONSENT" | "PARTNER_SIGN_IN_MFA" | "PARTNER_INVENTORY_CREATE" | "PARTNER_MEDIA_UPLOAD" | "PARTNER_LEAD_RESPONSE" | "OPS_MODERATION_DECISION";
export const requiredAccessibilityJourneys: readonly AccessibilityJourney[] = Object.freeze(["B2C_NEEDS_CAPTURE", "B2C_MATCH_RESULTS", "B2C_VEHICLE_TRUST_DETAIL", "B2C_LEAD_CONSENT", "PARTNER_SIGN_IN_MFA", "PARTNER_INVENTORY_CREATE", "PARTNER_MEDIA_UPLOAD", "PARTNER_LEAD_RESPONSE", "OPS_MODERATION_DECISION"]);
export interface AccessibilityJourneyResult { readonly journey: AccessibilityJourney; readonly matrixIds: readonly string[]; readonly keyboardPassed: boolean; readonly screenReaderPassed: boolean; readonly visualPassed: boolean; readonly cognitiveReviewPassed: boolean; readonly openMajorOrCriticalFindings: number; readonly evidenceChecksum: string; readonly independentTesterId: string | null; readonly syntheticOnly: true }

export function assessAccessibilityJourneySuite(results: readonly AccessibilityJourneyResult[]) {
  const checksum = /^sha256:[a-f0-9]{64}$/u;
  const missing = requiredAccessibilityJourneys.filter((journey) => !results.some((result) => result.journey === journey && result.matrixIds.length > 0 && result.keyboardPassed && result.screenReaderPassed && result.visualPassed && result.cognitiveReviewPassed && result.openMajorOrCriticalFindings === 0 && checksum.test(result.evidenceChecksum) && Boolean(result.independentTesterId) && result.syntheticOnly));
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing), accessibilityConformanceClaimAuthorized: false as const, productionUiLaunchAuthorized: false as const });
}
