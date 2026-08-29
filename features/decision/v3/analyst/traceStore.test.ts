import { describe, expect, it } from "vitest";
import type { AnalystTraceEnvelope } from "./shadowRuntime.server";
import {
  readAnalystTraceForInternalDiagnostics,
  readAnalystRuntimeMetricsForInternalDiagnostics,
  recordAnalystTrace,
  resetAnalystTraceStoreForTests,
} from "./traceStore.server";

const envelope = (conversationId: string, sourceMessageId: string, revision: number): AnalystTraceEnvelope => ({
  conversationId,
  sourceMessageId,
  revision,
  trace: {
    mode: "SHADOW",
    origin: "BOUNDED_FALLBACK",
    acceptedExplicitFacts: [],
    rejectedExplicitFacts: [],
    acceptedHypotheses: [],
    rejectedHypotheses: [],
    questionEvaluations: [],
    noQuestionReason: "NO_ELIGIBLE_QUESTION",
    decisionNeutralityFingerprint: `fingerprint-${conversationId}-${revision}`,
  },
});

describe("conversation-scoped Analyst diagnostics", () => {
  it("does not expose one conversation trace through another conversation id", () => {
    resetAnalystTraceStoreForTests();
    recordAnalystTrace(envelope("conversation-a", "message-a", 1));

    expect(readAnalystTraceForInternalDiagnostics("conversation-b")).toBeUndefined();
    expect(readAnalystTraceForInternalDiagnostics("conversation-a")?.sourceMessageId).toBe("message-a");
  });

  it("keeps only the latest trace for the same conversation", () => {
    resetAnalystTraceStoreForTests();
    recordAnalystTrace(envelope("conversation-a", "message-a", 1));
    recordAnalystTrace(envelope("conversation-a", "message-b", 2));

    expect(readAnalystTraceForInternalDiagnostics("conversation-a")).toMatchObject({
      sourceMessageId: "message-b",
      revision: 2,
    });
  });

  it("deduplicates replayed trace events in bounded runtime metrics", () => {
    resetAnalystTraceStoreForTests();
    const event = envelope("conversation-a", "message-a", 1);
    recordAnalystTrace(event);
    recordAnalystTrace(event);
    recordAnalystTrace(envelope("conversation-b", "message-b", 1));

    expect(readAnalystRuntimeMetricsForInternalDiagnostics()).toMatchObject({
      sampledTurns: 2,
      fallbackTurns: 2,
      selectedQuestionTurns: 0,
      noQuestionTurns: 2,
      modeCounts: { SHADOW: 2 },
    });
  });
});
