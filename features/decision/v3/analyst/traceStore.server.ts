import type { AnalystTraceEnvelope } from "./shadowRuntime.server";

const MAX_CONVERSATIONS = 500;
const MAX_RECENT_EVENTS = 1_000;
const latestByConversation = new Map<string, AnalystTraceEnvelope>();
const recentEvents = new Map<string, AnalystTraceEnvelope>();
export function recordAnalystTrace(envelope: AnalystTraceEnvelope): void {
  latestByConversation.delete(envelope.conversationId); latestByConversation.set(envelope.conversationId, envelope);
  while (latestByConversation.size > MAX_CONVERSATIONS) latestByConversation.delete(latestByConversation.keys().next().value!);
  const eventKey = `${envelope.conversationId}:${envelope.sourceMessageId}:${envelope.revision}`;
  if (!recentEvents.has(eventKey)) recentEvents.set(eventKey, envelope);
  while (recentEvents.size > MAX_RECENT_EVENTS) recentEvents.delete(recentEvents.keys().next().value!);
  if (process.env.CARS_SEMANTIC_ANALYST_DIAGNOSTICS_LOG === "true")
    console.info(JSON.stringify({
      event: "cars_semantic_analyst_trace",
      mode: envelope.trace.mode,
      origin: envelope.trace.origin,
      acceptedExplicitFactCount: envelope.trace.acceptedExplicitFacts.length,
      rejectedExplicitFactCount: envelope.trace.rejectedExplicitFacts.length,
      rejectedExplicitFactReasons: envelope.trace.rejectedExplicitFacts.map((item) => item.reasonCode),
      acceptedHypothesisCount: envelope.trace.acceptedHypotheses.length,
      rejectedHypothesisCount: envelope.trace.rejectedHypotheses.length,
      rejectedHypothesisReasons: envelope.trace.rejectedHypotheses.map((item) => item.reasonCode),
      questionSelected: envelope.trace.selectedQuestionKey !== undefined,
      noQuestionReason: envelope.trace.noQuestionReason ?? null,
    }));
}
export function readAnalystTraceForInternalDiagnostics(conversationId: string): AnalystTraceEnvelope | undefined { return latestByConversation.get(conversationId); }
export interface AnalystRuntimeMetrics {
  readonly sampledTurns: number;
  readonly modelTurns: number;
  readonly fallbackTurns: number;
  readonly selectedQuestionTurns: number;
  readonly noQuestionTurns: number;
  readonly rejectedSignalCount: number;
  readonly modeCounts: Readonly<Record<AnalystTraceEnvelope["trace"]["mode"], number>>;
}
export function readAnalystRuntimeMetricsForInternalDiagnostics(): AnalystRuntimeMetrics {
  const events = [...recentEvents.values()];
  const modeCounts: Record<AnalystTraceEnvelope["trace"]["mode"], number> = { OFF: 0, SHADOW: 0, QUESTION_INPUT: 0, EXPLICIT_FACTS_AND_QUESTIONS: 0 };
  for (const event of events) modeCounts[event.trace.mode] += 1;
  return {
    sampledTurns: events.length,
    modelTurns: events.filter((event) => event.trace.origin === "MODEL").length,
    fallbackTurns: events.filter((event) => event.trace.origin === "BOUNDED_FALLBACK").length,
    selectedQuestionTurns: events.filter((event) => event.trace.selectedQuestionKey !== undefined).length,
    noQuestionTurns: events.filter((event) => event.trace.noQuestionReason !== undefined).length,
    rejectedSignalCount: events.reduce((total, event) => total + event.trace.rejectedExplicitFacts.length + event.trace.rejectedHypotheses.length, 0),
    modeCounts,
  };
}
export function resetAnalystTraceStoreForTests(): void { latestByConversation.clear(); recentEvents.clear(); }
