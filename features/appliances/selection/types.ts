import type { AppliancesAuthoritySnapshot } from "../authority/types";
import type { AppliancesCandidateEvaluationResult } from "../candidate/types";
import type { AppliancesConversationState } from "../contracts";
import type { CandidateSelectionPolicyLoadResult } from "../governance/candidateSelectionPolicyLoader.server";
import type { AppliancesSufficiencyResult } from "../sufficiency/types";

export const APPLIANCES_CANDIDATE_SELECTION_RUNTIME_VERSION = "appliances-candidate-selection-runtime/v1" as const;
export type SelectionOutcomeKind = "SELECTED_SINGLE" | "TIED_TOP_SET" | "NON_DOMINATED_SET" | "NO_GOVERNED_SELECTION" | "FAILED_CLOSED";
export type SelectionDimension = "REMOTE_CONTROL" | "DETERGENT_CONVENIENCE" | "LOW_NOISE_PRIORITY";
export type PairwiseState = "BETTER" | "EQUAL" | "WORSE" | "INDETERMINATE" | "NOT_ACTIVE";
export type SelectionFailureReason =
  | "SELECTION_POLICY_AUTHORITY_FAILURE" | "POLICY_RUNTIME_DIVERGENCE" | "DEPENDENCY_BINDING_MISMATCH"
  | "INPUT_NOT_RECOMMENDATION_POOL_ELIGIBLE" | "DUPLICATE_CANDIDATE_ID" | "UNKNOWN_CANDIDATE_ID"
  | "POOL_FINGERPRINT_MISMATCH" | "SUFFICIENCY_FINGERPRINT_MISMATCH" | "CONTEXT_REVISION_MISMATCH"
  | "CONTEXT_FINGERPRINT_MISMATCH" | "CANDIDATE_EVALUATION_FINGERPRINT_MISMATCH" | "CANDIDATE_PARTITION_MISMATCH"
  | "UNKNOWN_ACTIVE_CONTEXT_VALUE" | "MALFORMED_CAPABILITY_EVIDENCE" | "MALFORMED_TECHNICAL_FACT"
  | "INVALID_LIFECYCLE_OR_MARKET_APPLICABILITY" | "RATIONALE_EVIDENCE_BINDING_MISMATCH"
  | "IMPOSSIBLE_PAIRWISE_COMPARISON" | "INVALID_DOMINANCE_GRAPH";

export interface DimensionComparison {
  readonly dimension: SelectionDimension;
  readonly contextEventId: string;
  readonly contextValue: "WANTED" | "IMPORTANT";
  readonly state: PairwiseState;
  readonly evidenceRefsA: readonly string[];
  readonly evidenceRefsB: readonly string[];
  readonly semanticMappingRef: string;
  readonly limitationCodes: readonly string[];
}
export interface PairwiseComparisonRecord { readonly candidateAId: string; readonly candidateBId: string; readonly dimensions: readonly DimensionComparison[]; readonly materialIndeterminacy: boolean }
export interface DominanceRecord { readonly dominantCandidateId: string; readonly dominatedCandidateId: string; readonly betterDimensions: readonly SelectionDimension[] }
export interface SelectionProvenance {
  readonly runtimeVersion: typeof APPLIANCES_CANDIDATE_SELECTION_RUNTIME_VERSION;
  readonly selectionPolicyId: string; readonly selectionPolicyDigest: string;
  readonly catalogRelease: string; readonly catalogDigest: string; readonly membershipDigest: string; readonly catalogArtifactSha256: string;
  readonly semanticRegistryId: string; readonly semanticDigest: string; readonly questionPolicyId: string; readonly questionPolicyDigest: string;
  readonly sufficiencyPolicyId: string; readonly sufficiencyPolicyDigest: string; readonly candidateEvaluationPolicy: string; readonly questionSelectionPolicy: string;
  readonly inputSufficiencyResultFingerprint: string; readonly inputPoolFingerprint: string;
  readonly contextRevision: number; readonly contextFingerprint: string; readonly candidateEvaluationFingerprint: string;
  readonly priceSnapshot?: { readonly snapshotId: string; readonly projectionFingerprint: string; readonly freshness: "READY" | "STALE" };
}
interface ResultBase {
  readonly provenance: SelectionProvenance; readonly eligibleInputCandidateIds: readonly string[]; readonly activeSelectionDimensions: readonly SelectionDimension[];
  readonly pairwiseComparisons: readonly PairwiseComparisonRecord[]; readonly dominanceRecords: readonly DominanceRecord[];
  readonly supportingEvidenceRefs: readonly string[]; readonly uncertaintyDisclosures: readonly string[];
  readonly budgetUnknownCandidateIds: readonly string[]; readonly budgetIncompatibleCandidateIds: readonly string[]; readonly requiredDisclosureRefs: readonly string[];
  readonly deterministicResultFingerprint: string;
}
export type AppliancesCandidateSelectionResult =
  | { readonly outcome: "FAILED_CLOSED"; readonly reason: SelectionFailureReason; readonly deterministicResultFingerprint: string }
  | (ResultBase & { readonly outcome: "SELECTED_SINGLE"; readonly selectedCandidateId: string })
  | (ResultBase & { readonly outcome: "TIED_TOP_SET"; readonly tiedCandidateIds: readonly string[] })
  | (ResultBase & { readonly outcome: "NON_DOMINATED_SET"; readonly nonDominatedCandidateIds: readonly string[] })
  | (ResultBase & { readonly outcome: "NO_GOVERNED_SELECTION" });

export interface AppliancesCandidateSelectionInput { readonly authority: AppliancesAuthoritySnapshot; readonly state: AppliancesConversationState; readonly evaluation: AppliancesCandidateEvaluationResult; readonly sufficiency: AppliancesSufficiencyResult; readonly policy: CandidateSelectionPolicyLoadResult }
