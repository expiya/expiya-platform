import { describe, expect, it } from "vitest";

import {
  assessRejectionRelevance,
  type RejectionRelevanceDetermination,
} from "./assessRejectionRelevance";

describe("assessRejectionRelevance", () => {
  it("produces BLOCKING relevance without changing affected requirements", () => {
    expect(
      assessRejectionRelevance({
        candidateId: "candidate-1",
        outcome: "BLOCKING",
        affectedRequirementIds: [
          "material-constraints",
          "material-priorities",
        ],
        limitations: [],
      }),
    ).toEqual({
      candidateId: "candidate-1",
      outcome: "BLOCKING",
      affectedRequirementIds: [
        "material-constraints",
        "material-priorities",
      ],
      limitations: [],
    });
  });

  it("produces NON_BLOCKING relevance without fabricating affected requirements", () => {
    expect(
      assessRejectionRelevance({
        candidateId: "candidate-2",
        outcome: "NON_BLOCKING",
        affectedRequirementIds: [],
        limitations: [],
      }),
    ).toEqual({
      candidateId: "candidate-2",
      outcome: "NON_BLOCKING",
      affectedRequirementIds: [],
      limitations: [],
    });
  });

  it("preserves UNRESOLVED relevance and limitations", () => {
    expect(
      assessRejectionRelevance({
        candidateId: "candidate-3",
        outcome: "UNRESOLVED",
        affectedRequirementIds: [
          "material-usage-conditions",
        ],
        limitations: [
          "Rejection relevance could not be established.",
        ],
      }),
    ).toEqual({
      candidateId: "candidate-3",
      outcome: "UNRESOLVED",
      affectedRequirementIds: [
        "material-usage-conditions",
      ],
      limitations: [
        "Rejection relevance could not be established.",
      ],
    });
  });

  it("preserves multiple affected requirement identities in input order", () => {
    const result = assessRejectionRelevance({
      candidateId: "candidate-4",
      outcome: "BLOCKING",
      affectedRequirementIds: [
        "requirement-c",
        "requirement-a",
        "requirement-b",
      ],
      limitations: [],
    });

    expect(result.affectedRequirementIds).toEqual([
      "requirement-c",
      "requirement-a",
      "requirement-b",
    ]);
  });

  it("preserves multiple limitations in input order", () => {
    const result = assessRejectionRelevance({
      candidateId: "candidate-5",
      outcome: "UNRESOLVED",
      affectedRequirementIds: [],
      limitations: [
        "First limitation.",
        "Second limitation.",
      ],
    });

    expect(result.limitations).toEqual([
      "First limitation.",
      "Second limitation.",
    ]);
  });

  it("does not infer blocking relevance from affected requirements", () => {
    const result = assessRejectionRelevance({
      candidateId: "candidate-6",
      outcome: "UNRESOLVED",
      affectedRequirementIds: [
        "material-constraints",
      ],
      limitations: [],
    });

    expect(result.outcome).toBe("UNRESOLVED");
  });

  it("does not infer non-blocking relevance from an empty requirement set", () => {
    const result = assessRejectionRelevance({
      candidateId: "candidate-7",
      outcome: "UNRESOLVED",
      affectedRequirementIds: [],
      limitations: [],
    });

    expect(result.outcome).toBe("UNRESOLVED");
  });

  it("does not mutate the bounded determination input", () => {
    const input: RejectionRelevanceDetermination = {
      candidateId: "candidate-8",
      outcome: "BLOCKING",
      affectedRequirementIds: [
        "material-preferences",
      ],
      limitations: [
        "Explicit limitation.",
      ],
    };

    const before = structuredClone(input);

    assessRejectionRelevance(input);

    expect(input).toEqual(before);
  });

  it("does not return mutable array references owned by the caller", () => {
    const input: RejectionRelevanceDetermination = {
      candidateId: "candidate-9",
      outcome: "NON_BLOCKING",
      affectedRequirementIds: [
        "material-priorities",
      ],
      limitations: [
        "Original limitation.",
      ],
    };

    const result = assessRejectionRelevance(input);

    input.affectedRequirementIds.push(
      "material-constraints",
    );
    input.limitations.push("Later mutation.");

    expect(result.affectedRequirementIds).toEqual([
      "material-priorities",
    ]);

    expect(result.limitations).toEqual([
      "Original limitation.",
    ]);
  });

  it("produces deterministic output for equivalent bounded inputs", () => {
    const input: RejectionRelevanceDetermination = {
      candidateId: "candidate-10",
      outcome: "UNRESOLVED",
      affectedRequirementIds: [
        "material-decision-criteria",
      ],
      limitations: [
        "Insufficient bounded relevance evidence.",
      ],
    };

    expect(
      assessRejectionRelevance(input),
    ).toEqual(
      assessRejectionRelevance(
        structuredClone(input),
      ),
    );
  });
});
