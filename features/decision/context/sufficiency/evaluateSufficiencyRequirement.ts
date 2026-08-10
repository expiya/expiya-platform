import type { ContextCandidate } from "@/types/contextCandidate";
import type {
  ContextConfirmationEvidence,
  MaterialityAssessment,
  RequirementEvaluationResult,
  SufficiencyRequirement,
} from "@/types/contextSufficiency";

import { isInferenceConfirmed } from "./contextSufficiencyEvidence";

export interface EvaluateSufficiencyRequirementInput {
  requirement: SufficiencyRequirement;
  appliedCandidates: ContextCandidate[];
  confirmations: ContextConfirmationEvidence[];
  materialityAssessment: MaterialityAssessment | null;
}

export function evaluateSufficiencyRequirement(
  input: EvaluateSufficiencyRequirementInput,
): RequirementEvaluationResult {
  const {
    requirement,
    appliedCandidates,
    confirmations,
    materialityAssessment,
  } = input;

  if (requirement.mode === "OPTIONAL") {
    return {
      requirementId: requirement.requirementId,
      status: "NOT_REQUIRED",
      candidateIds: [],
      limitations: [],
    };
  }

  if (requirement.mode === "CONDITIONAL") {
    if (
      materialityAssessment === null ||
      materialityAssessment.requirementId !==
        requirement.requirementId
    ) {
      return {
        requirementId: requirement.requirementId,
        status: "UNRESOLVED",
        candidateIds: [],
        limitations: [],
      };
    }

    if (materialityAssessment.outcome === "NOT_MATERIAL") {
      return {
        requirementId: requirement.requirementId,
        status: "NOT_REQUIRED",
        candidateIds: [],
        limitations: materialityAssessment.limitations,
      };
    }

    if (materialityAssessment.outcome === "UNRESOLVED") {
      return {
        requirementId: requirement.requirementId,
        status: "UNRESOLVED",
        candidateIds: [],
        limitations: materialityAssessment.limitations,
      };
    }
  }

  const targetCandidates = appliedCandidates.filter(
    (candidate) => candidate.target === requirement.target,
  );

  const acceptedCandidateIds: string[] = [];
  let hasUnconfirmedInference = false;

  for (const candidate of targetCandidates) {
    if (candidate.provenance === "INFERRED") {
      if (
        requirement.confirmationRequiredForInference &&
        isInferenceConfirmed(confirmations, candidate.id)
      ) {
        acceptedCandidateIds.push(candidate.id);
      } else {
        hasUnconfirmedInference = true;
      }

      continue;
    }

    if (
      requirement.acceptedProvenance.includes(
        candidate.provenance,
      )
    ) {
      acceptedCandidateIds.push(candidate.id);
    }
  }

  if (acceptedCandidateIds.length > 0) {
    return {
      requirementId: requirement.requirementId,
      status: "SATISFIED",
      candidateIds: acceptedCandidateIds,
      limitations: [],
    };
  }

  return {
    requirementId: requirement.requirementId,
    status: "UNSATISFIED",
    candidateIds: [],
    limitations: hasUnconfirmedInference
      ? [
          "Material inferred context requires explicit user confirmation.",
        ]
      : [],
  };
}
