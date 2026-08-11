import type { ContextCandidateId } from "@/types/contextCandidate";

export type CarsDomainFactCategory =
  | "Car.id"
  | "brand"
  | "model"
  | "year"
  | "fuel"
  | "transmission"
  | "bodyType";

export type CarsCanonicalScalar = string | number;

export type CarsDomainFactPredicate =
  | {
      readonly relation: "EXACT_EQUAL" | "EXACT_NOT_EQUAL";
      readonly operand: CarsCanonicalScalar;
    }
  | {
      readonly relation: "IN_SET" | "NOT_IN_SET";
      readonly operand: readonly [
        CarsCanonicalScalar,
        ...CarsCanonicalScalar[],
      ];
    }
  | {
      readonly relation: "ORDERED_YEAR_COMPARISON";
      readonly direction:
        | "BEFORE"
        | "ON_OR_BEFORE"
        | "AFTER"
        | "ON_OR_AFTER";
      readonly operand: number;
    }
  | {
      readonly relation: "RAW_FACT_REQUIRED";
      readonly operand?: never;
    };

export type CarsDomainFactRequirementId = string;

export interface CarsDomainFactContextLineage {
  readonly candidateId: ContextCandidateId;
  readonly bindingReferenceId: string;
  readonly contextSourceOccurrence: number;
  readonly candidateInputOccurrence: number;
  readonly relationSourceOccurrence: number;
}

export type CarsDomainFactOptionScope =
  | { readonly kind: "ALL_RESOLVED_OPTIONS" }
  | {
      readonly kind: "OPTION_IDS";
      readonly optionIds: readonly [string, ...string[]];
    };

export interface CarsDomainFactBinding {
  readonly parentPolicyRequirementId: string;
  readonly contextLineage: readonly [
    CarsDomainFactContextLineage,
    ...CarsDomainFactContextLineage[],
  ];
  readonly optionScope: CarsDomainFactOptionScope;
  readonly category: CarsDomainFactCategory;
  readonly predicate: CarsDomainFactPredicate;
  readonly bindingSourceOccurrence: number;
  readonly relationSourceOccurrence: number;
}

export interface CarsDomainFactRequirementIdentity {
  readonly version: "cars-dfr:v1";
  readonly policyId: string;
  readonly policyVersion: string;
  readonly parentPolicyRequirementId: string;
  readonly contextLineage: readonly CarsDomainFactContextLineage[];
  readonly optionIds: readonly string[];
  readonly category: CarsDomainFactCategory;
  readonly predicate: CarsDomainFactPredicate;
}

export interface CarsDomainFactRequirement {
  readonly id: CarsDomainFactRequirementId;
  readonly identity: CarsDomainFactRequirementIdentity;
  readonly bindingSourceOccurrence: number;
  readonly relationSourceOccurrence: number;
}

export type CarsDomainFactResolutionReason =
  | "CONTEXT_ONLY"
  | "NOT_MATERIAL"
  | "CANDIDATE_IDENTITY_COVERED";

export type CarsDomainFactRequirementResolution =
  | {
      readonly parentPolicyRequirementId: string;
      readonly status: "RESOLVED";
      readonly requirements: readonly CarsDomainFactRequirement[];
      readonly reason?: CarsDomainFactResolutionReason;
    }
  | {
      readonly parentPolicyRequirementId: string;
      readonly status: "UNRESOLVED";
      readonly requirements: readonly [];
      readonly limitations: readonly [string, ...string[]];
      readonly contextLineage: readonly CarsDomainFactContextLineage[];
    }
  | {
      readonly parentPolicyRequirementId: string;
      readonly status: "FAILED";
      readonly requirements: readonly [];
      readonly errors: readonly [
        CarsDomainFactRequirementResolutionError,
        ...CarsDomainFactRequirementResolutionError[],
      ];
    };

export type CarsDomainFactRequirementResolutionErrorCode =
  | "UNKNOWN_PARENT_POLICY_REQUIREMENT"
  | "DUPLICATE_MATERIALITY_ASSESSMENT"
  | "MISSING_MATERIALITY_ASSESSMENT"
  | "INVALID_OCCURRENCE"
  | "UNKNOWN_CONTEXT_LINEAGE"
  | "DUPLICATE_CONTEXT_LINEAGE"
  | "INVALID_FACT_CATEGORY"
  | "INVALID_PREDICATE"
  | "INVALID_CATEGORY_OPERAND"
  | "EMPTY_SET_OPERAND"
  | "DUPLICATE_SET_OPERAND"
  | "MIXED_SET_OPERAND_TYPES"
  | "EMPTY_OPTION_SCOPE"
  | "DUPLICATE_OPTION_SCOPE_ID"
  | "UNKNOWN_OPTION_SCOPE_ID"
  | "MATERIAL_BINDING_MISSING"
  | "RESOLVED_ZERO_INVALID"
  | "UNRESOLVED_WITH_REQUIREMENTS"
  | "DUPLICATE_CONCRETE_REQUIREMENT"
  | "CONCRETE_REQUIREMENT_ID_COLLISION"
  | "CANDIDATE_IDENTITY_COVERAGE_MISSING";

export interface CarsDomainFactRequirementResolutionError {
  readonly code: CarsDomainFactRequirementResolutionErrorCode;
  readonly parentPolicyRequirementId: string;
  readonly referenceId: string;
}

export interface CarsCandidateIdentityCoverageTrace {
  readonly parentPolicyRequirementId: "candidate-options";
  readonly canonicalProducerReferenceId: string;
  readonly catalogAcquisitionReferenceId: string;
  readonly exactMatcherReferenceId: string;
  readonly candidateIds: readonly [ContextCandidateId, ...ContextCandidateId[]];
  readonly optionIds: readonly [string, ...string[]];
}

export interface CarsDomainFactRequirementResolutionResult {
  readonly status: "RESOLVED" | "UNRESOLVED" | "FAILED";
  readonly resolutions: readonly CarsDomainFactRequirementResolution[];
  readonly requirements: readonly CarsDomainFactRequirement[];
  readonly limitations: readonly string[];
  readonly errors: readonly CarsDomainFactRequirementResolutionError[];
}
