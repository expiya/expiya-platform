export type InternalReviewTrack = "PRODUCT_ARCHITECTURE" | "SECURITY_BOUNDARY" | "OPERATIONS_FEASIBILITY" | "LEGAL_KVKK_CHECKLIST";
export interface FounderDecisionInternalReview {
  readonly reviewId: string;
  readonly ratificationId: "UC-RAT-2026-09-01-001";
  readonly track: InternalReviewTrack;
  readonly reviewedDecisionIds: readonly string[];
  readonly evidenceReferences: readonly string[];
  readonly criticalInternalFindingCount: 0;
  readonly outcome: "INTERNAL_PASS_EXTERNAL_SIGNOFF_REQUIRED";
  readonly externalSignoffRole: "PRODUCT_OWNER" | "SECURITY_REVIEWER" | "OPERATIONS_OWNER" | "LEGAL_COUNSEL";
  readonly externalSignoffRecorded: false;
  readonly productionEffectAuthorized: false;
}

const allDecisionIds = Object.freeze(Array.from({ length: 10 }, (_, index) => `UC-PD-${String(index + 1).padStart(3, "0")}`));
export const founderDecisionInternalReviews: readonly FounderDecisionInternalReview[] = Object.freeze([
  { reviewId: "UC-REV-PRODUCT-001", ratificationId: "UC-RAT-2026-09-01-001", track: "PRODUCT_ARCHITECTURE", reviewedDecisionIds: allDecisionIds, evidenceReferences: ["architectureDecisions", "productDecisionWorkshop", "releaseBundle"], criticalInternalFindingCount: 0, outcome: "INTERNAL_PASS_EXTERNAL_SIGNOFF_REQUIRED", externalSignoffRole: "PRODUCT_OWNER", externalSignoffRecorded: false, productionEffectAuthorized: false },
  { reviewId: "UC-REV-SECURITY-001", ratificationId: "UC-RAT-2026-09-01-001", track: "SECURITY_BOUNDARY", reviewedDecisionIds: ["UC-PD-003", "UC-PD-007", "UC-PD-008", "UC-PD-010"], evidenceReferences: ["securityTestPlan", "authorizationInvariant", "tenantIsolation", "channelSafetyEval"], criticalInternalFindingCount: 0, outcome: "INTERNAL_PASS_EXTERNAL_SIGNOFF_REQUIRED", externalSignoffRole: "SECURITY_REVIEWER", externalSignoffRecorded: false, productionEffectAuthorized: false },
  { reviewId: "UC-REV-OPS-001", ratificationId: "UC-RAT-2026-09-01-001", track: "OPERATIONS_FEASIBILITY", reviewedDecisionIds: ["UC-PD-001", "UC-PD-002", "UC-PD-004", "UC-PD-005", "UC-PD-006", "UC-PD-008"], evidenceReferences: ["pilotCapacity", "pilotCohort", "incidentDrills", "dataQualityJobs"], criticalInternalFindingCount: 0, outcome: "INTERNAL_PASS_EXTERNAL_SIGNOFF_REQUIRED", externalSignoffRole: "OPERATIONS_OWNER", externalSignoffRecorded: false, productionEffectAuthorized: false },
  { reviewId: "UC-REV-LEGAL-001", ratificationId: "UC-RAT-2026-09-01-001", track: "LEGAL_KVKK_CHECKLIST", reviewedDecisionIds: ["UC-PD-003", "UC-PD-004", "UC-PD-005", "UC-PD-008", "UC-PD-009", "UC-PD-010"], evidenceReferences: ["legalArtifactRegistry", "processingInventory", "retentionMatrix", "consentBoundary"], criticalInternalFindingCount: 0, outcome: "INTERNAL_PASS_EXTERNAL_SIGNOFF_REQUIRED", externalSignoffRole: "LEGAL_COUNSEL", externalSignoffRecorded: false, productionEffectAuthorized: false },
]);

export function validateFounderDecisionInternalReviews(reviews: readonly FounderDecisionInternalReview[]) {
  const tracks: readonly InternalReviewTrack[] = ["PRODUCT_ARCHITECTURE", "SECURITY_BOUNDARY", "OPERATIONS_FEASIBILITY", "LEGAL_KVKK_CHECKLIST"];
  const missing = tracks.filter((track) => !reviews.some((review) => review.track === track));
  const unsafe = reviews.filter((review) => review.criticalInternalFindingCount !== 0 || review.evidenceReferences.length < 3 || review.externalSignoffRecorded || review.productionEffectAuthorized || review.outcome !== "INTERNAL_PASS_EXTERNAL_SIGNOFF_REQUIRED").map((review) => review.reviewId);
  return Object.freeze({ complete: missing.length === 0 && unsafe.length === 0, missing: Object.freeze(missing), unsafe: Object.freeze(unsafe), internalReviewPassed: missing.length === 0 && unsafe.length === 0, externalSignoffsComplete: false as const, productGovernanceReady: false as const, productionEffectAuthorized: false as const });
}
