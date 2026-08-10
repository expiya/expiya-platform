import type {
  ContextSufficiencyInput,
  ContextSufficiencyResult,
} from "@/types/contextSufficiency";
import type {
  PopulationRejection,
} from "@/types/contextPopulation";

import { evaluateCarsSufficiencyPolicy } from "./evaluateCarsSufficiencyPolicy";

function emptyBlockedResult(
  input: ContextSufficiencyInput,
  limitations: string[],
): ContextSufficiencyResult {
  const decisionType =
    input.classification.status === "CLASSIFIED"
      ? input.classification.decisionType
      : null;

  return {
    decisionType,
    policyId: input.policy?.policyId ?? null,
    decisionEngineAuthorized: false,
    reliableRecommendationAuthorized: false,
    additionalContextRequired: false,
    limitedSupportPermitted:
      input.limitedSupportAssessment.outcome === "PERMITTED",
    satisfiedRequirements: [],
    unsatisfiedRequirements: [],
    limitations: [
      ...limitations,
      ...input.limitedSupportAssessment.limitations,
    ],
    relevantRejections: [],
  };
}

export function evaluateContextSufficiency(
  input: ContextSufficiencyInput,
): ContextSufficiencyResult {
  if (!input.populationResult.ok) {
    return emptyBlockedResult(input, [
      "Population failed; no DecisionContext is available for sufficiency evaluation.",
    ]);
  }

  if (input.classification.status !== "CLASSIFIED") {
    return emptyBlockedResult(input, [
      "Decision type classification did not produce an approved Cars decision type.",
    ]);
  }

  if (
    input.policy.decisionType !==
    input.classification.decisionType
  ) {
    return emptyBlockedResult(input, [
      "Selected sufficiency policy does not match the classified decision type.",
    ]);
  }

  if (
    input.domainAssessment.policyId !==
      input.policy.policyId ||
    input.domainAssessment.decisionType !==
      input.classification.decisionType
  ) {
    return emptyBlockedResult(input, [
      "Domain sufficiency assessment does not match the selected policy.",
    ]);
  }

  const policyEvaluation =
    evaluateCarsSufficiencyPolicy({
      policy: input.policy,
      appliedCandidates:
        input.populationResult.appliedCandidates,
      confirmations: input.confirmations,
      materialityAssessments:
        input.materialityAssessments,
    });

  const blockingRejectionAssessments =
    input.rejectionAssessments.filter(
      (assessment) =>
        assessment.outcome === "BLOCKING" ||
        assessment.outcome === "UNRESOLVED",
    );

  const blockingRejectionIds = new Set(
    blockingRejectionAssessments.map(
      (assessment) => assessment.candidateId,
    ),
  );

  const relevantRejections: PopulationRejection[] =
    input.populationResult.rejectedCandidates.filter(
      (rejection) =>
        blockingRejectionIds.has(
          rejection.candidate.id,
        ),
    );

  const rejectionLimitations =
    blockingRejectionAssessments.flatMap(
      (assessment) => assessment.limitations,
    );

  const domainLimitations = [
    ...input.domainAssessment.evidenceLimitations,
    ...input.domainAssessment.relevantConflicts,
  ];

  const hasUnsatisfiedRequirements =
    policyEvaluation.unsatisfiedRequirements.length > 0;

  const hasUnresolvedRequirements =
    policyEvaluation.unresolvedRequirementIds.length > 0;

  const hasBlockingRejections =
    blockingRejectionAssessments.length > 0;

  const domainIsSufficient =
    input.domainAssessment.outcome === "SUFFICIENT";

  const reliableRecommendationAuthorized =
    !hasUnsatisfiedRequirements &&
    !hasUnresolvedRequirements &&
    !hasBlockingRejections &&
    domainIsSufficient;

  const additionalContextRequired =
    hasUnsatisfiedRequirements ||
    hasUnresolvedRequirements ||
    input.domainAssessment.outcome !== "SUFFICIENT";

  const limitedSupportPermitted =
    input.limitedSupportAssessment.outcome === "PERMITTED";

  return {
    decisionType: input.classification.decisionType,
    policyId: input.policy.policyId,

    decisionEngineAuthorized:
      reliableRecommendationAuthorized,
    reliableRecommendationAuthorized,

    additionalContextRequired,
    limitedSupportPermitted,

    satisfiedRequirements:
      policyEvaluation.satisfiedRequirements,
    unsatisfiedRequirements:
      policyEvaluation.unsatisfiedRequirements,

    limitations: [
      ...policyEvaluation.evaluations.flatMap(
        (evaluation) => evaluation.limitations,
      ),
      ...domainLimitations,
      ...rejectionLimitations,
      ...input.limitedSupportAssessment.limitations,
    ],

    relevantRejections,
  };
}
