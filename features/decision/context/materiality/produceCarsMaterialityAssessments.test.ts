import { beforeEach, describe, expect, it, vi } from "vitest";

import { optionDiscoveryRecommendationPolicy } from "@/features/decision/context/sufficiency/carsSufficiencyPolicies";

const { parseMock } = vi.hoisted(() => ({
  parseMock: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  openai: { responses: { parse: parseMock } },
}));

import { produceCarsMaterialityAssessments } from "./produceCarsMaterialityAssessments";

function completeDeterminations() {
  return optionDiscoveryRecommendationPolicy.requirements.map(
    (requirement) => ({
      requirementId: requirement.requirementId,
      outcome: requirement.mode === "REQUIRED"
        ? "MATERIAL"
        : "NOT_MATERIAL",
      limitations: [],
    }),
  );
}

describe("produceCarsMaterialityAssessments", () => {
  beforeEach(() => {
    parseMock.mockReset();
  });

  it("returns policy-ordered assessments for complete bounded output", async () => {
    parseMock.mockResolvedValue({
      output_parsed: { determinations: completeDeterminations().reverse() },
    });

    const result = await produceCarsMaterialityAssessments({
      query: "Aile için ekonomik bir otomobil arıyorum.",
      policy: optionDiscoveryRecommendationPolicy,
    });

    expect(result?.map(({ requirementId, outcome }) => ({
      requirementId,
      outcome,
    }))).toEqual(
      optionDiscoveryRecommendationPolicy.requirements.map((requirement) => ({
        requirementId: requirement.requirementId,
        outcome: requirement.mode === "REQUIRED"
          ? "MATERIAL"
          : "NOT_MATERIAL",
      })),
    );
  });

  it.each([
    [],
    [...completeDeterminations(), completeDeterminations()[0]],
    completeDeterminations().map((item, index) =>
      index === 0 ? { ...item, requirementId: "unknown" } : item),
  ])("fails closed for incomplete, duplicate, or foreign coverage", async (determinations) => {
    parseMock.mockResolvedValue({
      output_parsed: { determinations },
    });

    await expect(produceCarsMaterialityAssessments({
      query: "request",
      policy: optionDiscoveryRecommendationPolicy,
    })).resolves.toBeUndefined();
  });

  it.each([
    { output_parsed: null },
    { output_parsed: { determinations: [{ requirementId: "x", outcome: "YES" }] } },
  ])("fails closed for absent or malformed output", async (response) => {
    parseMock.mockResolvedValue(response);

    await expect(produceCarsMaterialityAssessments({
      query: "request",
      policy: optionDiscoveryRecommendationPolicy,
    })).resolves.toBeUndefined();
  });

  it("fails closed when the provider throws", async () => {
    parseMock.mockRejectedValue(new Error("unavailable"));

    await expect(produceCarsMaterialityAssessments({
      query: "request",
      policy: optionDiscoveryRecommendationPolicy,
    })).resolves.toBeUndefined();
  });

  it("forbids inference and downstream authorization in the model contract", async () => {
    parseMock.mockResolvedValue({
      output_parsed: { determinations: completeDeterminations() },
    });

    await produceCarsMaterialityAssessments({
      query: "request",
      policy: optionDiscoveryRecommendationPolicy,
    });

    const systemMessage = parseMock.mock.calls[0][0].input[0].content;
    expect(systemMessage).toContain("using only the user's explicit request");
    expect(systemMessage).toContain("Do not infer unstated user needs");
    expect(systemMessage).toContain(
      "does not mention or otherwise make a conditional target relevant",
    );
    expect(systemMessage).toContain(
      "A later user turn may make a previously NOT_MATERIAL target MATERIAL",
    );
    expect(systemMessage).toContain(
      "Do not recommend, rank, score, evaluate, or authorize any vehicle.",
    );
  });
});
