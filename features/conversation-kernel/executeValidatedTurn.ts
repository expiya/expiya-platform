import { executeNativeXpyTurn } from "@/features/xpy/nativeRuntime";
import type { XpyRuntimeBinding } from "@/features/xpy/runtimeContract";

export interface StoredTurn<State, Outcome> {
  readonly payloadFingerprint: string;
  readonly outcome: Outcome;
  readonly state: State;
}

export interface ExecuteValidatedTurnPort<State extends { readonly revision: number }, Proposal, Event, Outcome, Result> {
  readonly runtime: XpyRuntimeBinding;
  readonly expectedRevision: number;
  readonly messageId: string;
  readonly payloadFingerprint: string;
  load(): Promise<{ readonly state: State; readonly replay?: StoredTurn<State, Outcome> } | null>;
  authorityMatches(state: State): boolean;
  propose(state: State): readonly Proposal[];
  validate(proposals: readonly Proposal[]): { readonly kind: "VALID"; readonly proposals: readonly Proposal[] } | { readonly kind: "INVALID" };
  reduce(state: State, proposals: readonly Proposal[]): { readonly state: State; readonly events: readonly Event[]; readonly outcome: Outcome } | { readonly kind: "INVALID" } | Result;
  isResult(value: unknown): boolean;
  commit(input: { readonly expectedRevision: number; readonly messageId: string; readonly payloadFingerprint: string; readonly state: State; readonly events: readonly Event[]; readonly outcome: Outcome }): Promise<Result>;
  unavailable(): Result;
  payloadConflict(): Result;
  revisionConflict(): Result;
  authorityMismatch(): Result;
  invalid(): Result;
  replay(stored: StoredTurn<State, Outcome>): Result;
  withoutDecision?(state: State): { readonly state: State; readonly events: readonly Event[]; readonly outcome: Outcome } | undefined;
}

export async function executeValidatedTurn<State extends { readonly revision: number }, Proposal, Event, Outcome, Result>(port: ExecuteValidatedTurnPort<State, Proposal, Event, Outcome, Result>): Promise<Result> {
  type Validation = ReturnType<typeof port.validate>;
  type Plan = Validation;
  return executeNativeXpyTurn<State, readonly Proposal[], Validation, Plan, Event, Outcome, Result>({
    runtime: port.runtime,
    expectedRevision: port.expectedRevision, messageId: port.messageId, payloadFingerprint: port.payloadFingerprint,
    transaction: { load: port.load, authorityMatches: port.authorityMatches, commit: port.commit },
    x: { interpret: state => port.propose(state) },
    validation: { validate: (_state, proposals) => port.validate(proposals) },
    p: { plan: (_state, validated) => validated },
    withoutY: state => port.withoutDecision?.(state),
    y: { decide: (state, _validated, plan) => {
      if (plan.kind !== "VALID") return port.invalid();
      const reduced = port.reduce(state, plan.proposals);
      if (port.isResult(reduced)) return reduced as Result;
      if (typeof reduced === "object" && reduced !== null && "kind" in reduced) return port.invalid();
      return reduced as { readonly state: State; readonly events: readonly Event[]; readonly outcome: Outcome };
    } },
    isTerminalResult: port.isResult, replay: port.replay, unavailable: port.unavailable,
    payloadConflict: port.payloadConflict, revisionConflict: port.revisionConflict, authorityMismatch: port.authorityMismatch,
  });
}
