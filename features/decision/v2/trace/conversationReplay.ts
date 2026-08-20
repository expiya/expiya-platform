import { DecisionTraceCollector, decisionTraceFromObserver, traceChecksum, type DecisionTurnTrace, type TraceInvariantFailure } from "./decisionTrace";

export interface SyntheticReplayTurn { readonly messageId: string; readonly text: string }
export interface SyntheticReplayScenario { readonly scenarioId: string; readonly turns: readonly SyntheticReplayTurn[] }
export interface SyntheticReplayResult {
  readonly scenarioId: string;
  readonly traces: readonly DecisionTurnTrace[];
  readonly failures: readonly TraceInvariantFailure[];
  readonly traceChecksums: readonly `sha256:${string}`[];
}

export async function replaySyntheticConversation(input: {
  readonly scenario: SyntheticReplayScenario;
  readonly executeTurn: (turn: SyntheticReplayTurn, revision: number, observe: (value: Readonly<Record<string, unknown>>) => void) => Promise<void>;
}): Promise<SyntheticReplayResult> {
  const collector = new DecisionTraceCollector();
  for (let revision = 0; revision < input.scenario.turns.length; revision += 1) {
    const turn = input.scenario.turns[revision]!;
    await input.executeTurn(turn, revision, (value) => { const trace = decisionTraceFromObserver(value); if (trace) collector.record(trace); });
  }
  const traces = collector.snapshot();
  return Object.freeze({ scenarioId: input.scenario.scenarioId, traces, failures: collector.evaluate(), traceChecksums: Object.freeze(traces.map(traceChecksum)) });
}
