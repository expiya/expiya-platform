export const APPLIANCES_CANDIDATE_EVALUATION_POLICY_VERSION = "appliances-candidate-evaluation/v1" as const;
export type CandidateEligibility = "ELIGIBLE" | "INELIGIBLE" | "ELIGIBILITY_UNKNOWN" | "NOT_EVALUATED";
export type EvidenceResult = "COMPATIBLE" | "INCOMPATIBLE" | "SUPPORTED" | "NOT_SUPPORTED" | "UNKNOWN" | "CONDITIONAL" | "COMPARABLE_VALUE" | "NO_AUTHORIZED_EFFECT";
export interface CandidateReason {
  readonly code: "HARD_TECHNICAL_INCOMPATIBILITY" | "HARD_CAPABILITY_INCOMPATIBILITY" | "REQUIRED_EVIDENCE_UNKNOWN" | "PRICE_COMPATIBLE" | "BUDGET_INCOMPATIBLE" | "BUDGET_ELIGIBILITY_UNKNOWN" | "NON_FILTERING_EVIDENCE" | "UNMAPPED_ACCEPTED_CONTEXT" | "INSTALLATION_POSITIVE_FIT_FORBIDDEN" | "LIFECYCLE_RESTRICTION";
  readonly result: EvidenceResult;
  readonly contextEventId: string;
  readonly conceptId: string;
  readonly semanticMappingRef?: string;
  readonly evidenceRefs: readonly string[];
}
export interface AppliancesCandidateEvaluation {
  readonly productId: string;
  readonly configurationIdentity: string;
  readonly lifecycleState: string;
  readonly eligibility: CandidateEligibility;
  readonly reasons: readonly CandidateReason[];
  readonly unevaluatedContextEventIds: readonly string[];
  readonly disclosureRefs: readonly string[];
}
export interface AppliancesCandidateEvaluationProjection {
  readonly policyVersion: typeof APPLIANCES_CANDIDATE_EVALUATION_POLICY_VERSION;
  readonly catalogRelease: string;
  readonly catalogDigest: string;
  readonly membershipDigest: string;
  readonly semanticRegistryVersion: string;
  readonly semanticDigest: string;
  readonly contextRevision: number;
  readonly contextFingerprint: string;
  readonly evaluationFingerprint: string;
  readonly priceSnapshot?: { readonly snapshotId: string; readonly projectionFingerprint: string; readonly freshness: "READY" | "STALE" };
  readonly counts: { readonly total: number; readonly eligible: number; readonly ineligible: number; readonly unknown: number; readonly notEvaluated: number };
  readonly candidates: readonly AppliancesCandidateEvaluation[];
  readonly remainingProductRefs: readonly string[];
  readonly supportedDiscriminators: readonly string[];
  readonly unsupportedContextEventIds: readonly string[];
}
export type AppliancesCandidateEvaluationResult = { readonly status: "READY"; readonly projection: AppliancesCandidateEvaluationProjection } | { readonly status: "FAILED_CLOSED"; readonly reason: "AUTHORITY_MISMATCH" | "CATALOG_INTEGRITY_FAILURE" | "SEMANTIC_INTEGRITY_FAILURE" | "CONTEXT_INTEGRITY_FAILURE" | "EVIDENCE_INTEGRITY_FAILURE" | "PRICE_INTEGRITY_FAILURE" };
