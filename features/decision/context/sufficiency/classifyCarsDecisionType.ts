import type {
  CarsDecisionType,
  CarsDecisionTypeClassification,
} from "@/types/contextSufficiency";

export type CarsDecisionTypeClassificationInput =
  | {
      status: "READY";
      candidateDecisionTypes: CarsDecisionType[];
    }
  | {
      status: "FAILED";
    };

export function classifyCarsDecisionType(
  input: CarsDecisionTypeClassificationInput,
): CarsDecisionTypeClassification {
  if (input.status === "FAILED") {
    return {
      status: "FAILED",
    };
  }

  const uniqueCandidateDecisionTypes = [
    ...new Set(input.candidateDecisionTypes),
  ];

  if (uniqueCandidateDecisionTypes.length === 0) {
    return {
      status: "UNSUPPORTED",
    };
  }

  if (uniqueCandidateDecisionTypes.length > 1) {
    return {
      status: "AMBIGUOUS",
    };
  }

  return {
    status: "CLASSIFIED",
    decisionType: uniqueCandidateDecisionTypes[0],
  };
}
