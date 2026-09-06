export interface NegotiationFairnessEvidence { readonly policyVersion: string; readonly minimumOffersPerCohort: number; readonly maximumOfferDeltaRatio: number; readonly protectedAttributesUsed: readonly string[]; readonly sameInputConsistencyRatio: number; readonly hiddenFloorDisclosureCount: number; readonly unauthorizedBindingOfferCount: number; readonly independentReviewerId: string | null; readonly evidenceChecksum: string }
export function assessNegotiationFairness(evidence: NegotiationFairnessEvidence) {
  const codes: string[] = [];
  if (evidence.minimumOffersPerCohort < 100) codes.push("COHORT_SAMPLE_INSUFFICIENT");
  if (evidence.maximumOfferDeltaRatio > .01 || evidence.sameInputConsistencyRatio < .99) codes.push("OFFER_CONSISTENCY_FAILED");
  if (evidence.protectedAttributesUsed.length > 0) codes.push("PROTECTED_ATTRIBUTE_USE_FORBIDDEN");
  if (evidence.hiddenFloorDisclosureCount > 0 || evidence.unauthorizedBindingOfferCount > 0) codes.push("NEGOTIATION_BOUNDARY_VIOLATION");
  if (!evidence.independentReviewerId || !/^sha256:[a-f0-9]{64}$/u.test(evidence.evidenceChecksum)) codes.push("AUDIT_EVIDENCE_INCOMPLETE");
  return Object.freeze({ passed: codes.length === 0, codes: Object.freeze(codes), aiNegotiationAuthorized: false as const });
}
