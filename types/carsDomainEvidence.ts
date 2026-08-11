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

export interface CarsDomainEvidenceRecord {
  evidenceId: string;

  optionId: string;
  requirementId: string;

  availability: CarsDomainEvidenceAvailability;

  assertion?: unknown;

  source?: CarsDomainEvidenceSource;
  provenance?: CarsDomainEvidenceProvenance;

  limitations: string[];
  conflictReferences: string[];
}

export interface CarsDomainEvidenceConflict {
  conflictId: string;

  optionId: string;
  requirementId: string;

  evidenceIds: string[];

  resolutionStatus: CarsDomainEvidenceConflictStatus;

  description?: string;
}

export interface CarsOptionMatchResult {
  inputIndex: number;
  status: CarsOptionMatchStatus;
  optionId?: string;
  candidateOptionIds: string[];
}

export interface CarsDomainEvidenceInput {
  optionIds: string[];
  evidence: CarsDomainEvidenceRecord[];
  conflicts: CarsDomainEvidenceConflict[];
  optionMatches: CarsOptionMatchResult[];
}

export interface ValidatedCarsDomainEvidenceInput {
  optionIds: string[];
  evidence: CarsDomainEvidenceRecord[];
  conflicts: CarsDomainEvidenceConflict[];
  optionMatches: CarsOptionMatchResult[];
}

export type CarsDomainEvidenceValidationErrorCode =
  | "DUPLICATE_OPTION_ID"
  | "DUPLICATE_EVIDENCE_ID"
  | "UNKNOWN_OPTION_ID"
  | "UNKNOWN_REQUIREMENT_ID"
  | "AVAILABLE_ASSERTION_MISSING"
  | "AVAILABLE_SOURCE_MISSING"
  | "AVAILABLE_PROVENANCE_MISSING"
  | "UNKNOWN_CONFLICT_EVIDENCE"
  | "CONFLICT_OPTION_MISMATCH"
  | "CONFLICT_REQUIREMENT_MISMATCH"
  | "TYPE_B_OPTION_NOT_MATCHED"
  | "TYPE_B_OPTION_AMBIGUOUS"
  | "TYPE_B_UNKNOWN_CANDIDATE_OPTION"
  | "TYPE_B_MATCH_INCONSISTENT";

export interface CarsDomainEvidenceValidationError {
  code: CarsDomainEvidenceValidationErrorCode;
  referenceId?: string;
}

export type CarsDomainEvidenceValidationResult =
  | {
      ok: true;
      value: ValidatedCarsDomainEvidenceInput;
    }
  | {
      ok: false;
      errors: CarsDomainEvidenceValidationError[];
    };

// Parallel IWU-013 representation. The legacy evidence contracts above remain the
// Step 1/legacy boundary until the assessor cutover.
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
