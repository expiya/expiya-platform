import { describe, expect, it } from "vitest";

import { matchCarsTypeBCandidates } from "@/features/decision/context/sufficiency/matchCarsTypeBCandidates";
import { validateCarsCatalogIdentity } from "@/features/decision/context/sufficiency/validateCarsCatalogIdentity";
import { validateCarsTypeBCandidateInput } from "@/features/decision/context/sufficiency/validateCarsTypeBCandidateInput";
import type { Car } from "@/types/car";

function car(id: string): Car {
  return {
    id,
    brand: "Brand",
    model: `Model-${id}`,
    year: 2024,
    price: 1,
    km: 0,
    fuel: "Gasoline",
    transmission: "Automatic",
    bodyType: "Sedan",
    image: `/cars/${id}.jpg`,
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  };
}

function candidates(optionIds: readonly string[]) {
  const result = validateCarsTypeBCandidateInput(
    optionIds.map((optionId) => ({ optionId })),
  );

  if (!result.ok) {
    throw new Error("Expected candidate validation success.");
  }

  return result.value;
}

function catalog(optionIds: readonly string[]) {
  const result = validateCarsCatalogIdentity(
    optionIds.map((optionId) => car(optionId)),
  );

  if (!result.ok) {
    throw new Error("Expected catalog validation success.");
  }

  return result.value;
}

describe("matchCarsTypeBCandidates", () => {
  it("produces exact MATCHED results for canonical Car.id equality", () => {
    expect(
      matchCarsTypeBCandidates(
        candidates(["1", "2"]),
        catalog(["1", "2", "3"]),
      ),
    ).toEqual([
      {
        inputIndex: 0,
        status: "MATCHED",
        optionId: "1",
        candidateOptionIds: ["1"],
      },
      {
        inputIndex: 1,
        status: "MATCHED",
        optionId: "2",
        candidateOptionIds: ["2"],
      },
    ]);
  });

  it("produces NOT_FOUND only for a supported canonical ID with zero exact matches", () => {
    expect(
      matchCarsTypeBCandidates(
        candidates(["1", "99"]),
        catalog(["1", "2", "3"]),
      ),
    ).toEqual([
      {
        inputIndex: 0,
        status: "MATCHED",
        optionId: "1",
        candidateOptionIds: ["1"],
      },
      {
        inputIndex: 1,
        status: "NOT_FOUND",
        candidateOptionIds: [],
      },
    ]);
  });

  it("preserves candidate order rather than catalog order", () => {
    const result = matchCarsTypeBCandidates(
      candidates(["3", "1", "2"]),
      catalog(["1", "2", "3"]),
    );

    expect(result.map((match) => match.optionId)).toEqual([
      "3",
      "1",
      "2",
    ]);
    expect(result.map((match) => match.inputIndex)).toEqual([
      0,
      1,
      2,
    ]);
  });

  it("produces exactly one result per validated candidate", () => {
    const input = candidates(["1", "2", "99"]);
    const result = matchCarsTypeBCandidates(
      input,
      catalog(["1", "2"]),
    );

    expect(result).toHaveLength(input.length);
    expect(result.map((match) => match.inputIndex)).toEqual([
      0,
      1,
      2,
    ]);
  });

  it("does not produce AMBIGUOUS from exact-ID matching", () => {
    const result = matchCarsTypeBCandidates(
      candidates(["1", "99"]),
      catalog(["1", "2"]),
    );

    expect(result.map((match) => match.status)).not.toContain(
      "AMBIGUOUS",
    );
  });

  it("does not normalize canonical identities", () => {
    expect(
      matchCarsTypeBCandidates(
        candidates(["CAR-1", "2"]),
        catalog(["car-1", "2"]),
      ),
    ).toEqual([
      {
        inputIndex: 0,
        status: "NOT_FOUND",
        candidateOptionIds: [],
      },
      {
        inputIndex: 1,
        status: "MATCHED",
        optionId: "2",
        candidateOptionIds: ["2"],
      },
    ]);
  });

  it("does not mutate validated candidates or catalog", () => {
    const inputCandidates = candidates(["1", "2"]);
    const inputCatalog = catalog(["1", "2", "3"]);
    const candidateSnapshot = structuredClone(inputCandidates);
    const catalogSnapshot = structuredClone(inputCatalog);

    matchCarsTypeBCandidates(inputCandidates, inputCatalog);

    expect(inputCandidates).toEqual(candidateSnapshot);
    expect(inputCatalog).toEqual(catalogSnapshot);
  });

  it("returns new match objects and candidateOptionIds arrays", () => {
    const result = matchCarsTypeBCandidates(
      candidates(["1", "2"]),
      catalog(["1", "2"]),
    );

    expect(result[0]).not.toBe(result[1]);
    expect(result[0].candidateOptionIds).not.toBe(
      result[1].candidateOptionIds,
    );
  });

  it("produces deterministic output for equivalent bounded inputs", () => {
    const first = matchCarsTypeBCandidates(
      candidates(["1", "99"]),
      catalog(["1", "2"]),
    );
    const second = matchCarsTypeBCandidates(
      candidates(["1", "99"]),
      catalog(["1", "2"]),
    );

    expect(first).toEqual(second);
  });
});
