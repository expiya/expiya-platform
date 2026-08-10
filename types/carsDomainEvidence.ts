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
