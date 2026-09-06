import { describe, expect, it, vi } from "vitest";
import { executeNativeXpyTurn } from "./nativeRuntime";
import { bindXpyRuntime } from "./runtimeContract";
import { requireXpyDomainPack } from "./domainPacks";

describe("native XPY transaction runtime", () => {
  it("orders X, validation, P, Y and exactly one commit", async () => {
    const order: string[] = [], step = <T>(name: string, result: T) => vi.fn(async () => { order.push(name); return result; });
    const commit = step("commit", { status: "OK" as const });
    await executeNativeXpyTurn({ runtime: bindXpyRuntime(requireXpyDomainPack("CARS"), "NEW_CAR"), expectedRevision: 0, messageId: "m", payloadFingerprint: "p", transaction: { load: step("load", { state: { revision: 0 } }), authorityMatches: () => true, commit }, x: { interpret: step("X", { raw: true }) }, validation: { validate: step("validation", { accepted: true }) }, p: { plan: step("P", { question: false }) }, y: { decide: step("Y", { state: { revision: 1 }, events: [], outcome: { kind: "RESPOND" } }) }, isTerminalResult: () => false, replay: () => ({ status: "OK" }), unavailable: () => ({ status: "UNAVAILABLE" }), payloadConflict: () => ({ status: "PAYLOAD_CONFLICT" }), revisionConflict: () => ({ status: "REVISION_CONFLICT" }), authorityMismatch: () => ({ status: "AUTHORITY_MISMATCH" }) });
    expect(order).toEqual(["load", "X", "validation", "P", "Y", "commit"]);
    expect(commit).toHaveBeenCalledOnce();
  });

  it("commits an X/P information response without invoking Y", async () => {
    const decide = vi.fn();
    const commit = vi.fn(async (input: { readonly events: readonly unknown[]; readonly outcome: { readonly kind: string } }) => ({ status: "OK" as const, input }));
    const result = await executeNativeXpyTurn({
      runtime: bindXpyRuntime(requireXpyDomainPack("CARS"), "NEW_CAR"),
      expectedRevision: 0,
      messageId: "information",
      payloadFingerprint: "information-payload",
      transaction: { load: async () => ({ state: { revision: 0 } }), authorityMatches: () => true, commit },
      x: { interpret: async () => ({ intent: "CATEGORY_GUIDANCE" as const }) },
      validation: { validate: async (_state, proposal) => proposal },
      p: { plan: async (_state, proposal) => proposal },
      withoutY: async () => ({ state: { revision: 1 }, events: [], outcome: { kind: "RESPOND" as const } }),
      y: { decide },
      isTerminalResult: () => false,
      replay: () => ({ status: "OK" as const }),
      unavailable: () => ({ status: "UNAVAILABLE" as const }),
      payloadConflict: () => ({ status: "PAYLOAD_CONFLICT" as const }),
      revisionConflict: () => ({ status: "REVISION_CONFLICT" as const }),
      authorityMismatch: () => ({ status: "AUTHORITY_MISMATCH" as const }),
    });
    expect(decide).not.toHaveBeenCalled();
    expect(commit).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ status: "OK", input: { events: [], outcome: { kind: "RESPOND" } } });
  });
});
