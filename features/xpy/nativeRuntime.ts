import { preflightTurn } from "@/features/conversation-kernel/lifecycle";
import { assertXpyRuntimeBinding, type XpyRuntimeBinding } from "./runtimeContract";

export type XpyNativePreflight = ReturnType<typeof preflightTurn>;

export interface XpyTransactionSnapshot<State, Outcome> {
  readonly state: State;
  readonly replay?: { readonly payloadFingerprint: string; readonly state: State; readonly outcome: Outcome };
}

export interface XpyAssistantPort<State, Proposal> {
  interpret(state: State): Promise<Proposal> | Proposal;
}

export interface XpyValidationPort<State, Proposal, Validated> {
  validate(state: State, proposal: Proposal): Promise<Validated> | Validated;
}

export interface XpyPlannerPort<State, Validated, Plan> {
  plan(state: State, validated: Validated): Promise<Plan> | Plan;
}

export interface XpyDecisionPort<State, Validated, Plan, Decision> {
  decide(state: State, validated: Validated, plan: Plan): Promise<Decision> | Decision;
}

export interface XpyTransactionPort<State extends { readonly revision: number }, Event, Outcome, Result> {
  load(): Promise<XpyTransactionSnapshot<State, Outcome> | null>;
  authorityMatches(state: State): boolean;
  commit(input: { readonly expectedRevision: number; readonly messageId: string; readonly payloadFingerprint: string; readonly state: State; readonly events: readonly Event[]; readonly outcome: Outcome }): Promise<Result>;
}

export interface XpyNativeTurnPort<State extends { readonly revision: number }, Proposal, Validated, Plan, Event, Outcome, Result> {
  readonly runtime: XpyRuntimeBinding;
  readonly expectedRevision: number;
  readonly messageId: string;
  readonly payloadFingerprint: string;
  readonly transaction: XpyTransactionPort<State, Event, Outcome, Result>;
  readonly x: XpyAssistantPort<State, Proposal>;
  readonly validation: XpyValidationPort<State, Proposal, Validated>;
  readonly p: XpyPlannerPort<State, Validated, Plan>;
  readonly y: XpyDecisionPort<State, Validated, Plan, { readonly state: State; readonly events: readonly Event[]; readonly outcome: Outcome } | Result>;
  withoutY?(state: State, validated: Validated, plan: Plan): Promise<{ readonly state: State; readonly events: readonly Event[]; readonly outcome: Outcome } | undefined> | { readonly state: State; readonly events: readonly Event[]; readonly outcome: Outcome } | undefined;
  isTerminalResult(value: unknown): boolean;
  replay(snapshot: NonNullable<XpyTransactionSnapshot<State, Outcome>["replay"]>): Result;
  unavailable(): Result;
  payloadConflict(): Result;
  revisionConflict(): Result;
  authorityMismatch(): Result;
}

/** The sole native XPY transaction lifecycle. X/P/Y never commit independently. */
export async function executeNativeXpyTurn<State extends { readonly revision: number }, Proposal, Validated, Plan, Event, Outcome, Result>(port: XpyNativeTurnPort<State, Proposal, Validated, Plan, Event, Outcome, Result>): Promise<Result> {
  assertXpyRuntimeBinding(port.runtime);
  const loaded = await port.transaction.load();
  if (!loaded) return port.unavailable();
  const preflight = preflightTurn({ expectedRevision: port.expectedRevision, currentRevision: loaded.state.revision, priorPayloadFingerprint: loaded.replay?.payloadFingerprint, payloadFingerprint: port.payloadFingerprint });
  if (preflight.kind === "REPLAY") return port.replay(loaded.replay!);
  if (preflight.kind === "PAYLOAD_CONFLICT") return port.payloadConflict();
  if (preflight.kind === "REVISION_CONFLICT") return port.revisionConflict();
  if (!port.transaction.authorityMatches(loaded.state)) return port.authorityMismatch();
  const proposal = await port.x.interpret(loaded.state);
  const validated = await port.validation.validate(loaded.state, proposal);
  const plan = await port.p.plan(loaded.state, validated);
  const withoutY = await port.withoutY?.(loaded.state, validated, plan);
  if (withoutY) return port.transaction.commit({ expectedRevision: loaded.state.revision, messageId: port.messageId, payloadFingerprint: port.payloadFingerprint, ...withoutY });
  const decision = await port.y.decide(loaded.state, validated, plan);
  if (port.isTerminalResult(decision)) return decision as Result;
  const mutation = decision as { readonly state: State; readonly events: readonly Event[]; readonly outcome: Outcome };
  return port.transaction.commit({ expectedRevision: loaded.state.revision, messageId: port.messageId, payloadFingerprint: port.payloadFingerprint, ...mutation });
}
