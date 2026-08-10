import { describe, expect, it } from "vitest";

import {
  assessMateriality,
  type MaterialityDetermination,
} from "./assessMateriality";

describe("assessMateriality", () => {
  it("produces MATERIAL assessment without changing supporting evidence", () => {
    expect(
      assessMateriality({
        requirementId: "material-priorities",
        outcome: "MATERIAL",
        supportingCandidateIds: [
          "candidate-1",
          "candidate-2",
        ],
        limitations: [],
      }),
    ).toEqual({
      requirementId: "material-priorities",
      outcome: "MATERIAL",
      supportingCandidateIds: [
        "candidate-1",
        "candidate-2",
      ],
      limitations: [],
    });
  });

  it("produces NOT_MATERIAL assessment without fabricating supporting candidates", () => {
    expect(
      assessMateriality({
        requirementId: "material-preferences",
        outcome: "NOT_MATERIAL",
        supportingCandidateIds: [],
        limitations: [],
      }),
    ).toEqual({
      requirementId: "material-preferences",
      outcome: "NOT_MATERIAL",
      supportingCandidateIds: [],
      limitations: [],
    });
  });

  it("preserves UNRESOLVED materiality and its limitations", () => {
    expect(
      assessMateriality({
        requirementId: "material-constraints",
        outcome: "UNRESOLVED",
        supportingCandidateIds: ["candidate-3"],
        limitations: [
          "Materiality could not be established from the bounded evidence.",
        ],
      }),
    ).toEqual({
      requirementId: "material-constraints",
      outcome: "UNRESOLVED",
      supportingCandidateIds: ["candidate-3"],
      limitations: [
        "Materiality could not be established from the bounded evidence.",
      ],
    });
  });

  it("preserves multiple limitations in input order", () => {
    expect(
      assessMateriality({
        requirementId: "material-usage-conditions",
        outcome: "UNRESOLVED",
        supportingCandidateIds: [],
        limitations: [
          "First limitation.",
          "Second limitation.",
        ],
      }).limitations,
    ).toEqual([
      "First limitation.",
      "Second limitation.",
    ]);
  });

  it("preserves supporting candidate identities in input order", () => {
    const result = assessMateriality({
      requirementId: "material-decision-criteria",
      outcome: "MATERIAL",
      supportingCandidateIds: [
        "candidate-3",
        "candidate-1",
        "candidate-2",
      ],
      limitations: [],
    });

    expect(result.supportingCandidateIds).toEqual([
      "candidate-3",
      "candidate-1",
      "candidate-2",
    ]);
  });

  it("does not infer materiality from the presence of supporting candidates", () => {
    const result = assessMateriality({
      requirementId: "material-priorities",
      outcome: "UNRESOLVED",
      supportingCandidateIds: ["candidate-1"],
      limitations: [],
    });

    expect(result.outcome).toBe("UNRESOLVED");
  });

  it("does not mutate the bounded determination input", () => {
    const input: MaterialityDetermination = {
      requirementId: "material-preferences",
      outcome: "MATERIAL",
      supportingCandidateIds: ["candidate-1"],
      limitations: ["Explicit limitation."],
    };

    const before = structuredClone(input);

    assessMateriality(input);

    expect(input).toEqual(before);
  });

  it("does not return mutable array references owned by the caller", () => {
    const input: MaterialityDetermination = {
      requirementId: "material-priorities",
      outcome: "MATERIAL",
      supportingCandidateIds: ["candidate-1"],
      limitations: ["Original limitation."],
    };

    const result = assessMateriality(input);

    input.supportingCandidateIds.push("candidate-2");
    input.limitations.push("Later mutation.");

    expect(result.supportingCandidateIds).toEqual([
      "candidate-1",
    ]);

    expect(result.limitations).toEqual([
      "Original limitation.",
    ]);
  });

  it("produces deterministic output for equivalent bounded inputs", () => {
    const input: MaterialityDetermination = {
      requirementId: "material-constraints",
      outcome: "UNRESOLVED",
      supportingCandidateIds: ["candidate-1"],
      limitations: ["Insufficient bounded evidence."],
    };

    expect(assessMateriality(input)).toEqual(
      assessMateriality(structuredClone(input)),
    );
  });
});
