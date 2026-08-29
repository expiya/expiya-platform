import type { AnalystRuntimeMetrics } from "./traceStore.server";

export interface AnalystPilotSafetyEvidence {
  readonly metrics: AnalystRuntimeMetrics;
  readonly candidateAuthorityMismatches: number;
  readonly publicPayloadLeakageEvents: number;
  readonly crossConversationLeakageEvents: number;
  readonly replayDivergenceEvents: number;
  readonly serverErrorRate: number;
  readonly p95AddedLatencyMs: number;
}

export interface AnalystPilotRolloutDecision {
  readonly disposition: "KEEP_QUESTION_INPUT" | "ROLLBACK_TO_SHADOW" | "INSUFFICIENT_SAMPLE";
  readonly recommendedMode: "QUESTION_INPUT" | "SHADOW";
  readonly reasonCodes: readonly string[];
}

const MINIMUM_PILOT_TURNS = 50;
const MAXIMUM_FALLBACK_RATE = 0.1;
const MAXIMUM_SERVER_ERROR_RATE = 0.01;
const MAXIMUM_P95_ADDED_LATENCY_MS = 2_500;

export function evaluateAnalystPilotRollout(evidence: AnalystPilotSafetyEvidence): AnalystPilotRolloutDecision {
  const { metrics } = evidence;
  const fallbackRate = metrics.sampledTurns === 0 ? 0 : metrics.fallbackTurns / metrics.sampledTurns;
  const rollbackReasons = [
    ...(evidence.candidateAuthorityMismatches > 0 ? ["CANDIDATE_AUTHORITY_MISMATCH"] : []),
    ...(evidence.publicPayloadLeakageEvents > 0 ? ["PUBLIC_PAYLOAD_LEAKAGE"] : []),
    ...(evidence.crossConversationLeakageEvents > 0 ? ["CROSS_CONVERSATION_LEAKAGE"] : []),
    ...(evidence.replayDivergenceEvents > 0 ? ["REPLAY_DIVERGENCE"] : []),
    ...(fallbackRate > MAXIMUM_FALLBACK_RATE ? ["PROVIDER_FALLBACK_RATE_EXCEEDED"] : []),
    ...(evidence.serverErrorRate > MAXIMUM_SERVER_ERROR_RATE ? ["SERVER_ERROR_RATE_EXCEEDED"] : []),
    ...(evidence.p95AddedLatencyMs > MAXIMUM_P95_ADDED_LATENCY_MS ? ["ADDED_LATENCY_EXCEEDED"] : []),
  ];
  if (rollbackReasons.length > 0) return { disposition: "ROLLBACK_TO_SHADOW", recommendedMode: "SHADOW", reasonCodes: rollbackReasons };
  if (metrics.sampledTurns < MINIMUM_PILOT_TURNS) return { disposition: "INSUFFICIENT_SAMPLE", recommendedMode: "SHADOW", reasonCodes: ["PILOT_SAMPLE_BELOW_MINIMUM"] };
  return { disposition: "KEEP_QUESTION_INPUT", recommendedMode: "QUESTION_INPUT", reasonCodes: [] };
}
