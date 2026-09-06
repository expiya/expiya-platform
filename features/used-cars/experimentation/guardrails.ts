export interface ExperimentGuardrailSnapshot { readonly experimentId: string; readonly sampleSize: number; readonly crossTenantIncidents: number; readonly consentFailures: number; readonly misleadingVerificationIncidents: number; readonly prescriptivePurchaseResponses: number; readonly sponsoredOrganicMixingIncidents: number; readonly accessibilityRegressionRatio: number; readonly complaintRatio: number; readonly errorRatio: number }
export function evaluateExperimentGuardrails(snapshot: ExperimentGuardrailSnapshot) {
  const stopCodes: string[] = [];
  if (snapshot.crossTenantIncidents > 0) stopCodes.push("CROSS_TENANT_INCIDENT");
  if (snapshot.consentFailures > 0) stopCodes.push("CONSENT_FAILURE");
  if (snapshot.misleadingVerificationIncidents > 0) stopCodes.push("MISLEADING_VERIFICATION");
  if (snapshot.prescriptivePurchaseResponses > 0) stopCodes.push("PRESCRIPTIVE_PURCHASE_RESPONSE");
  if (snapshot.sponsoredOrganicMixingIncidents > 0) stopCodes.push("SPONSORED_ORGANIC_MIXING");
  if (snapshot.accessibilityRegressionRatio > .01) stopCodes.push("ACCESSIBILITY_REGRESSION");
  if (snapshot.complaintRatio > .03) stopCodes.push("COMPLAINT_RATE_HIGH");
  if (snapshot.errorRatio > .02) stopCodes.push("ERROR_RATE_HIGH");
  if (snapshot.sampleSize < 100) stopCodes.push("INSUFFICIENT_SAMPLE_FOR_WINNER");
  return Object.freeze({ continueExperiment: stopCodes.every((code) => code === "INSUFFICIENT_SAMPLE_FOR_WINNER"), winnerSelectionAllowed: stopCodes.length === 0, stopCodes: Object.freeze(stopCodes), automaticRolloutAuthorized: false as const });
}
