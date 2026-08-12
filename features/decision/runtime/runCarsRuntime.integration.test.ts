import { describe, expect, it } from "vitest";

import { runCarsRuntime } from "./runCarsRuntime";

describe("runCarsRuntime integration", () => {
  it("fails closed through the real orchestrator when runtime dependencies are unavailable", () => {
    const result = runCarsRuntime({
      requestId: "request-1",
      contextReference: "context-1",
    });

    expect(result).toEqual({
      status: "UNRESOLVED",
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
    });
    expect(result).not.toHaveProperty("recommendation");
    expect(result).not.toHaveProperty("decision");
    expect(result).not.toHaveProperty("ranking");
  });
});
