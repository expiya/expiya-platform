import { beforeEach, describe, expect, it, vi } from "vitest";

const { extractMock } = vi.hoisted(() => ({
  extractMock: vi.fn(),
}));

vi.mock("@/features/decision/context/extraction/extractExplicitContextCandidates", () => ({
  extractExplicitContextCandidates: extractMock,
}));

import { buildCarsRuntimeContextDependencies } from "./buildCarsRuntimeContextDependencies";

const input = {
  query: "Toyota Corolla ile Honda Civic'i karşılaştır.",
  requestId: "request-1",
  contextReference: "context-1",
} as const;

describe("buildCarsRuntimeContextDependencies", () => {
  beforeEach(() => {
    extractMock.mockReset();
    extractMock.mockResolvedValue([]);
  });

  it("builds an explicit decision context with fail-closed support", async () => {
    const result = await buildCarsRuntimeContextDependencies(input);

    expect(result?.populationResult).toMatchObject({
      ok: true,
      context: { decisionNeed: input.query },
      rejectedCandidates: [],
    });
    expect(result?.rejectionAssessments).toEqual([]);
    expect(result?.limitedSupportAssessment).toEqual({
      outcome: "NOT_PERMITTED",
      limitations: [],
    });
  });

  it("uses canonical Type B options and ignores opaque model options", async () => {
    extractMock.mockResolvedValue([{
      id: "model-options",
      target: "evaluationContext.decisionOptions",
      value: "untrusted opaque options",
      provenance: "EXPLICIT_USER",
      source: { kind: "USER_INPUT", referenceId: "request-1" },
    }]);

    const result = await buildCarsRuntimeContextDependencies({
      ...input,
      typeBProduction: {
        candidate: {
          id: "canonical-options",
          target: "evaluationContext.decisionOptions",
          value: [{ optionId: "1" }, { optionId: "2" }],
          provenance: "EXPLICIT_USER",
          source: { kind: "USER_INPUT", referenceId: "request-1" },
        },
        selectionTrace: [],
      },
    });

    expect(result?.populationResult).toMatchObject({
      ok: true,
      context: {
        evaluationContext: {
          decisionOptions: [{ optionId: "1" }, { optionId: "2" }],
        },
      },
      rejectedCandidates: [],
    });
  });

  it("keeps population rejections unresolved", async () => {
    extractMock.mockResolvedValue([
      {
        id: "duplicate-id",
        target: "userContext.needs",
        value: "first",
        provenance: "EXPLICIT_USER",
        source: { kind: "USER_INPUT", referenceId: "request-1" },
      },
      {
        id: "duplicate-id",
        target: "userContext.needs",
        value: "second",
        provenance: "EXPLICIT_USER",
        source: { kind: "USER_INPUT", referenceId: "request-1" },
      },
    ]);

    const result = await buildCarsRuntimeContextDependencies(input);

    expect(result?.rejectionAssessments).toEqual([{
      candidateId: "duplicate-id",
      outcome: "UNRESOLVED",
      affectedRequirementIds: [],
      limitations: [
        "Population rejection requires resolution: DUPLICATE_CANDIDATE.",
      ],
    }]);
  });

  it("fails closed when explicit extraction fails", async () => {
    extractMock.mockRejectedValue(new Error("unavailable"));

    await expect(
      buildCarsRuntimeContextDependencies(input),
    ).resolves.toBeUndefined();
  });
});
