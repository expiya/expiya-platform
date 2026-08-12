import { describe, expect, it } from "vitest";

import { createCarsFollowUp } from "./createCarsFollowUp";

function blocked(stage: "CLASSIFICATION" | "TYPE_B_IDENTITY" | "DOMAIN_SUFFICIENCY") {
  return {
    status: "ADDITIONAL_CONTEXT_REQUIRED" as const,
    reasons: [{
      code: stage === "CLASSIFICATION"
        ? "CLASSIFICATION_AMBIGUOUS" as const
        : stage === "TYPE_B_IDENTITY"
          ? "TYPE_B_IDENTITY_UNRESOLVED" as const
          : "DOMAIN_SUFFICIENCY_INSUFFICIENT" as const,
      stage,
      referenceIds: [],
    }],
    lineage: {
      requestId: "request-1",
      contextReference: "context-1",
      stoppedAt: stage,
      inspectedStages: [stage],
    },
  };
}

describe("createCarsFollowUp", () => {
  it("asks the user to choose discovery or comparison for ambiguous intent", () => {
    expect(createCarsFollowUp(blocked("CLASSIFICATION"))).toMatch(/discover|compare/i);
  });

  it("asks for exact candidate identities when comparison cars are missing", () => {
    expect(createCarsFollowUp(blocked("TYPE_B_IDENTITY"))).toMatch(/brand and model/i);
  });

  it("asks for an actionable requirement instead of exposing a status code", () => {
    const message = createCarsFollowUp(blocked("DOMAIN_SUFFICIENCY"));
    expect(message).toMatch(/budget|usage need/i);
    expect(message).not.toContain("DOMAIN_SUFFICIENCY_INSUFFICIENT");
  });
});
