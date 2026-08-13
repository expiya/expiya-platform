import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CarsOrchestrationResult } from "@/types/carsOrchestration";

const mocks = vi.hoisted(() => ({
  produceCarsDecisionTypeClassificationInput: vi.fn(),
  produceCarsMaterialityAssessments: vi.fn(),
  buildCarsRuntimeContextDependencies: vi.fn(),
  resolveCarsRuntimeDomainRequirements: vi.fn(),
  buildCarsRuntimeEvidenceDependencies: vi.fn(),
  orchestrateCarsDecision: vi.fn(),
  executeAuthorizedCarsRecommendation: vi.fn(),
}));

vi.mock("@/features/decision/context/classification/produceCarsDecisionTypeClassificationInput", () => ({
  produceCarsDecisionTypeClassificationInput:
    mocks.produceCarsDecisionTypeClassificationInput,
}));
vi.mock("@/features/decision/context/materiality/produceCarsMaterialityAssessments", () => ({
  produceCarsMaterialityAssessments:
    mocks.produceCarsMaterialityAssessments,
}));
vi.mock("./buildCarsRuntimeContextDependencies", () => ({
  buildCarsRuntimeContextDependencies:
    mocks.buildCarsRuntimeContextDependencies,
}));
vi.mock("./resolveCarsRuntimeDomainRequirements", () => ({
  resolveCarsRuntimeDomainRequirements:
    mocks.resolveCarsRuntimeDomainRequirements,
}));
vi.mock("./buildCarsRuntimeEvidenceDependencies", () => ({
  buildCarsRuntimeEvidenceDependencies:
    mocks.buildCarsRuntimeEvidenceDependencies,
}));
vi.mock("@/features/decision/orchestration/orchestrateCarsDecision", () => ({
  orchestrateCarsDecision: mocks.orchestrateCarsDecision,
}));
vi.mock("./executeAuthorizedCarsRecommendation", () => ({
  executeAuthorizedCarsRecommendation:
    mocks.executeAuthorizedCarsRecommendation,
}));

import { runCarsRuntime } from "./runCarsRuntime";

function result(
  status: "ADDITIONAL_CONTEXT_REQUIRED" | "UNRESOLVED" | "FAILED",
): CarsOrchestrationResult {
  return {
    status,
    reasons: [{
      code: "CLASSIFICATION_MISSING",
      stage: "CLASSIFICATION",
      referenceIds: [],
    }],
    lineage: {
      requestId: "request-1",
      contextReference: "context-1",
      stoppedAt: "CLASSIFICATION",
      inspectedStages: ["CLASSIFICATION"],
    },
  };
}

const input = {
  requestId: "request-1",
  contextReference: "context-1",
  query: "Find me a suitable car.",
} as const;

describe("runCarsRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.produceCarsDecisionTypeClassificationInput.mockResolvedValue({
      status: "READY",
      candidateDecisionTypes: [
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      ],
    });
    mocks.produceCarsMaterialityAssessments.mockResolvedValue([]);
    mocks.buildCarsRuntimeContextDependencies.mockResolvedValue({
      populationResult: {
        ok: true,
        context: {
          decisionNeed: input.query,
          userContext: {
            needs: [], priorities: [], preferences: [], constraints: [], usageConditions: [],
          },
          evaluationContext: { decisionCriteria: [] },
          domainContext: {},
        },
        appliedCandidates: [],
        rejectedCandidates: [],
      },
      rejectionAssessments: [],
      limitedSupportAssessment: { outcome: "NOT_PERMITTED", limitations: [] },
    });
    mocks.resolveCarsRuntimeDomainRequirements.mockReturnValue({
      status: "RESOLVED",
      resolutions: [],
      requirements: [],
      limitations: [],
      errors: [],
    });
    mocks.buildCarsRuntimeEvidenceDependencies.mockReturnValue({
      evidence: {
        status: "AVAILABLE",
        linkage: {
          ok: true,
          value: {
            optionIds: [],
            requirementResolution: {
              status: "RESOLVED",
              resolutions: [], requirements: [], limitations: [], errors: [],
            },
            assertions: [], requirementLinks: [], conflicts: [], optionMatches: [],
          },
        },
      },
      domainAssessment: {
        policyId: "cars.option-discovery-recommendation",
        decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
        evaluableOptionIds: [], outcome: "SUFFICIENT",
        missingDomainRequirements: [], evidenceLimitations: [],
        relevantConflicts: [], diagnostics: [],
      },
    });
    mocks.executeAuthorizedCarsRecommendation.mockReturnValue([]);
  });

  it.each([
    "ADDITIONAL_CONTEXT_REQUIRED",
    "UNRESOLVED",
    "FAILED",
  ] as const)("preserves the %s fail-closed disposition", async (status) => {
    const orchestrationResult = result(status);
    mocks.orchestrateCarsDecision.mockReturnValue(orchestrationResult);

    await expect(runCarsRuntime(input)).resolves.toEqual(orchestrationResult);
    expect(mocks.orchestrateCarsDecision).toHaveBeenCalledOnce();
    expect(mocks.orchestrateCarsDecision).toHaveBeenCalledWith({
      requestId: input.requestId,
      contextReference: input.contextReference,
      dependencies: {
        classification: {
          status: "CLASSIFIED",
          decisionType:
            "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
        },
        materialityAssessments: [],
        rejectionAssessments: [],
        limitedSupportAssessment: {
          outcome: "NOT_PERMITTED",
          limitations: [],
        },
        domainFactResolution: {
          status: "RESOLVED",
          resolutions: [],
          requirements: [],
          limitations: [],
          errors: [],
        },
        evidence: mocks.buildCarsRuntimeEvidenceDependencies.mock.results[0].value.evidence,
        domainAssessment:
          mocks.buildCarsRuntimeEvidenceDependencies.mock.results[0].value.domainAssessment,
      },
    });
  });

  it("never executes recommendation on a fail-closed result", async () => {
    mocks.orchestrateCarsDecision.mockReturnValue(result("UNRESOLVED"));

    await runCarsRuntime(input);

    expect(mocks.executeAuthorizedCarsRecommendation).not.toHaveBeenCalled();
  });

  it("executes discovery recommendations only after authorization", async () => {
    mocks.orchestrateCarsDecision.mockReturnValue({
      status: "AUTHORIZED",
      reasons: [],
      lineage: {
        requestId: input.requestId,
        contextReference: input.contextReference,
        stoppedAt: "AUTHORIZATION",
        inspectedStages: ["CLASSIFICATION", "AUTHORIZATION"],
      },
    });
    mocks.executeAuthorizedCarsRecommendation.mockReturnValue([{ car: { id: "1" } }]);

    const runtimeResult = await runCarsRuntime(input);

    expect(runtimeResult).toMatchObject({
      status: "SUCCEEDED",
      recommendations: [{ car: { id: "1" } }],
    });
    expect(mocks.executeAuthorizedCarsRecommendation).toHaveBeenCalledOnce();
    expect(mocks.executeAuthorizedCarsRecommendation).toHaveBeenCalledWith({
      context: expect.objectContaining({ decisionNeed: input.query }),
      optionIds: undefined,
    });
  });

  it("fails closed when the production recommendation catalog cannot be read", async () => {
    mocks.orchestrateCarsDecision.mockReturnValue({
      status: "AUTHORIZED", reasons: [],
      lineage: { requestId: input.requestId, contextReference: input.contextReference, stoppedAt: "AUTHORIZATION", inspectedStages: ["CLASSIFICATION", "AUTHORIZATION"] },
    });
    mocks.executeAuthorizedCarsRecommendation.mockRejectedValue(new Error("PRODUCTION_CATALOG_UNAVAILABLE"));

    await expect(runCarsRuntime(input)).resolves.toMatchObject({
      status: "FAILED",
      reasons: [{ code: "EXECUTION_CONTEXT_UNAVAILABLE", referenceIds: ["production-vehicle-catalog"] }],
    });
  });

  it("fails closed if an authorized result has no populated execution context", async () => {
    mocks.buildCarsRuntimeContextDependencies.mockResolvedValue({
      populationResult: {
        ok: false,
        rejectedCandidates: [],
        errors: [],
      },
      rejectionAssessments: [],
      limitedSupportAssessment: { outcome: "NOT_PERMITTED", limitations: [] },
    });
    mocks.orchestrateCarsDecision.mockReturnValue({
      status: "AUTHORIZED",
      reasons: [],
      lineage: {
        requestId: input.requestId,
        contextReference: input.contextReference,
        stoppedAt: "AUTHORIZATION",
        inspectedStages: ["CLASSIFICATION", "AUTHORIZATION"],
      },
    });

    await expect(runCarsRuntime(input)).resolves.toMatchObject({
      status: "FAILED",
      reasons: [{ code: "EXECUTION_CONTEXT_UNAVAILABLE" }],
    });
    expect(mocks.executeAuthorizedCarsRecommendation).not.toHaveBeenCalled();
  });

  it("keeps execution structurally behind the governed runtime boundary", () => {
    const runtimeSource = readFileSync(
      fileURLToPath(new URL("./runCarsRuntime.ts", import.meta.url)),
      "utf8",
    );
    const analysisSource = readFileSync(
      fileURLToPath(new URL("../../../app/analysis/page.tsx", import.meta.url)),
      "utf8",
    );

    for (const forbiddenDependency of ["getRecommendedCars", "evaluateCar", "defaultRanking"]) {
      expect(analysisSource).not.toContain(forbiddenDependency);
    }
    expect(runtimeSource).toContain("executeAuthorizedCarsRecommendation");
    expect(runtimeSource.indexOf('result.status === "AUTHORIZED"')).toBeLessThan(
      runtimeSource.indexOf("executeAuthorizedCarsRecommendation({"),
    );
  });

  it("has no active legacy success bypass routes", () => {
    const appRoot = fileURLToPath(new URL("../../../app/", import.meta.url));

    expect(existsSync(`${appRoot}result/page.tsx`)).toBe(false);
    expect(existsSync(`${appRoot}api/analyze/route.ts`)).toBe(false);
  });
});
