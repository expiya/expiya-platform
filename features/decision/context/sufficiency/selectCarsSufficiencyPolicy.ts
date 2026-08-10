import type {
  CarsDecisionTypeClassification,
  CarsSufficiencyPolicy,
} from "@/types/contextSufficiency";

import {
  carsSufficiencyPolicies,
} from "./carsSufficiencyPolicies";

export function selectCarsSufficiencyPolicy(
  classification: CarsDecisionTypeClassification,
): CarsSufficiencyPolicy | null {
  if (classification.status !== "CLASSIFIED") {
    return null;
  }

  return carsSufficiencyPolicies[
    classification.decisionType
  ];
}
