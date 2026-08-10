export type CarsTypeBCandidateInputValidationErrorCode =
  | "DECISION_OPTIONS_NOT_ARRAY"
  | "TOO_FEW_CANDIDATES"
  | "CANDIDATE_NOT_OBJECT"
  | "CANDIDATE_OPTION_ID_MISSING"
  | "CANDIDATE_OPTION_ID_INVALID"
  | "DUPLICATE_CANDIDATE_OPTION_ID";

export interface CarsTypeBCandidateInputValidationError {
  code: CarsTypeBCandidateInputValidationErrorCode;
  referenceId?: string;
}

export interface ValidatedCarsTypeBCandidate {
  readonly inputIndex: number;
  readonly optionId: string;
}

export type CarsTypeBCandidateInputValidationResult =
  | {
      ok: true;
      value: readonly ValidatedCarsTypeBCandidate[];
    }
  | {
      ok: false;
      errors: readonly CarsTypeBCandidateInputValidationError[];
    };

function isCandidateObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function validateCarsTypeBCandidateInput(
  decisionOptions: unknown,
): CarsTypeBCandidateInputValidationResult {
  if (!Array.isArray(decisionOptions)) {
    return {
      ok: false,
      errors: [
        {
          code: "DECISION_OPTIONS_NOT_ARRAY",
        },
      ],
    };
  }

  const errors: CarsTypeBCandidateInputValidationError[] = [];
  const validatedCandidates: ValidatedCarsTypeBCandidate[] = [];
  const optionIds = new Set<string>();

  if (decisionOptions.length < 2) {
    errors.push({
      code: "TOO_FEW_CANDIDATES",
    });
  }

  decisionOptions.forEach((candidate, inputIndex) => {
    const referenceId = String(inputIndex);

    if (!isCandidateObject(candidate)) {
      errors.push({
        code: "CANDIDATE_NOT_OBJECT",
        referenceId,
      });
      return;
    }

    if (
      !Object.prototype.hasOwnProperty.call(candidate, "optionId")
    ) {
      errors.push({
        code: "CANDIDATE_OPTION_ID_MISSING",
        referenceId,
      });
      return;
    }

    const optionId = candidate.optionId;

    if (typeof optionId !== "string" || optionId.length === 0) {
      errors.push({
        code: "CANDIDATE_OPTION_ID_INVALID",
        referenceId,
      });
      return;
    }

    if (optionIds.has(optionId)) {
      errors.push({
        code: "DUPLICATE_CANDIDATE_OPTION_ID",
        referenceId,
      });
      return;
    }

    optionIds.add(optionId);
    validatedCandidates.push({
      inputIndex,
      optionId,
    });
  });

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: validatedCandidates,
  };
}
