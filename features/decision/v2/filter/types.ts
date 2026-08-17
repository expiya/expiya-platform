import type { CatalogFact } from "../catalog/types";
import type { ConstraintEvent } from "../domain/constraint";
import type { CandidateRejectionEvent } from "../domain/rejection";
import type { CatalogFactReference, UsageCargoNeed, UsagePolicyReference } from "../usage/types";

export type FilterOperator = "EQUALS" | "ONE_OF" | "EXCLUDES" | "MINIMUM" | "MAXIMUM";
export type TechnicalCandidateDisposition = "ELIGIBLE" | "NOT_EVALUABLE" | "ELIMINATED";
export type DecisionFieldUse = "HARD_FILTER_ALLOWED" | "DEFERRED_TO_AFFORDABILITY" | "NOT_FOR_FILTERING";
export interface ActiveHardConstraint {
  readonly constraintId: string; readonly fieldId: string; readonly operator: FilterOperator | string;
  readonly value: unknown; readonly unit?: string; readonly sourceEventId: string;
}
export interface ActiveNonHardConstraint { readonly constraintId: string; readonly fieldId: string; readonly decisionEffect: ConstraintEvent["decisionEffect"]; readonly normalizedValue: unknown; readonly sourceEventId: string }
export interface ConstraintProjectionTrace { readonly eventId: string; readonly terminal: boolean; readonly appliedAs: "HARD" | "NON_HARD" | "IGNORED"; readonly reason: string }
export interface ActiveConstraintProjection {
  readonly activeHardConstraints: readonly ActiveHardConstraint[]; readonly activeNonHardConstraints: readonly ActiveNonHardConstraint[];
  readonly supersessionTrace: readonly ConstraintProjectionTrace[]; readonly diagnostics: readonly PipelineDiagnostic[];
}
export interface ActiveRejectionProjection { readonly rejections: readonly CandidateRejectionEvent[] }

export interface DecisionFieldDefinition {
  readonly fieldId: string; readonly snapshotPath: string; readonly valueType: "NUMBER" | "ENUM" | "STRING";
  readonly supportedOperators: readonly FilterOperator[]; readonly unit?: string; readonly missingValuePolicy: "NOT_EVALUABLE";
  readonly requiredFactAuthority: "CATALOG_MEDIUM_OR_HIGH_WITH_PROVENANCE"; readonly decisionUse: DecisionFieldUse;
  readonly policyVersion: string; readonly enumValues?: readonly string[];
  readonly readFact: (variant: import("../catalog/types").CatalogVariantSnapshot) => CatalogFact<unknown> | undefined;
}
export interface DecisionFieldRegistry { readonly policyId: string; readonly policyVersion: string; readonly fields: readonly DecisionFieldDefinition[] }
export type PipelineDiagnosticCode =
  | "UNKNOWN_REJECTION_REFERENCE" | "CONFLICTING_ACTIVE_HARD_CONSTRAINTS" | "DUPLICATE_CONSTRAINT_ID"
  | "UNREGISTERED_DECISION_FIELD" | "UNSUPPORTED_FILTER_OPERATOR" | "FILTER_VALUE_TYPE_MISMATCH"
  | "FILTER_UNIT_MISMATCH" | "DECISION_FINGERPRINT_MISSING" | "DUPLICATE_SNAPSHOT_VARIANT_ID";
export interface PipelineDiagnostic { readonly code: PipelineDiagnosticCode; readonly referenceId?: string; readonly fieldId?: string }
export interface TechnicalCandidateResult {
  readonly exactVariantId: string; readonly modelFamilyId: string; readonly disposition: TechnicalCandidateDisposition;
  readonly passedFilterIds: readonly string[]; readonly failedFilterIds: readonly string[]; readonly unknownFilterIds: readonly string[];
  readonly reasonCodes: readonly string[]; readonly factReferences: readonly CatalogFactReference[];
}
export interface FilterStepTrace {
  readonly filterId: string; readonly fieldId: string; readonly constraintIds: readonly string[];
  readonly inputCandidateIds: readonly string[]; readonly passedCandidateIds: readonly string[];
  readonly notEvaluableCandidateIds: readonly string[]; readonly eliminatedCandidateIds: readonly string[];
  readonly reasonCodes: readonly string[]; readonly policyReferences: readonly UsagePolicyReference[];
}
export interface TechnicalCandidatePool {
  readonly catalogFingerprint: string; readonly decisionFingerprint: string; readonly initialCandidateIds: readonly string[];
  readonly eligibleCandidateIds: readonly string[]; readonly notEvaluableCandidateIds: readonly string[]; readonly eliminatedCandidateIds: readonly string[];
  readonly candidates: readonly TechnicalCandidateResult[]; readonly filterTrace: readonly FilterStepTrace[];
  readonly deferredConstraintIds: readonly string[]; readonly diagnostics: readonly PipelineDiagnostic[];
  readonly firstZeroEligibleFilterId?: string;
  readonly counts: { readonly initial: number; readonly eligible: number; readonly notEvaluable: number; readonly eliminated: number };
}
export interface TechnicalPipelineInput {
  readonly snapshot: import("../catalog/types").CatalogSnapshot; readonly decisionFingerprint: string;
  readonly activeConstraints: ActiveConstraintProjection; readonly activeRejections: ActiveRejectionProjection;
  readonly usageNeed: UsageCargoNeed; readonly fieldRegistry: DecisionFieldRegistry;
  readonly usagePolicies: import("../usage/policy").UsageCargoPolicies;
}
