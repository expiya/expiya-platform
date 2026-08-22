import { describe, expect, it } from "vitest";

import { createAnonymousShadowReplayRecord, evaluateAnonymousShadowReplay, type AnonymousShadowTurnInput } from "./anonymousReplay";

const base: AnonymousShadowTurnInput = { conversationId: "customer-conversation", messageId: "message-1", userText: "Telefonum 0532 123 45 67, bütçem 3 milyon", providerCalled: false, deterministicallyResolved: true, wrongMutation: false, repeatedQuestion: false, hardFilterViolation: false, overBudgetOffer: false, revokeRequired: false, revokeSucceeded: false, unauthorizedCard: false, correctionLost: false };
const secret = "shadow-replay-test-secret-at-least-32-bytes";

describe("anonymous production shadow replay", () => {
  it("removes direct identifiers and uses stable namespace-separated pseudonyms", () => {
    const record = createAnonymousShadowReplayRecord(base, secret);
    expect(JSON.stringify(record)).not.toContain(base.conversationId);
    expect(JSON.stringify(record)).not.toContain(base.messageId);
    expect(record.redactedText).toBe("Telefonum [REDACTED], bütçem 3 milyon");
    expect(record).toMatchObject({ redactionCount: 1, sourceTextStored: false });
    expect(createAnonymousShadowReplayRecord(base, secret)).toEqual(record);
    expect(record.anonymousConversationId).not.toBe(record.anonymousMessageId);
  });

  it("redacts every occurrence of direct identifiers and blocks undersized production samples", () => {
    const record = createAnonymousShadowReplayRecord({ ...base, userText: "a@b.com ve c@d.com, https://example.com, 192.168.1.1" }, secret);
    expect(record.redactedText).toBe("[REDACTED] ve [REDACTED], [REDACTED] [REDACTED]");
    expect(record.redactionCount).toBe(4);
    expect(evaluateAnonymousShadowReplay([record], { minimumTurnCount: 100 })).toMatchObject({ deploymentDisposition: "BLOCKED", issueCodes: ["INSUFFICIENT_SHADOW_SAMPLE"] });
  });

  it("blocks wrong mutations and excessive repeated questions by policy", () => {
    const wrong = createAnonymousShadowReplayRecord({ ...base, wrongMutation: true }, secret);
    expect(evaluateAnonymousShadowReplay([wrong]).issueCodes).toContain("WRONG_MUTATION_RATE_EXCEEDED");
    const repeated = createAnonymousShadowReplayRecord({ ...base, repeatedQuestion: true }, secret);
    expect(evaluateAnonymousShadowReplay([repeated], { maximumRepeatedQuestionRate: 0.5 }).issueCodes).toContain("REPEATED_QUESTION_RATE_EXCEEDED");
  });

  it("blocks deployment for every critical decision invariant", () => {
    const safe = createAnonymousShadowReplayRecord(base, secret);
    expect(evaluateAnonymousShadowReplay([safe])).toMatchObject({ deploymentDisposition: "READY", deterministicResolutionRate: 1, offerRevokeSuccessRate: 1 });
    for (const violation of ["hardFilterViolation", "overBudgetOffer", "unauthorizedCard", "correctionLost"] as const) {
      const unsafe = createAnonymousShadowReplayRecord({ ...base, [violation]: true }, secret);
      expect(evaluateAnonymousShadowReplay([safe, unsafe]).deploymentDisposition).toBe("BLOCKED");
    }
    const failedRevoke = createAnonymousShadowReplayRecord({ ...base, revokeRequired: true, revokeSucceeded: false }, secret);
    expect(evaluateAnonymousShadowReplay([failedRevoke])).toMatchObject({ deploymentDisposition: "BLOCKED", offerRevokeSuccessRate: 0 });
  });
});
