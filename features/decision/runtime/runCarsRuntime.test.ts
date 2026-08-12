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
  getRecommendedCars: vi.fn(),
  evaluateCar: vi.fn(),
  defaultRanking: vi.fn(),
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
vi.mock("@/features/recommendation/getRecommendedCars", () => ({
  getRecommendedCars: mocks.getRecommendedCars,
}));
vi.mock("@/features/decision/engine", () => ({
  evaluateCar: mocks.evaluateCar,
}));
vi.mock("@/features/recommendation/ranking/defaultRanking", () => ({
  defaultRanking: mocks.defaultRanking,
}));

import { runCarsRuntime } from "./runCarsRuntime";

function result(status: CarsOrchestrationResult["status"]): CarsOrchestrationResult {
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

  it("never executes the legacy recommendation, engine, or ranking path", async () => {
    mocks.orchestrateCarsDecision.mockReturnValue(result("UNRESOLVED"));

    await runCarsRuntime(input);

    expect(mocks.getRecommendedCars).not.toHaveBeenCalled();
    expect(mocks.evaluateCar).not.toHaveBeenCalled();
    expect(mocks.defaultRanking).not.toHaveBeenCalled();
  });

  it("has no structural dependency on the legacy execution path", () => {
    const runtimeSource = readFileSync(
      fileURLToPath(new URL("./runCarsRuntime.ts", import.meta.url)),
      "utf8",
    );
    const analysisSource = readFileSync(
      fileURLToPath(new URL("../../../app/analysis/page.tsx", import.meta.url)),
      "utf8",
    );

    for (const forbiddenDependency of [
      "getRecommendedCars",
      "evaluateCar",
      "defaultRanking",
    ]) {
      expect(runtimeSource).not.toContain(forbiddenDependency);
      expect(analysisSource).not.toContain(forbiddenDependency);
    }
  });

  it("has no active legacy success bypass routes", () => {
    const appRoot = fileURLToPath(new URL("../../../app/", import.meta.url));

    expect(existsSync(`${appRoot}result/page.tsx`)).toBe(false);
    expect(existsSync(`${appRoot}api/analyze/route.ts`)).toBe(false);
  });
});
