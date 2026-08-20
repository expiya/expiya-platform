import type { SyntheticReplayResult } from "./conversationReplay";

export interface ConversationDeploymentGateReport {
  readonly schemaVersion: 1;
  readonly disposition: "READY" | "BLOCKED";
  readonly scenarioCount: number;
  readonly traceCount: number;
  readonly criticalFailureCount: number;
  readonly failuresByCode: Readonly<Record<string, number>>;
  readonly failedScenarioIds: readonly string[];
}

export function evaluateConversationDeploymentGate(
  results: readonly SyntheticReplayResult[],
): ConversationDeploymentGateReport {
  const failures = results.flatMap((result) => result.failures.map((failure) => ({ scenarioId: result.scenarioId, failure })));
  const failuresByCode = failures.reduce<Record<string, number>>((summary, item) => {
    summary[item.failure.code] = (summary[item.failure.code] ?? 0) + 1;
    return summary;
  }, {});
  return Object.freeze({
    schemaVersion: 1,
    disposition: results.length > 0 && failures.length === 0 ? "READY" : "BLOCKED",
    scenarioCount: results.length,
    traceCount: results.reduce((count, result) => count + result.traces.length, 0),
    criticalFailureCount: failures.length,
    failuresByCode: Object.freeze(failuresByCode),
    failedScenarioIds: Object.freeze([...new Set(failures.map((item) => item.scenarioId))].sort()),
  });
}
