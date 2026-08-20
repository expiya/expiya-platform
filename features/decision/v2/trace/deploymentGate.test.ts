import { describe, expect, it } from "vitest";

import { evaluateConversationDeploymentGate } from "./deploymentGate";

describe("conversation deployment gate", () => {
  it("fails closed for an empty suite or any critical invariant failure", () => {
    expect(evaluateConversationDeploymentGate([]).disposition).toBe("BLOCKED");
    expect(evaluateConversationDeploymentGate([{ scenarioId: "broken", traces: [], traceChecksums: [], failures: [{ code: "SHORTLIST_PREFERENCE_DOMINANCE_VIOLATION", messageId: "m", details: {} }] }])).toMatchObject({ disposition: "BLOCKED", criticalFailureCount: 1, failedScenarioIds: ["broken"] });
  });

  it("opens only when a non-empty replay suite has zero failures", () => {
    expect(evaluateConversationDeploymentGate([{ scenarioId: "passing", traces: [], traceChecksums: [], failures: [] }])).toMatchObject({ disposition: "READY", scenarioCount: 1, criticalFailureCount: 0 });
  });
});
