import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CarsOrchestrationResult } from "@/types/carsOrchestration";

const mocks = vi.hoisted(() => ({
  orchestrateCarsDecision: vi.fn(),
  getRecommendedCars: vi.fn(),
  evaluateCar: vi.fn(),
  defaultRanking: vi.fn(),
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
  dependencies: {},
} as const;

describe("runCarsRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    "ADDITIONAL_CONTEXT_REQUIRED",
    "UNRESOLVED",
    "FAILED",
  ] as const)("preserves the %s fail-closed disposition", (status) => {
    const orchestrationResult = result(status);
    mocks.orchestrateCarsDecision.mockReturnValue(orchestrationResult);

    expect(runCarsRuntime(input)).toEqual(orchestrationResult);
    expect(mocks.orchestrateCarsDecision).toHaveBeenCalledOnce();
    expect(mocks.orchestrateCarsDecision).toHaveBeenCalledWith(input);
  });

  it("never executes the legacy recommendation, engine, or ranking path", () => {
    mocks.orchestrateCarsDecision.mockReturnValue(result("UNRESOLVED"));

    runCarsRuntime(input);

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
});
