import { describe, expect, it, vi } from "vitest";
import { XPY_PROTOCOL_VERSION } from "./contracts";
import { executeXpyTurn } from "./runtime";

describe("XPY execution order", () => {
  it("runs X -> validation -> P -> Y -> one commit -> projection", async () => {
    const calls: string[] = [];
    const fn = <T>(name: string, value: T) => vi.fn(async () => { calls.push(name); return value; });
    const outcome = await executeXpyTurn({ protocolVersion: XPY_PROTOCOL_VERSION, domainPackId: "test", conversationId: "c", messageId: "m", expectedRevision: 0, message: "hello" }, {
      preflight: fn("preflight", "NEW" as const), replay: fn("replay", undefined as never), interpretX: fn("X", {}), validate: fn("validate", {}), planP: fn("P", {}), decideY: fn("Y", {}), commit: fn("commit", {}),
      project: fn("project", { protocolVersion: XPY_PROTOCOL_VERSION, kind: "RESPOND" as const, conversationId: "c", revision: 1, payload: {}, authority: [] }), conflict: () => { throw new Error("conflict"); },
    });
    expect(calls).toEqual(["preflight", "X", "validate", "P", "Y", "commit", "project"]);
    expect(outcome.kind).toBe("RESPOND");
  });
});
