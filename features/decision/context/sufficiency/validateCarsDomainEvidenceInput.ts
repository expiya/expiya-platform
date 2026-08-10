import type {
  CarsDomainEvidenceInput,
  CarsDomainEvidenceValidationError,
  CarsDomainEvidenceValidationResult,
} from "@/types/carsDomainEvidence";
import type {
  CarsDecisionType,
  CarsSufficiencyPolicy,
} from "@/types/contextSufficiency";

export interface ValidateCarsDomainEvidenceInputInput {
  input: CarsDomainEvidenceInput;
  policy: CarsSufficiencyPolicy;
  decisionType: CarsDecisionType;
}

function duplicateValues(values: string[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return duplicates;
}

export function validateCarsDomainEvidenceInput(
  request: ValidateCarsDomainEvidenceInputInput,
): CarsDomainEvidenceValidationResult {
  const errors: CarsDomainEvidenceValidationError[] = [];

  const optionIds = new Set(request.input.optionIds);

  for (const duplicate of duplicateValues(request.input.optionIds)) {
    errors.push({
      code: "DUPLICATE_OPTION_ID",
      referenceId: duplicate,
    });
  }

  const requirementIds = new Set(
    request.policy.requirements.map(
      (requirement) => requirement.requirementId,
    ),
  );

  const duplicateEvidenceIds = duplicateValues(
    request.input.evidence.map(
      (evidence) => evidence.evidenceId,
    ),
  );

  for (const duplicate of duplicateEvidenceIds) {
    errors.push({
      code: "DUPLICATE_EVIDENCE_ID",
      referenceId: duplicate,
    });
  }

  const evidenceById = new Map(
    request.input.evidence.map(
      (evidence) => [evidence.evidenceId, evidence] as const,
    ),
  );

  for (const evidence of request.input.evidence) {
    if (!optionIds.has(evidence.optionId)) {
      errors.push({
        code: "UNKNOWN_OPTION_ID",
        referenceId: evidence.evidenceId,
      });
    }

    if (!requirementIds.has(evidence.requirementId)) {
      errors.push({
        code: "UNKNOWN_REQUIREMENT_ID",
        referenceId: evidence.evidenceId,
      });
    }

    if (evidence.availability !== "AVAILABLE") {
      continue;
    }

    if (evidence.assertion === undefined) {
      errors.push({
        code: "AVAILABLE_ASSERTION_MISSING",
        referenceId: evidence.evidenceId,
      });
    }

    if (evidence.source === undefined) {
      errors.push({
        code: "AVAILABLE_SOURCE_MISSING",
        referenceId: evidence.evidenceId,
      });
    }

    if (evidence.provenance === undefined) {
      errors.push({
        code: "AVAILABLE_PROVENANCE_MISSING",
        referenceId: evidence.evidenceId,
      });
    }
  }

  for (const conflict of request.input.conflicts) {
    if (!optionIds.has(conflict.optionId)) {
      errors.push({
        code: "UNKNOWN_OPTION_ID",
        referenceId: conflict.conflictId,
      });
    }

    if (!requirementIds.has(conflict.requirementId)) {
      errors.push({
        code: "UNKNOWN_REQUIREMENT_ID",
        referenceId: conflict.conflictId,
      });
    }

    for (const evidenceId of conflict.evidenceIds) {
      const evidence = evidenceById.get(evidenceId);

      if (!evidence) {
        errors.push({
          code: "UNKNOWN_CONFLICT_EVIDENCE",
          referenceId: conflict.conflictId,
        });
        continue;
      }

      if (evidence.optionId !== conflict.optionId) {
        errors.push({
          code: "CONFLICT_OPTION_MISMATCH",
          referenceId: conflict.conflictId,
        });
      }

      if (
        evidence.requirementId !==
        conflict.requirementId
      ) {
        errors.push({
          code: "CONFLICT_REQUIREMENT_MISMATCH",
          referenceId: conflict.conflictId,
        });
      }
    }
  }

  if (
    request.decisionType ===
    "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON"
  ) {
    for (const match of request.input.optionMatches) {
      if (match.status === "AMBIGUOUS") {
        errors.push({
          code: "TYPE_B_OPTION_AMBIGUOUS",
          referenceId: String(match.inputIndex),
        });
        continue;
      }

      if (match.status === "NOT_FOUND") {
        errors.push({
          code: "TYPE_B_OPTION_NOT_MATCHED",
          referenceId: String(match.inputIndex),
        });
        continue;
      }

      const hasUnknownCandidateOption =
        match.candidateOptionIds.some(
          (candidateOptionId) =>
            !optionIds.has(candidateOptionId),
        );

      if (hasUnknownCandidateOption) {
        errors.push({
          code: "TYPE_B_UNKNOWN_CANDIDATE_OPTION",
          referenceId: String(match.inputIndex),
        });
      }

      if (
        match.optionId === undefined ||
        !optionIds.has(match.optionId)
      ) {
        errors.push({
          code: "TYPE_B_OPTION_NOT_MATCHED",
          referenceId: String(match.inputIndex),
        });
        continue;
      }

      if (
        match.candidateOptionIds.length !== 1 ||
        match.candidateOptionIds[0] !== match.optionId
      ) {
        errors.push({
          code: "TYPE_B_MATCH_INCONSISTENT",
          referenceId: String(match.inputIndex),
        });
      }
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: request.input,
  };
}
