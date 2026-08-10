import type {
  CarsDecisionType,
  CarsSufficiencyPolicy,
  SufficiencyRequirement,
} from "@/types/contextSufficiency";

const USER_CONTEXT_PROVENANCE = [
  "EXPLICIT_USER",
  "DERIVED",
] as const;

function requirement(
  input: SufficiencyRequirement,
): SufficiencyRequirement {
  return input;
}

export const OPTION_DISCOVERY_POLICY_ID =
  "cars.option-discovery-recommendation";

export const CANDIDATE_COMPARISON_POLICY_ID =
  "cars.candidate-comparison";

export const CARS_SUFFICIENCY_POLICY_VERSION = "1";

export const optionDiscoveryRecommendationPolicy: CarsSufficiencyPolicy = {
  policyId: OPTION_DISCOVERY_POLICY_ID,
  version: CARS_SUFFICIENCY_POLICY_VERSION,
  decisionType:
    "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",

  decisionOptionsRule: "USER_PROVIDED_NOT_REQUIRED",

  requirements: [
    requirement({
      requirementId: "decision-need",
      target: "decisionNeed",
      mode: "REQUIRED",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "fundamental-user-need",
      target: "userContext.needs",
      mode: "REQUIRED",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "material-priorities",
      target: "userContext.priorities",
      mode: "CONDITIONAL",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "material-constraints",
      target: "userContext.constraints",
      mode: "CONDITIONAL",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "material-usage-conditions",
      target: "userContext.usageConditions",
      mode: "CONDITIONAL",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "material-decision-criteria",
      target: "evaluationContext.decisionCriteria",
      mode: "CONDITIONAL",
      acceptedProvenance: [
        "EXPLICIT_USER",
        "DERIVED",
        "DOMAIN_SUPPLIED",
      ],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "material-preferences",
      target: "userContext.preferences",
      mode: "CONDITIONAL",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),
  ],
};

export const candidateComparisonPolicy: CarsSufficiencyPolicy = {
  policyId: CANDIDATE_COMPARISON_POLICY_ID,
  version: CARS_SUFFICIENCY_POLICY_VERSION,
  decisionType:
    "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",

  decisionOptionsRule: "REQUIRED",

  requirements: [
    requirement({
      requirementId: "decision-need",
      target: "decisionNeed",
      mode: "REQUIRED",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "fundamental-user-need",
      target: "userContext.needs",
      mode: "REQUIRED",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "material-priorities",
      target: "userContext.priorities",
      mode: "CONDITIONAL",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "material-constraints",
      target: "userContext.constraints",
      mode: "CONDITIONAL",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "material-usage-conditions",
      target: "userContext.usageConditions",
      mode: "CONDITIONAL",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "meaningful-comparison-criteria",
      target: "evaluationContext.decisionCriteria",
      mode: "REQUIRED",
      acceptedProvenance: [
        "EXPLICIT_USER",
        "DERIVED",
        "DOMAIN_SUPPLIED",
      ],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "material-preferences",
      target: "userContext.preferences",
      mode: "CONDITIONAL",
      acceptedProvenance: [...USER_CONTEXT_PROVENANCE],
      confirmationRequiredForInference: true,
    }),

    requirement({
      requirementId: "candidate-options",
      target: "evaluationContext.decisionOptions",
      mode: "REQUIRED",
      acceptedProvenance: [
        "EXPLICIT_USER",
        "DOMAIN_SUPPLIED",
      ],
      confirmationRequiredForInference: false,
    }),
  ],
};

export const carsSufficiencyPolicies: Record<
  CarsDecisionType,
  CarsSufficiencyPolicy
> = {
  AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION:
    optionDiscoveryRecommendationPolicy,

  AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON:
    candidateComparisonPolicy,
};
