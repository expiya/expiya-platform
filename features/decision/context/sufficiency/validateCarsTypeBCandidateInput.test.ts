import { describe, expect, it } from "vitest";

import { validateCarsTypeBCandidateInput } from "@/features/decision/context/sufficiency/validateCarsTypeBCandidateInput";

describe("validateCarsTypeBCandidateInput", () => {
  it("accepts an ordered collection of distinct explicit canonical option references", () => {
    const result = validateCarsTypeBCandidateInput([
      { optionId: "1" },
      { optionId: "2" },
    ]);

    expect(result).toEqual({
      ok: true,
      value: [
        {
          inputIndex: 0,
          optionId: "1",
        },
        {
          inputIndex: 1,
          optionId: "2",
        },
      ],
    });
  });

  it("derives inputIndex from source-array order", () => {
    const result = validateCarsTypeBCandidateInput([
      { optionId: "3" },
      { optionId: "1" },
      { optionId: "2" },
    ]);

    expect(result).toEqual({
      ok: true,
      value: [
        { inputIndex: 0, optionId: "3" },
        { inputIndex: 1, optionId: "1" },
        { inputIndex: 2, optionId: "2" },
      ],
    });
  });

  it("rejects DecisionOptions that are not an array", () => {
    const result = validateCarsTypeBCandidateInput({
      optionId: "1",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "DECISION_OPTIONS_NOT_ARRAY",
        },
      ],
    });
  });

  it("rejects fewer than two candidate references", () => {
    const result = validateCarsTypeBCandidateInput([
      { optionId: "1" },
    ]);

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "TOO_FEW_CANDIDATES",
        },
      ],
    });
  });

  it("rejects raw candidate strings rather than interpreting them as Car.id", () => {
    const result = validateCarsTypeBCandidateInput([
      "Toyota Corolla",
      "Honda Civic",
    ]);

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "CANDIDATE_NOT_OBJECT",
          referenceId: "0",
        },
        {
          code: "CANDIDATE_NOT_OBJECT",
          referenceId: "1",
        },
      ],
    });
  });

  it("rejects a candidate without optionId", () => {
    const result = validateCarsTypeBCandidateInput([
      { optionId: "1" },
      { model: "Civic" },
    ]);

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "CANDIDATE_OPTION_ID_MISSING",
          referenceId: "1",
        },
      ],
    });
  });

  it("rejects a non-string optionId", () => {
    const result = validateCarsTypeBCandidateInput([
      { optionId: "1" },
      { optionId: 2 },
    ]);

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "CANDIDATE_OPTION_ID_INVALID",
          referenceId: "1",
        },
      ],
    });
  });

  it("rejects an empty optionId without normalizing it", () => {
    const result = validateCarsTypeBCandidateInput([
      { optionId: "1" },
      { optionId: "" },
    ]);

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "CANDIDATE_OPTION_ID_INVALID",
          referenceId: "1",
        },
      ],
    });
  });

  it("does not trim or otherwise normalize canonical option IDs", () => {
    const result = validateCarsTypeBCandidateInput([
      { optionId: "1" },
      { optionId: " 1 " },
    ]);

    expect(result).toEqual({
      ok: true,
      value: [
        {
          inputIndex: 0,
          optionId: "1",
        },
        {
          inputIndex: 1,
          optionId: " 1 ",
        },
      ],
    });
  });

  it("rejects duplicate canonical option identities", () => {
    const result = validateCarsTypeBCandidateInput([
      { optionId: "1" },
      { optionId: "1" },
    ]);

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "DUPLICATE_CANDIDATE_OPTION_ID",
          referenceId: "1",
        },
      ],
    });
  });

  it("rejects duplicate identity even when other distinct candidates exist", () => {
    const result = validateCarsTypeBCandidateInput([
      { optionId: "1" },
      { optionId: "2" },
      { optionId: "1" },
    ]);

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "DUPLICATE_CANDIDATE_OPTION_ID",
          referenceId: "2",
        },
      ],
    });
  });

  it("does not mutate the DecisionOptions input", () => {
    const input = [
      { optionId: "1", label: "Corolla" },
      { optionId: "2", label: "Civic" },
    ];

    const snapshot = structuredClone(input);

    validateCarsTypeBCandidateInput(input);

    expect(input).toEqual(snapshot);
  });

  it("returns new candidate objects rather than caller-owned object references", () => {
    const first = { optionId: "1" };
    const second = { optionId: "2" };
    const input = [first, second];

    const result = validateCarsTypeBCandidateInput(input);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected validation success.");
    }

    expect(result.value[0]).not.toBe(first);
    expect(result.value[1]).not.toBe(second);
  });

  it("produces deterministic output for equivalent bounded inputs", () => {
    const first = validateCarsTypeBCandidateInput([
      { optionId: "1" },
      { optionId: "2" },
    ]);

    const second = validateCarsTypeBCandidateInput([
      { optionId: "1" },
      { optionId: "2" },
    ]);

    expect(first).toEqual(second);
  });
});
