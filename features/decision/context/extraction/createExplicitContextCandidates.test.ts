import { describe, expect, it } from "vitest";

import { createExplicitContextCandidates } from "./createExplicitContextCandidates";

function createSequentialIdFactory() {
  let next = 1;

  return () => `candidate-${next++}`;
}

describe("createExplicitContextCandidates", () => {
  it("creates an explicit user candidate with deterministic provenance and source", () => {
    const candidates = createExplicitContextCandidates(
      {
        facts: [
          {
            target: "userContext.constraints",
            value: "Bütçem 1.5 milyon TL.",
          },
        ],
        sourceReferenceId: "input-1",
      },
      createSequentialIdFactory(),
    );

    expect(candidates).toEqual([
      {
        id: "candidate-1",
        target: "userContext.constraints",
        value: "Bütçem 1.5 milyon TL.",
        provenance: "EXPLICIT_USER",
        source: {
          kind: "USER_INPUT",
          referenceId: "input-1",
        },
      },
    ]);
  });

  it("creates multiple candidates from one explicit user input", () => {
    const candidates = createExplicitContextCandidates(
      {
        facts: [
          {
            target: "userContext.constraints",
            value: "Bütçem 1.5 milyon TL.",
          },
          {
            target: "userContext.preferences",
            value: "Otomatik vites istiyorum.",
          },
          {
            target: "userContext.usageConditions",
            value: "Hafta içi şehir içinde kullanacağım.",
          },
        ],
        sourceReferenceId: "input-2",
      },
      createSequentialIdFactory(),
    );

    expect(candidates).toHaveLength(3);

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "candidate-1",
      "candidate-2",
      "candidate-3",
    ]);

    for (const candidate of candidates) {
      expect(candidate.provenance).toBe("EXPLICIT_USER");
      expect(candidate.source).toEqual({
        kind: "USER_INPUT",
        referenceId: "input-2",
      });
    }
  });

  it("returns an empty candidate list for an empty fact list", () => {
    const candidates = createExplicitContextCandidates(
      {
        facts: [],
        sourceReferenceId: "input-3",
      },
      createSequentialIdFactory(),
    );

    expect(candidates).toEqual([]);
  });
});
