import type { ContextCandidate } from "@/types/contextCandidate";
import type {
  CarsSufficiencyPolicy,
  ContextConfirmationEvidence,
  MaterialityAssessment,
  PolicyRequirementEvaluationResult,
  SatisfiedRequirement,
  UnsatisfiedRequirement,
} from "@/types/contextSufficiency";

import { findMaterialityAssessment } from "./contextSufficiencyEvidence";
import { evaluateSufficiencyRequirement } from "./evaluateSufficiencyRequirement";

export interface EvaluateCarsSufficiencyPolicyInput {
  policy: CarsSufficiencyPolicy;
  appliedCandidates: ContextCandidate[];
  confirmations: ContextConfirmationEvidence[];
  materialityAssessments: MaterialityAssessment[];
}

export function evaluateCarsSufficiencyPolicy(
  input: EvaluateCarsSufficiencyPolicyInput,
): PolicyRequirementEvaluationResult {
  const evaluations = input.policy.requirements.map(
    (requirement) =>
      evaluateSufficiencyRequirement({
        requirement,
        appliedCandidates: input.appliedCandidates,
        confirmations: input.confirmations,
        materialityAssessment:
          requirement.mode === "CONDITIONAL"
            ? findMaterialityAssessment(
                input.materialityAssessments,
                requirement.requirementId,
              )
            : null,
      }),
  );

  const satisfiedRequirements: SatisfiedRequirement[] =
    evaluations
      .filter(
        (evaluation) =>
          evaluation.status === "SATISFIED",
      )
      .map((evaluation) => ({
        requirementId: evaluation.requirementId,
        candidateIds: evaluation.candidateIds,
      }));

  const unsatisfiedRequirements: UnsatisfiedRequirement[] =
    evaluations
      .filter(
        (evaluation) =>
          evaluation.status === "UNSATISFIED",
      )
      .map((evaluation) => ({
        requirementId: evaluation.requirementId,
        reason:
          evaluation.limitations[0] ??
          "Requirement is not satisfied.",
      }));

  const unresolvedRequirementIds = evaluations
    .filter(
      (evaluation) =>
        evaluation.status === "UNRESOLVED",
    )
    .map(
      (evaluation) => evaluation.requirementId,
    );

  return {
    evaluations,
    satisfiedRequirements,
    unsatisfiedRequirements,
    unresolvedRequirementIds,
  };
}
