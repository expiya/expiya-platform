import { describe, expect, it } from "vitest";
import type { AnalystRuntimeMetrics } from "./traceStore.server";
import { evaluateAnalystPilotRollout, type AnalystPilotSafetyEvidence } from "./pilotRolloutGate";

const metrics = (overrides: Partial<AnalystRuntimeMetrics> = {}): AnalystRuntimeMetrics => ({
  sampledTurns: 100,
  modelTurns: 96,
  fallbackTurns: 4,
  selectedQuestionTurns: 70,
  noQuestionTurns: 30,
  rejectedSignalCount: 0,
  modeCounts: { OFF: 0, SHADOW: 0, QUESTION_INPUT: 100, EXPLICIT_FACTS_AND_QUESTIONS: 0 },
  ...overrides,
});
const evidence = (overrides: Partial<AnalystPilotSafetyEvidence> = {}): AnalystPilotSafetyEvidence => ({
  metrics: metrics(),
  candidateAuthorityMismatches: 0,
  publicPayloadLeakageEvents: 0,
  crossConversationLeakageEvents: 0,
  replayDivergenceEvents: 0,
  serverErrorRate: 0,
  p95AddedLatencyMs: 1_000,
  ...overrides,
});

describe("controlled QUESTION_INPUT pilot rollback gate", () => {
  it("keeps QUESTION_INPUT only after a sufficient healthy sample", () => {
    expect(evaluateAnalystPilotRollout(evidence())).toEqual({ disposition: "KEEP_QUESTION_INPUT", recommendedMode: "QUESTION_INPUT", reasonCodes: [] });
  });

  it("stays in SHADOW while the sample is insufficient", () => {
    expect(evaluateAnalystPilotRollout(evidence({ metrics: metrics({ sampledTurns: 49, modelTurns: 49, fallbackTurns: 0 }) }))).toMatchObject({ disposition: "INSUFFICIENT_SAMPLE", recommendedMode: "SHADOW" });
  });

  it.each([
    ["candidateAuthorityMismatches", "CANDIDATE_AUTHORITY_MISMATCH"],
    ["publicPayloadLeakageEvents", "PUBLIC_PAYLOAD_LEAKAGE"],
    ["crossConversationLeakageEvents", "CROSS_CONVERSATION_LEAKAGE"],
    ["replayDivergenceEvents", "REPLAY_DIVERGENCE"],
  ] as const)("rolls back for %s", (field, reason) => {
    expect(evaluateAnalystPilotRollout(evidence({ [field]: 1 }))).toMatchObject({ disposition: "ROLLBACK_TO_SHADOW", recommendedMode: "SHADOW", reasonCodes: [reason] });
  });

  it("rolls back when provider fallback, errors, or latency exceed their limits", () => {
    const result = evaluateAnalystPilotRollout(evidence({
      metrics: metrics({ modelTurns: 80, fallbackTurns: 20 }),
      serverErrorRate: 0.02,
      p95AddedLatencyMs: 3_000,
    }));
    expect(result.reasonCodes).toEqual(expect.arrayContaining(["PROVIDER_FALLBACK_RATE_EXCEEDED", "SERVER_ERROR_RATE_EXCEEDED", "ADDED_LATENCY_EXCEEDED"]));
    expect(result.recommendedMode).toBe("SHADOW");
  });
});
