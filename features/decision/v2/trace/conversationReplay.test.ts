import { describe, expect, it } from "vitest";

import { replaySyntheticConversation } from "./conversationReplay";

describe("synthetic conversation replay", () => {
  it("runs ordered turns and emits only controlled trace fields", async () => {
    const result = await replaySyntheticConversation({
      scenario: { scenarioId: "brand-body-dominance", turns: [{ messageId: "brand", text: "Toyota almak istiyorum" }, { messageId: "body", text: "Sedan benim için daha uygun" }] },
      executeTurn: async (turn, revision, observe) => observe({
        phase: "DECISION", traceSchemaVersion: 1, messageId: turn.messageId,
        interpretedActs: ["RECOMMENDATION_REQUEST"], activeConstraints: revision ? [{ fieldId: "bodyStyle", decisionEffect: "STRONG_RANK", normalizedValue: { operator: "EQUALS", value: "Sedan" } }] : [],
        rankingCandidates: [], shortlistCandidateIds: [], shortlistMode: "FAMILY_DIVERSE", exactModelPreferenceScope: false,
        action: "ASK_MATERIAL_QUESTION", recommendationReadiness: "NEEDS_MATERIAL_DISCRIMINATOR",
      }),
    });
    expect(result.traces.map((trace) => trace.messageId)).toEqual(["brand", "body"]);
    expect(result.traceChecksums).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain("Toyota almak istiyorum");
    expect(JSON.stringify(result)).not.toContain("Sedan benim için daha uygun");
  });
});
