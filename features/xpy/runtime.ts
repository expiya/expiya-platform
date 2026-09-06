import { XPY_PROTOCOL_VERSION, type XpyPublicOutcome, type XpyTurnInput } from "./contracts";

export type XpyPreflight = "NEW" | "REPLAY" | "PAYLOAD_CONFLICT" | "REVISION_CONFLICT";

/**
 * Shared execution spine used by every active XPY route. Persistence remains a
 * Domain Pack adapter concern while schemas differ; this spine fixes phase order.
 */
export interface XpyTurnPort<Recovered, X, Validated, P, Y, Committed, PublicPayload> {
  preflight(input: XpyTurnInput<Recovered>): Promise<XpyPreflight>;
  replay(input: XpyTurnInput<Recovered>): Promise<XpyPublicOutcome<PublicPayload>>;
  interpretX(input: XpyTurnInput<Recovered>): Promise<X>;
  validate(input: XpyTurnInput<Recovered>, proposal: X): Promise<Validated>;
  planP(input: XpyTurnInput<Recovered>, validated: Validated): Promise<P>;
  decideY(input: XpyTurnInput<Recovered>, validated: Validated, plan: P): Promise<Y>;
  commit(input: XpyTurnInput<Recovered>, validated: Validated, plan: P, decision: Y): Promise<Committed>;
  project(input: XpyTurnInput<Recovered>, committed: Committed): Promise<XpyPublicOutcome<PublicPayload>>;
  conflict(kind: "PAYLOAD_CONFLICT" | "REVISION_CONFLICT"): XpyPublicOutcome<PublicPayload>;
}

export async function executeXpyTurn<Recovered, X, Validated, P, Y, Committed, PublicPayload>(input: XpyTurnInput<Recovered>, port: XpyTurnPort<Recovered, X, Validated, P, Y, Committed, PublicPayload>): Promise<XpyPublicOutcome<PublicPayload>> {
  if (input.protocolVersion !== XPY_PROTOCOL_VERSION) throw new TypeError("XPY_PROTOCOL_VERSION_UNSUPPORTED");
  const preflight = await port.preflight(input);
  if (preflight === "REPLAY") return port.replay(input);
  if (preflight === "PAYLOAD_CONFLICT" || preflight === "REVISION_CONFLICT") return port.conflict(preflight);
  const proposal = await port.interpretX(input);
  const validated = await port.validate(input, proposal);
  const plan = await port.planP(input, validated);
  const decision = await port.decideY(input, validated, plan);
  const committed = await port.commit(input, validated, plan, decision);
  return port.project(input, committed);
}

