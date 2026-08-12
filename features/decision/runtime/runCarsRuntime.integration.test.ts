import { beforeEach, describe, expect, it, vi } from "vitest";

const { parseMock } = vi.hoisted(() => ({
  parseMock: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({
    responses: {
      parse: parseMock,
    },
  }),
}));

import { runCarsRuntime } from "./runCarsRuntime";
import {
  candidateComparisonPolicy,
  optionDiscoveryRecommendationPolicy,
} from "@/features/decision/context/sufficiency/carsSufficiencyPolicies";

describe("runCarsRuntime integration", () => {
  beforeEach(() => {
    parseMock.mockReset();
  });

  it.each([
    "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
  ] as const)("classifies and executes governed %s recommendations", async (decisionType) => {
    const policy = decisionType === "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON"
      ? candidateComparisonPolicy
      : optionDiscoveryRecommendationPolicy;
    parseMock.mockResolvedValueOnce({
      output_parsed: {
        determinations: policy.requirements.map((requirement) => ({
          requirementId: requirement.requirementId,
          outcome: requirement.mode === "REQUIRED"
            ? "MATERIAL"
            : "NOT_MATERIAL",
          limitations: [],
        })),
      },
    }).mockResolvedValueOnce({
      output_parsed: { facts: [] },
    });

    const result = await runCarsRuntime({
      requestId: "request-1",
      contextReference: "context-1",
      query: decisionType === "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON"
        ? "Toyota Corolla ile Honda Civic'i karşılaştır."
        : "Bana uygun bir otomobil öner.",
    });

    expect(result.status).toBe("SUCCEEDED");
    if (result.status !== "SUCCEEDED") throw new Error("Expected success.");
    expect(result.reasons).toEqual([]);
    expect(result.lineage).toEqual({
        requestId: "request-1",
        contextReference: "context-1",
        stoppedAt: "AUTHORIZATION",
        inspectedStages: decisionType === "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON"
          ? [
              "CLASSIFICATION",
              "TYPE_B_IDENTITY",
              "MATERIALITY",
              "REJECTION_RELEVANCE",
              "LIMITED_SUPPORT",
              "DOMAIN_BINDING",
              "EVIDENCE",
              "DOMAIN_SUFFICIENCY",
              "AUTHORIZATION",
            ]
          : [
              "CLASSIFICATION",
              "MATERIALITY",
              "REJECTION_RELEVANCE",
              "LIMITED_SUPPORT",
              "DOMAIN_BINDING",
              "EVIDENCE",
              "DOMAIN_SUFFICIENCY",
              "AUTHORIZATION",
            ],
    });
    expect(result.recommendations.map((item) => item.car.id)).toEqual(
      decisionType === "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON"
        ? ["1", "2"]
        : [
            "4", "3", "7", "1", "5", "8", "11", "15", "2", "6",
            "9", "12", "16", "14", "13", "10", "19", "20", "17", "18",
          ],
    );
    expect(result.recommendations[0].isTopPick).toBe(true);
  });

  it.each([
    {
      candidates: [
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
      ],
      status: "ADDITIONAL_CONTEXT_REQUIRED",
      code: "CLASSIFICATION_AMBIGUOUS",
    },
    {
      candidates: [],
      status: "UNRESOLVED",
      code: "CLASSIFICATION_UNSUPPORTED",
    },
  ] as const)("preserves fail-closed classification outcome $code", async ({ candidates, status, code }) => {
    parseMock.mockResolvedValue({
      output_parsed: { candidateDecisionTypes: candidates },
    });

    const result = await runCarsRuntime({
      requestId: "request-1",
      contextReference: "context-1",
      query: "request",
    });

    expect(result.status).toBe(status);
    expect(result.reasons[0].code).toBe(code);
    expect(result.lineage.stoppedAt).toBe("CLASSIFICATION");
  });
});
