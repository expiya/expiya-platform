import { describe, expect, it } from "vitest";

import type { CarsDecisionTypeClassification } from "@/types/contextSufficiency";

import {
  candidateComparisonPolicy,
  optionDiscoveryRecommendationPolicy,
} from "./carsSufficiencyPolicies";
import { selectCarsSufficiencyPolicy } from "./selectCarsSufficiencyPolicy";

describe("selectCarsSufficiencyPolicy", () => {
  it("selects the option-discovery policy for the approved discovery type", () => {
    const classification: CarsDecisionTypeClassification = {
      status: "CLASSIFIED",
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    };

    expect(
      selectCarsSufficiencyPolicy(classification),
    ).toEqual(optionDiscoveryRecommendationPolicy);
  });

  it("selects the candidate-comparison policy for the approved comparison type", () => {
    const classification: CarsDecisionTypeClassification = {
      status: "CLASSIFIED",
      decisionType:
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
    };

    expect(
      selectCarsSufficiencyPolicy(classification),
    ).toEqual(candidateComparisonPolicy);
  });

  it.each([
    { status: "AMBIGUOUS" },
    { status: "UNSUPPORTED" },
    { status: "FAILED" },
  ] as const)(
    "does not select a policy for $status classification",
    (classification) => {
      expect(
        selectCarsSufficiencyPolicy(classification),
      ).toBeNull();
    },
  );
});
