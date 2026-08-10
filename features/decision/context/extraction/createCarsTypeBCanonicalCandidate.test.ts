import { describe, expect, it } from "vitest";

import { populateDecisionContext } from "@/features/decision/context/population/populateDecisionContext";
import { validateCarsTypeBCandidateInput } from "@/features/decision/context/sufficiency/validateCarsTypeBCandidateInput";
import type { ContextCandidate } from "@/types/contextCandidate";

import { createCarsTypeBCanonicalCandidate } from "./createCarsTypeBCanonicalCandidate";

function createId() {
  return "candidate-type-b-options";
}

function decisionNeedCandidate(): ContextCandidate<"decisionNeed"> {
  return {
    id: "candidate-decision-need",
    target: "decisionNeed",
    value: "İki otomobil adayını karşılaştırmak istiyorum.",
    provenance: "EXPLICIT_USER",
    source: {
      kind: "USER_INPUT",
      referenceId: "confirmation-1",
    },
  };
}

describe("createCarsTypeBCanonicalCandidate", () => {
  it("produces ordered exact canonical references with explicit-user authority", () => {
    const result = createCarsTypeBCanonicalCandidate(
      {
        selections: [
          { optionId: "car-3", domainSourceReferenceId: "catalog/car-3" },
          { optionId: "CAR-1", domainSourceReferenceId: "catalog/CAR-1" },
          { optionId: " car-2 ", domainSourceReferenceId: "catalog/car-2" },
        ],
        userConfirmationReferenceId: "confirmation-1",
      },
      createId,
    );

    expect(result.candidate).toEqual({
      id: "candidate-type-b-options",
      target: "evaluationContext.decisionOptions",
      value: [
        { optionId: "car-3" },
        { optionId: "CAR-1" },
        { optionId: " car-2 " },
      ],
      provenance: "EXPLICIT_USER",
      source: {
        kind: "USER_INPUT",
        referenceId: "confirmation-1",
      },
    });
  });

  it("preserves user-confirmation and domain-identity origins in trace order", () => {
    const result = createCarsTypeBCanonicalCandidate(
      {
        selections: [
          { optionId: "car-2", domainSourceReferenceId: "catalog/car-2" },
          { optionId: "car-1", domainSourceReferenceId: "catalog/car-1" },
        ],
        userConfirmationReferenceId: "confirmation-7",
      },
      createId,
    );

    expect(result.selectionTrace).toEqual([
      {
        inputIndex: 0,
        optionId: "car-2",
        userConfirmationReferenceId: "confirmation-7",
        domainSourceReferenceId: "catalog/car-2",
      },
      {
        inputIndex: 1,
        optionId: "car-1",
        userConfirmationReferenceId: "confirmation-7",
        domainSourceReferenceId: "catalog/car-1",
      },
    ]);
  });

  it("does not truncate, sort, normalize, or silently deduplicate selections", () => {
    const result = createCarsTypeBCanonicalCandidate(
      {
        selections: [
          { optionId: "b", domainSourceReferenceId: "catalog/b" },
          { optionId: "a", domainSourceReferenceId: "catalog/a" },
          { optionId: "b", domainSourceReferenceId: "catalog/b" },
        ],
        userConfirmationReferenceId: "confirmation-1",
      },
      createId,
    );

    expect(result.candidate.value).toEqual([
      { optionId: "b" },
      { optionId: "a" },
      { optionId: "b" },
    ]);
    expect(validateCarsTypeBCandidateInput(result.candidate.value)).toEqual({
      ok: false,
      errors: [
        {
          code: "DUPLICATE_CANDIDATE_OPTION_ID",
          referenceId: "2",
        },
      ],
    });
  });

  it("leaves minimum-count enforcement to the existing pre-match validator", () => {
    const result = createCarsTypeBCanonicalCandidate(
      {
        selections: [
          { optionId: "car-1", domainSourceReferenceId: "catalog/car-1" },
        ],
        userConfirmationReferenceId: "confirmation-1",
      },
      createId,
    );

    expect(result.candidate.value).toEqual([{ optionId: "car-1" }]);
    expect(validateCarsTypeBCandidateInput(result.candidate.value)).toEqual({
      ok: false,
      errors: [{ code: "TOO_FEW_CANDIDATES" }],
    });
  });

  it("passes through generic population and into pre-match validation unchanged", () => {
    const production = createCarsTypeBCanonicalCandidate(
      {
        selections: [
          { optionId: "car-2", domainSourceReferenceId: "catalog/car-2" },
          { optionId: "car-1", domainSourceReferenceId: "catalog/car-1" },
        ],
        userConfirmationReferenceId: "confirmation-1",
      },
      createId,
    );

    const population = populateDecisionContext({
      current: null,
      candidates: [decisionNeedCandidate(), production.candidate],
    });

    expect(population.ok).toBe(true);

    if (!population.ok) {
      throw new Error("Expected successful population.");
    }

    expect(population.context.evaluationContext.decisionOptions).toEqual([
      { optionId: "car-2" },
      { optionId: "car-1" },
    ]);
    expect(
      validateCarsTypeBCandidateInput(
        population.context.evaluationContext.decisionOptions,
      ),
    ).toEqual({
      ok: true,
      value: [
        { inputIndex: 0, optionId: "car-2" },
        { inputIndex: 1, optionId: "car-1" },
      ],
    });
  });

  it("does not mutate caller-owned selections and returns fresh structures", () => {
    const selections = [
      { optionId: "car-1", domainSourceReferenceId: "catalog/car-1" },
      { optionId: "car-2", domainSourceReferenceId: "catalog/car-2" },
    ];
    const snapshot = structuredClone(selections);

    const result = createCarsTypeBCanonicalCandidate(
      {
        selections,
        userConfirmationReferenceId: "confirmation-1",
      },
      createId,
    );

    expect(selections).toEqual(snapshot);
    expect(result.candidate.value).not.toBe(selections);
    expect(result.selectionTrace).not.toBe(selections);
  });

  it("produces deterministic output for equivalent bounded inputs", () => {
    const input = {
      selections: [
        { optionId: "car-1", domainSourceReferenceId: "catalog/car-1" },
        { optionId: "car-2", domainSourceReferenceId: "catalog/car-2" },
      ],
      userConfirmationReferenceId: "confirmation-1",
    };

    expect(createCarsTypeBCanonicalCandidate(input, createId)).toEqual(
      createCarsTypeBCanonicalCandidate(input, createId),
    );
  });
});
