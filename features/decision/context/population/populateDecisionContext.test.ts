import { describe, expect, it } from "vitest";

import type { ContextCandidate } from "@/types/contextCandidate";
import { populateDecisionContext } from "./populateDecisionContext";

function candidate(
  overrides: Partial<ContextCandidate> & Pick<ContextCandidate, "id" | "target" | "value">,
): ContextCandidate {
  return {
    provenance: "EXPLICIT_USER",
    source: {
      kind: "USER_INPUT",
      referenceId: `source-${overrides.id}`,
    },
    ...overrides,
  } as ContextCandidate;
}

describe("populateDecisionContext", () => {
  it("creates an initial context from an explicit decisionNeed", () => {
    const decisionNeed = candidate({
      id: "candidate-1",
      target: "decisionNeed",
      value: "Aile için araba almak istiyorum.",
    });

    const result = populateDecisionContext({
      current: null,
      candidates: [decisionNeed],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected successful population.");
    }

    expect(result.context.decisionNeed).toBe(
      "Aile için araba almak istiyorum.",
    );
    expect(result.appliedCandidates).toEqual([decisionNeed]);
    expect(result.rejectedCandidates).toEqual([]);
  });

  it("populates multiple array-backed values in input order", () => {
    const decisionNeed = candidate({
      id: "candidate-1",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const need = candidate({
      id: "candidate-2",
      target: "userContext.needs",
      value: "Aile kullanımı",
    });

    const constraint = candidate({
      id: "candidate-3",
      target: "userContext.constraints",
      value: "Bütçem 1.5 milyon TL.",
    });

    const result = populateDecisionContext({
      current: null,
      candidates: [decisionNeed, need, constraint],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected successful population.");
    }

    expect(result.context.userContext.needs).toEqual([
      "Aile kullanımı",
    ]);
    expect(result.context.userContext.constraints).toEqual([
      "Bütçem 1.5 milyon TL.",
    ]);
  });

  it("preserves candidate provenance and source in the applied sidecar", () => {
    const decisionNeed = candidate({
      id: "candidate-1",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
      provenance: "EXPLICIT_USER",
      source: {
        kind: "USER_INPUT",
        referenceId: "input-1",
      },
    });

    const result = populateDecisionContext({
      current: null,
      candidates: [decisionNeed],
    });

    expect(result.appliedCandidates).toEqual([decisionNeed]);
  });

  it("does not apply the same candidate identity twice", () => {
    const decisionNeed = candidate({
      id: "candidate-1",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const initial = populateDecisionContext({
      current: null,
      candidates: [decisionNeed],
    });

    const repeated = populateDecisionContext({
      current: initial,
      candidates: [decisionNeed],
    });

    expect(repeated.appliedCandidates).toHaveLength(1);
    expect(repeated.rejectedCandidates.at(-1)).toEqual({
      candidate: decisionNeed,
      reason: "DUPLICATE_CANDIDATE",
    });
  });

  it("reports a distinct competing decisionNeed without overwriting the existing value", () => {
    const first = candidate({
      id: "candidate-1",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const second = candidate({
      id: "candidate-2",
      target: "decisionNeed",
      value: "Motosiklet almak istiyorum.",
    });

    const initial = populateDecisionContext({
      current: null,
      candidates: [first],
    });

    const result = populateDecisionContext({
      current: initial,
      candidates: [second],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected existing context to remain valid.");
    }

    expect(result.context.decisionNeed).toBe(
      "Araba almak istiyorum.",
    );
    expect(result.rejectedCandidates.at(-1)).toEqual({
      candidate: second,
      reason: "UNRESOLVED_CONFLICT",
    });
  });

  it("does not fabricate a DecisionContext when no decisionNeed exists", () => {
    const result = populateDecisionContext({
      current: null,
      candidates: [],
    });

    expect(result).toEqual({
      ok: false,
      appliedCandidates: [],
      rejectedCandidates: [],
    });
  });

  it("does not mutate candidates or an existing successful context", () => {
    const decisionNeed = candidate({
      id: "candidate-1",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const initial = populateDecisionContext({
      current: null,
      candidates: [decisionNeed],
    });

    if (!initial.ok) {
      throw new Error("Expected successful initial population.");
    }

    const snapshot = structuredClone(initial);

    const need = candidate({
      id: "candidate-2",
      target: "userContext.needs",
      value: "Geniş bagaj",
    });

    populateDecisionContext({
      current: initial,
      candidates: [need],
    });

    expect(initial).toEqual(snapshot);
  });

  it("does not reject an otherwise eligible candidate merely because decisionNeed appears later in the same initial batch", () => {
    const need = candidate({
      id: "candidate-1",
      target: "userContext.needs",
      value: "Aile kullanımı",
    });

    const decisionNeed = candidate({
      id: "candidate-2",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const result = populateDecisionContext({
      current: null,
      candidates: [need, decisionNeed],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected successful population.");
    }

    expect(result.context.userContext.needs).toEqual([
      "Aile kullanımı",
    ]);
    expect(result.rejectedCandidates).toEqual([]);
  });
});

describe("opaque population targets", () => {
  it("populates user-provided DecisionOptions without changing provenance", () => {
    const decisionNeed = candidate({
      id: "candidate-10",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const options = candidate({
      id: "candidate-11",
      target: "evaluationContext.decisionOptions",
      value: ["Toyota Corolla", "Honda Civic"],
      provenance: "EXPLICIT_USER",
    });

    const result = populateDecisionContext({
      current: null,
      candidates: [decisionNeed, options],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected successful population.");
    }

    expect(result.context.evaluationContext.decisionOptions).toEqual([
      "Toyota Corolla",
      "Honda Civic",
    ]);
    expect(result.appliedCandidates).toContainEqual(options);
  });

  it("populates domain-supplied DecisionOptions", () => {
    const decisionNeed = candidate({
      id: "candidate-12",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const options = candidate({
      id: "candidate-13",
      target: "evaluationContext.decisionOptions",
      value: ["Car A", "Car B"],
      provenance: "DOMAIN_SUPPLIED",
      source: {
        kind: "DOMAIN_SOURCE",
        referenceId: "cars-catalog-1",
      },
    });

    const result = populateDecisionContext({
      current: null,
      candidates: [decisionNeed, options],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected successful population.");
    }

    expect(result.context.evaluationContext.decisionOptions).toEqual([
      "Car A",
      "Car B",
    ]);
    expect(result.appliedCandidates).toContainEqual(options);
  });

  it("rejects inferred DecisionOptions as unsupported population", () => {
    const decisionNeed = candidate({
      id: "candidate-14",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const inferredOptions = candidate({
      id: "candidate-15",
      target: "evaluationContext.decisionOptions",
      value: ["Car A"],
      provenance: "INFERRED",
    });

    const result = populateDecisionContext({
      current: null,
      candidates: [decisionNeed, inferredOptions],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected context to remain valid.");
    }

    expect(result.context.evaluationContext.decisionOptions).toBeUndefined();
    expect(result.rejectedCandidates).toContainEqual({
      candidate: inferredOptions,
      reason: "UNSUPPORTED_POPULATION",
    });
  });

  it("passes through an explicit DomainContext contextual element", () => {
    const decisionNeed = candidate({
      id: "candidate-16",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const element = candidate({
      id: "candidate-17",
      target: "domainContext.contextualElements",
      value: {
        usage: "mountain",
      },
      provenance: "EXPLICIT_USER",
    });

    const result = populateDecisionContext({
      current: null,
      candidates: [decisionNeed, element],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected successful population.");
    }

    expect(result.context.domainContext.contextualElements).toEqual({
      usage: "mountain",
    });
    expect(result.appliedCandidates).toContainEqual(element);
  });

  it("passes through a domain-supplied contextual relationship", () => {
    const decisionNeed = candidate({
      id: "candidate-18",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const relationship = candidate({
      id: "candidate-19",
      target: "domainContext.contextualRelationships",
      value: {
        from: "vehicle",
        to: "usage-condition",
      },
      provenance: "DOMAIN_SUPPLIED",
      source: {
        kind: "DOMAIN_SOURCE",
        referenceId: "domain-source-1",
      },
    });

    const result = populateDecisionContext({
      current: null,
      candidates: [decisionNeed, relationship],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected successful population.");
    }

    expect(result.context.domainContext.contextualRelationships).toEqual({
      from: "vehicle",
      to: "usage-condition",
    });
    expect(result.appliedCandidates).toContainEqual(relationship);
  });

  it("does not automatically merge or replace a second distinct opaque value", () => {
    const decisionNeed = candidate({
      id: "candidate-20",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const first = candidate({
      id: "candidate-21",
      target: "domainContext.contextualElements",
      value: {
        usage: "city",
      },
    });

    const second = candidate({
      id: "candidate-22",
      target: "domainContext.contextualElements",
      value: {
        usage: "mountain",
      },
    });

    const initial = populateDecisionContext({
      current: null,
      candidates: [decisionNeed, first],
    });

    const result = populateDecisionContext({
      current: initial,
      candidates: [second],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected existing context to remain valid.");
    }

    expect(result.context.domainContext.contextualElements).toEqual({
      usage: "city",
    });

    expect(result.rejectedCandidates.at(-1)).toEqual({
      candidate: second,
      reason: "UNRESOLVED_CONFLICT",
    });
  });
});

describe("population edge contracts", () => {
  it("preserves equal array values from distinct candidate identities", () => {
    const decisionNeed = candidate({
      id: "candidate-30",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const first = candidate({
      id: "candidate-31",
      target: "userContext.needs",
      value: "Aile kullanımı",
    });

    const second = candidate({
      id: "candidate-32",
      target: "userContext.needs",
      value: "Aile kullanımı",
    });

    const result = populateDecisionContext({
      current: null,
      candidates: [decisionNeed, first, second],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected successful population.");
    }

    expect(result.context.userContext.needs).toEqual([
      "Aile kullanımı",
      "Aile kullanımı",
    ]);

    expect(result.appliedCandidates).toContainEqual(first);
    expect(result.appliedCandidates).toContainEqual(second);
  });

  it("does not silently choose between competing initial decisionNeed candidates", () => {
    const first = candidate({
      id: "candidate-33",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const second = candidate({
      id: "candidate-34",
      target: "decisionNeed",
      value: "Motosiklet almak istiyorum.",
    });

    const result = populateDecisionContext({
      current: null,
      candidates: [first, second],
    });

    expect(result.ok).toBe(false);
    expect(result.appliedCandidates).toEqual([]);
    expect(result.rejectedCandidates).toEqual([
      {
        candidate: first,
        reason: "UNRESOLVED_CONFLICT",
      },
      {
        candidate: second,
        reason: "UNRESOLVED_CONFLICT",
      },
    ]);
  });

  it("keeps opaque conflict handling deterministic across repeated evaluation", () => {
    const decisionNeed = candidate({
      id: "candidate-35",
      target: "decisionNeed",
      value: "Araba almak istiyorum.",
    });

    const first = candidate({
      id: "candidate-36",
      target: "evaluationContext.decisionOptions",
      value: ["Car A"],
      provenance: "DOMAIN_SUPPLIED",
      source: {
        kind: "DOMAIN_SOURCE",
        referenceId: "catalog-1",
      },
    });

    const second = candidate({
      id: "candidate-37",
      target: "evaluationContext.decisionOptions",
      value: ["Car B"],
      provenance: "DOMAIN_SUPPLIED",
      source: {
        kind: "DOMAIN_SOURCE",
        referenceId: "catalog-2",
      },
    });

    const initial = populateDecisionContext({
      current: null,
      candidates: [decisionNeed, first],
    });

    const result = populateDecisionContext({
      current: initial,
      candidates: [second],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected existing context to remain valid.");
    }

    expect(result.context.evaluationContext.decisionOptions).toEqual([
      "Car A",
    ]);

    expect(result.rejectedCandidates.at(-1)).toEqual({
      candidate: second,
      reason: "UNRESOLVED_CONFLICT",
    });
  });

  it("produces deterministic output for equivalent inputs", () => {
    const candidates = [
      candidate({
        id: "candidate-38",
        target: "decisionNeed",
        value: "Araba almak istiyorum.",
      }),
      candidate({
        id: "candidate-39",
        target: "userContext.priorities",
        value: "Düşük yakıt tüketimi",
      }),
    ];

    const first = populateDecisionContext({
      current: null,
      candidates,
    });

    const second = populateDecisionContext({
      current: null,
      candidates,
    });

    expect(second).toEqual(first);
  });
});
