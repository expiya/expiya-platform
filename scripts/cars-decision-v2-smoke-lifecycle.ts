export type SmokePhase = "SETUP" | "INTERPRETATION" | "DECISION" | "REALIZATION" | "ASSERTION" | "CONSENT" | "REVEAL";
export type SmokeJourney<T> = { readonly name: string; readonly run: (context: { setPhase(phase: SmokePhase, turn?: number): void }) => Promise<T> };
export type SmokeProtocolWriter = (record: Readonly<Record<string, unknown>>) => Promise<void>;
export function createMutableSmokeClock(initial: string) { let current = new Date(initial); if (!Number.isFinite(current.getTime())) throw new TypeError("INVALID_SMOKE_CLOCK"); return Object.freeze({ now: () => current, set(value: string) { const next = new Date(value); if (!Number.isFinite(next.getTime())) throw new TypeError("INVALID_SMOKE_CLOCK"); current = next; } }); }

class GlobalSmokeTimeout extends Error { constructor() { super("GLOBAL_TIMEOUT"); this.name = "GlobalSmokeTimeout"; } }
export class LabeledSmokeAssertionError extends Error { constructor(readonly code: string) { super(code); this.name = "LabeledSmokeAssertionError"; } }
export function assertSmoke(condition: unknown, code: string): asserts condition { if (!condition) throw new LabeledSmokeAssertionError(code); }

export function classifySmokeFailure(error: unknown): { readonly errorClass: string; readonly errorCode: string } {
  if (error instanceof GlobalSmokeTimeout) return { errorClass: "TIMEOUT", errorCode: "GLOBAL_TIMEOUT" };
  if (error instanceof LabeledSmokeAssertionError) return { errorClass: "ASSERTION", errorCode: error.code };
  if (error instanceof Error && error.name === "AssertionError") return { errorClass: "ASSERTION", errorCode: "ASSERTION_FAILED" };
  if (error instanceof Error && /timeout/iu.test(error.name)) return { errorClass: "TRANSPORT", errorCode: "PROVIDER_TIMEOUT" };
  if (error instanceof Error && /429|rate.?limit/iu.test(error.message)) return { errorClass: "PROVIDER", errorCode: "PROVIDER_RATE_LIMITED" };
  return { errorClass: "PROVIDER_OR_PIPELINE", errorCode: "BOUNDED_SMOKE_FAILED" };
}

export async function writeJsonLine(stream: NodeJS.WritableStream, record: Readonly<Record<string, unknown>>): Promise<void> {
  await new Promise<void>((resolve, reject) => stream.write(`${JSON.stringify(record)}\n`, (error?: Error | null) => error ? reject(error) : resolve()));
}

export async function runBoundedSmoke<T>(input: { readonly runId: string; readonly journeys: readonly SmokeJourney<T>[]; readonly timeoutMs: number; readonly write: SmokeProtocolWriter }): Promise<{ readonly ok: boolean; readonly completedJourneys: number; readonly summaries: readonly T[] }> {
  let completedJourneys = 0; let activeJourney = "SETUP"; let activeTurn = 0; let activePhase: SmokePhase = "SETUP"; const summaries: T[] = [];
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new GlobalSmokeTimeout()), input.timeoutMs); });
  const execute = async () => {
    for (const journey of input.journeys) {
      activeJourney = journey.name; activeTurn = 0; activePhase = "SETUP";
      await input.write({ type: "JOURNEY_STARTED", runId: input.runId, journey: activeJourney, completedJourneys });
      const summary = await journey.run({ setPhase(phase, turn = activeTurn) { activePhase = phase; activeTurn = turn; } });
      summaries.push(summary); completedJourneys += 1;
      await input.write({ type: "JOURNEY_COMPLETED", runId: input.runId, journey: activeJourney, status: "PASS", completedJourneys, summary });
    }
  };
  try {
    await Promise.race([execute(), timeout]);
    await input.write({ type: "RUN_COMPLETED", runId: input.runId, status: "PASS", completedJourneys });
    return { ok: true, completedJourneys, summaries };
  } catch (error) {
    const classified = classifySmokeFailure(error);
    await input.write({ type: "RUN_FAILED", runId: input.runId, journey: activeJourney, turn: activeTurn, phase: activePhase, ...classified, completedJourneys });
    return { ok: false, completedJourneys, summaries };
  } finally { if (timer) clearTimeout(timer); }
}
