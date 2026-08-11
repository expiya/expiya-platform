import type {
  CarsDomainFactCategory,
  CarsDomainFactRequirementId,
  CarsDomainFactRequirementResolutionResult,
} from "@/types/carsDomainFactRequirement";

export type CarsDomainEvidenceAvailability =
  | "AVAILABLE"
  | "MISSING"
  | "UNRESOLVED";

export type CarsDomainEvidenceConflictStatus =
  | "RESOLVED"
  | "UNRESOLVED";

export type CarsOptionMatchStatus =
  | "MATCHED"
  | "AMBIGUOUS"
  | "NOT_FOUND";

export type CarsDomainEvidenceProvenance =
  | "AUTHORITATIVE_SOURCE"
  | "DECLARED_SOURCE"
  | "UNKNOWN";

export interface CarsDomainEvidenceSource {
  sourceId: string;
  reference: string;
}

export interface CarsOptionMatchResult {
  inputIndex: number;
  status: CarsOptionMatchStatus;
  optionId?: string;
  candidateOptionIds: string[];
}

export interface CarsDomainEvidenceAssertion {
  readonly evidenceId: string;
  readonly optionId: string;
  readonly category: CarsDomainFactCategory;
  readonly availability: CarsDomainEvidenceAvailability;
  readonly assertion?: unknown;
  readonly source?: CarsDomainEvidenceSource;
  readonly provenance?: CarsDomainEvidenceProvenance;
  readonly limitations: readonly string[];
  readonly conflictReferences: readonly string[];
}

export interface CarsDomainEvidenceRequirementLink {
  readonly evidenceId: string;
  readonly requirementId: CarsDomainFactRequirementId;
}

export interface CarsDomainEvidenceAssertionConflict {
  readonly conflictId: string;
  readonly evidenceIds: readonly [string, string, ...string[]];
  readonly resolutionStatus: CarsDomainEvidenceConflictStatus;
  readonly description?: string;
}

export interface CarsDomainEvidenceLinkageInput {
  readonly optionIds: readonly string[];
  readonly requirementResolution: CarsDomainFactRequirementResolutionResult;
  readonly assertions: readonly CarsDomainEvidenceAssertion[];
  readonly requirementLinks: readonly CarsDomainEvidenceRequirementLink[];
  readonly conflicts: readonly CarsDomainEvidenceAssertionConflict[];
  readonly optionMatches: readonly CarsOptionMatchResult[];
}

export type ValidatedCarsDomainEvidenceLinkageInput =
  CarsDomainEvidenceLinkageInput;

export type CarsDomainEvidenceLinkageValidationErrorCode =
  | "DUPLICATE_OPTION_ID"
  | "DUPLICATE_REQUIREMENT_ID"
  | "DUPLICATE_ASSERTION_ID"
  | "DUPLICATE_CONFLICT_ID"
  | "REQUIREMENT_RESOLUTION_FAILED"
  | "REQUIREMENT_RESOLUTION_INTEGRITY"
  | "INVALID_ZERO_REQUIREMENT_RESOLUTION"
  | "UNKNOWN_ASSERTION_OPTION"
  | "AVAILABLE_ASSERTION_MISSING"
  | "AVAILABLE_SOURCE_MISSING"
  | "AVAILABLE_PROVENANCE_MISSING"
  | "UNKNOWN_LINK_ASSERTION"
  | "UNKNOWN_LINK_REQUIREMENT"
  | "DUPLICATE_REQUIREMENT_LINK"
  | "LINK_OPTION_SCOPE_MISMATCH"
  | "LINK_FACT_CATEGORY_MISMATCH"
  | "UNLINKED_ASSERTION"
  | "UNKNOWN_CONFLICT_ASSERTION"
  | "DUPLICATE_CONFLICT_ASSERTION"
  | "CONFLICT_LINEAGE_MISMATCH"
  | "CONFLICT_OPTION_MISMATCH"
  | "CONFLICT_FACT_CATEGORY_MISMATCH"
  | "TYPE_B_DUPLICATE_INPUT_INDEX"
  | "TYPE_B_OPTION_NOT_MATCHED"
  | "TYPE_B_OPTION_AMBIGUOUS"
  | "TYPE_B_UNKNOWN_CANDIDATE_OPTION"
  | "TYPE_B_MATCH_INCONSISTENT";

export interface CarsDomainEvidenceLinkageValidationError {
  readonly code: CarsDomainEvidenceLinkageValidationErrorCode;
  readonly referenceId: string;
}

export type CarsDomainEvidenceLinkageValidationResult =
  | { readonly ok: true; readonly value: ValidatedCarsDomainEvidenceLinkageInput }
  | { readonly ok: false; readonly errors: readonly CarsDomainEvidenceLinkageValidationError[] };
