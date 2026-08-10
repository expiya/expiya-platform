import { describe, expect, it } from "vitest";

import {
  classifyCarsDecisionType,
  type CarsDecisionTypeClassificationInput,
} from "./classifyCarsDecisionType";

describe("classifyCarsDecisionType", () => {
  it("classifies the approved option-discovery decision type", () => {
    expect(
      classifyCarsDecisionType({
        status: "READY",
        candidateDecisionTypes: [
          "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
        ],
      }),
    ).toEqual({
      status: "CLASSIFIED",
      decisionType:
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    });
  });

  it("classifies the approved candidate-comparison decision type", () => {
    expect(
      classifyCarsDecisionType({
        status: "READY",
        candidateDecisionTypes: [
          "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
        ],
      }),
    ).toEqual({
      status: "CLASSIFIED",
      decisionType:
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
    });
  });

  it("returns UNSUPPORTED when no approved Cars decision type is supported", () => {
    expect(
      classifyCarsDecisionType({
        status: "READY",
        candidateDecisionTypes: [],
      }),
    ).toEqual({
      status: "UNSUPPORTED",
    });
  });

  it("returns AMBIGUOUS when both approved Cars decision types remain possible", () => {
    expect(
      classifyCarsDecisionType({
        status: "READY",
        candidateDecisionTypes: [
          "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
          "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
        ],
      }),
    ).toEqual({
      status: "AMBIGUOUS",
    });
  });

  it("does not treat duplicate evidence for one type as ambiguity", () => {
    expect(
      classifyCarsDecisionType({
        status: "READY",
        candidateDecisionTypes: [
          "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
          "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
        ],
      }),
    ).toEqual({
      status: "CLASSIFIED",
      decisionType:
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
    });
  });

  it("preserves an explicit producer failure as FAILED", () => {
    expect(
      classifyCarsDecisionType({
        status: "FAILED",
      }),
    ).toEqual({
      status: "FAILED",
    });
  });

  it("does not mutate the candidate decision type input", () => {
    const input: CarsDecisionTypeClassificationInput = {
      status: "READY",
      candidateDecisionTypes: [
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
      ],
    };

    const before = structuredClone(input);

    classifyCarsDecisionType(input);

    expect(input).toEqual(before);
  });

  it("produces deterministic output for equivalent bounded inputs", () => {
    const input: CarsDecisionTypeClassificationInput = {
      status: "READY",
      candidateDecisionTypes: [
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      ],
    };

    expect(classifyCarsDecisionType(input)).toEqual(
      classifyCarsDecisionType(structuredClone(input)),
    );
  });
});
