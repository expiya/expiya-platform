import type {
  CarsDomainEvidenceLinkageInput,
  CarsDomainEvidenceLinkageValidationError,
  CarsDomainEvidenceLinkageValidationResult,
} from "@/types/carsDomainEvidence";
import type {
  CarsDomainFactRequirement,
  CarsDomainFactRequirementResolution,
} from "@/types/carsDomainFactRequirement";
import type { CarsDecisionType } from "@/types/contextSufficiency";

export interface ValidateCarsDomainEvidenceLinkageInputInput {
  readonly input: CarsDomainEvidenceLinkageInput;
  readonly decisionType: CarsDecisionType;
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  values.forEach((value) => seen.has(value) ? duplicate.add(value) : seen.add(value));
  return [...duplicate].sort();
}

function error(
  errors: CarsDomainEvidenceLinkageValidationError[],
  code: CarsDomainEvidenceLinkageValidationError["code"],
  referenceId: string,
): void {
  errors.push({ code, referenceId });
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((item, index) => structurallyEqual(item, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) =>
    key === rightKeys[index] && structurallyEqual(leftRecord[key], rightRecord[key]));
}

function requirementIntegrity(
  input: CarsDomainEvidenceLinkageInput,
  errors: CarsDomainEvidenceLinkageValidationError[],
): Map<string, CarsDomainFactRequirement> {
  const result = input.requirementResolution;
  const requirements = new Map<string, CarsDomainFactRequirement>();
  for (const id of duplicates(result.requirements.map((item) => item.id))) {
    error(errors, "DUPLICATE_REQUIREMENT_ID", id);
  }
  result.requirements.forEach((item) => requirements.set(item.id, item));

  const resolutionParents = new Set<string>();
  const resolutionRequirementIds: string[] = [];
  for (const resolution of result.resolutions) {
    if (resolutionParents.has(resolution.parentPolicyRequirementId)) {
      error(errors, "REQUIREMENT_RESOLUTION_INTEGRITY", resolution.parentPolicyRequirementId);
    }
    resolutionParents.add(resolution.parentPolicyRequirementId);
    if (resolution.status === "FAILED") {
      error(errors, "REQUIREMENT_RESOLUTION_FAILED", resolution.parentPolicyRequirementId);
    }
    resolution.requirements.forEach((item) => resolutionRequirementIds.push(item.id));
    validateZeroResolution(resolution, errors);
  }

  const aggregateIds = result.requirements.map((item) => item.id).sort();
  const nestedIds = [...resolutionRequirementIds].sort();
  if (aggregateIds.length !== nestedIds.length || aggregateIds.some((id, index) => id !== nestedIds[index])) {
    error(errors, "REQUIREMENT_RESOLUTION_INTEGRITY", "requirements");
  }
  for (const resolution of result.resolutions) {
    for (const nested of resolution.requirements) {
      const aggregate = requirements.get(nested.id);
      if (aggregate && !structurallyEqual(aggregate, nested)) {
        error(errors, "REQUIREMENT_RESOLUTION_INTEGRITY", nested.id);
      }
    }
  }
  const derivedStatus = result.resolutions.some((item) => item.status === "FAILED")
    ? "FAILED"
    : result.resolutions.some((item) => item.status === "UNRESOLVED")
      ? "UNRESOLVED"
      : "RESOLVED";
  if (result.status !== derivedStatus) {
    error(errors, "REQUIREMENT_RESOLUTION_INTEGRITY", "status");
  }
  return requirements;
}

function validateZeroResolution(
  resolution: CarsDomainFactRequirementResolution,
  errors: CarsDomainEvidenceLinkageValidationError[],
): void {
  if (resolution.status !== "RESOLVED" || resolution.requirements.length !== 0) return;
  const valid = resolution.reason === "CONTEXT_ONLY" || resolution.reason === "NOT_MATERIAL" ||
    (resolution.parentPolicyRequirementId === "candidate-options" && resolution.reason === "CANDIDATE_IDENTITY_COVERED");
  if (!valid) error(errors, "INVALID_ZERO_REQUIREMENT_RESOLUTION", resolution.parentPolicyRequirementId);
}

export function validateCarsDomainEvidenceLinkageInput(
  request: ValidateCarsDomainEvidenceLinkageInputInput,
): CarsDomainEvidenceLinkageValidationResult {
  const { input } = request;
  const errors: CarsDomainEvidenceLinkageValidationError[] = [];
  for (const id of duplicates(input.optionIds)) error(errors, "DUPLICATE_OPTION_ID", id);
  const options = new Set(input.optionIds);
  const requirements = requirementIntegrity(input, errors);

  for (const id of duplicates(input.assertions.map((item) => item.evidenceId))) {
    error(errors, "DUPLICATE_ASSERTION_ID", id);
  }
  const assertions = new Map(input.assertions.map((item) => [item.evidenceId, item] as const));
  for (const assertion of input.assertions) {
    if (!options.has(assertion.optionId)) error(errors, "UNKNOWN_ASSERTION_OPTION", assertion.evidenceId);
    if (assertion.availability === "AVAILABLE") {
      if (assertion.assertion === undefined) error(errors, "AVAILABLE_ASSERTION_MISSING", assertion.evidenceId);
      if (assertion.source === undefined) error(errors, "AVAILABLE_SOURCE_MISSING", assertion.evidenceId);
      if (assertion.provenance === undefined) error(errors, "AVAILABLE_PROVENANCE_MISSING", assertion.evidenceId);
    }
  }

  const linkedAssertions = new Set<string>();
  const linkKeys = new Set<string>();
  for (const link of input.requirementLinks) {
    const reference = `${link.evidenceId}:${link.requirementId}`;
    const assertion = assertions.get(link.evidenceId);
    const requirement = requirements.get(link.requirementId);
    if (!assertion) error(errors, "UNKNOWN_LINK_ASSERTION", reference);
    if (!requirement) error(errors, "UNKNOWN_LINK_REQUIREMENT", reference);
    if (linkKeys.has(reference)) error(errors, "DUPLICATE_REQUIREMENT_LINK", reference);
    linkKeys.add(reference);
    if (assertion && requirement) {
      linkedAssertions.add(assertion.evidenceId);
      if (!requirement.identity.optionIds.includes(assertion.optionId)) {
        error(errors, "LINK_OPTION_SCOPE_MISMATCH", reference);
      }
      if (requirement.identity.category !== assertion.category) {
        error(errors, "LINK_FACT_CATEGORY_MISMATCH", reference);
      }
    }
  }
  for (const assertion of input.assertions) {
    if (!linkedAssertions.has(assertion.evidenceId)) error(errors, "UNLINKED_ASSERTION", assertion.evidenceId);
  }

  for (const id of duplicates(input.conflicts.map((item) => item.conflictId))) {
    error(errors, "DUPLICATE_CONFLICT_ID", id);
  }
  for (const conflict of input.conflicts) {
    for (const evidenceId of duplicates(conflict.evidenceIds)) {
      error(errors, "DUPLICATE_CONFLICT_ASSERTION", `${conflict.conflictId}:${evidenceId}`);
    }
    const conflictAssertions = conflict.evidenceIds.flatMap((evidenceId) => {
      const assertion = assertions.get(evidenceId);
      if (!assertion) error(errors, "UNKNOWN_CONFLICT_ASSERTION", `${conflict.conflictId}:${evidenceId}`);
      else if (!assertion.conflictReferences.includes(conflict.conflictId)) {
        error(errors, "CONFLICT_LINEAGE_MISMATCH", `${conflict.conflictId}:${evidenceId}`);
      }
      return assertion ? [assertion] : [];
    });
    const anchor = conflictAssertions[0];
    for (const assertion of conflictAssertions.slice(1)) {
      if (assertion.optionId !== anchor.optionId) {
        error(errors, "CONFLICT_OPTION_MISMATCH", conflict.conflictId);
      }
      if (assertion.category !== anchor.category) {
        error(errors, "CONFLICT_FACT_CATEGORY_MISMATCH", conflict.conflictId);
      }
    }
  }
  const conflicts = new Map(input.conflicts.map((item) => [item.conflictId, item] as const));
  for (const assertion of input.assertions) {
    for (const conflictId of assertion.conflictReferences) {
      if (!conflicts.get(conflictId)?.evidenceIds.includes(assertion.evidenceId)) {
        error(errors, "CONFLICT_LINEAGE_MISMATCH", `${assertion.evidenceId}:${conflictId}`);
      }
    }
  }

  if (request.decisionType === "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON") {
    for (const index of duplicates(input.optionMatches.map((item) => String(item.inputIndex)))) {
      error(errors, "TYPE_B_DUPLICATE_INPUT_INDEX", index);
    }
    for (const match of input.optionMatches) {
      const reference = String(match.inputIndex);
      if (match.status === "AMBIGUOUS") {
        error(errors, "TYPE_B_OPTION_AMBIGUOUS", reference);
        if (match.optionId !== undefined || match.candidateOptionIds.length < 2) {
          error(errors, "TYPE_B_MATCH_INCONSISTENT", reference);
        }
      } else if (match.status === "NOT_FOUND") {
        error(errors, "TYPE_B_OPTION_NOT_MATCHED", reference);
        if (match.optionId !== undefined || match.candidateOptionIds.length !== 0) {
          error(errors, "TYPE_B_MATCH_INCONSISTENT", reference);
        }
      }
      if (match.candidateOptionIds.some((id) => !options.has(id))) {
        error(errors, "TYPE_B_UNKNOWN_CANDIDATE_OPTION", reference);
      }
      if (match.status === "MATCHED") {
        if (match.optionId === undefined || !options.has(match.optionId)) {
          error(errors, "TYPE_B_OPTION_NOT_MATCHED", reference);
        } else if (match.candidateOptionIds.length !== 1 || match.candidateOptionIds[0] !== match.optionId) {
          error(errors, "TYPE_B_MATCH_INCONSISTENT", reference);
        }
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: input };
}
