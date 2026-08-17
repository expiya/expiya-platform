import { describe, expect, it } from "vitest";
import { validatePublicDecisionTurnOutput } from "./publicOutput";
const output = { conversationId: "c", revision: 1, state: "READY", message: "Öneri hazır.", options: [], cards: [] } as const;
describe("public V2 output leakage boundary", () => { it("accepts a minimal public-safe result", () => expect(validatePublicDecisionTurnOutput(output)).toEqual([])); it("rejects internal trace language and recursively forbidden keys", () => { expect(validatePublicDecisionTurnOutput({ ...output, message: "Internal estimate trace hazır.", cards: [{ variantId: "v", title: "x", caveats: [], trace: [] }] } as never)).toEqual(expect.arrayContaining(["INTERNAL_LANGUAGE", "FORBIDDEN_KEY:trace"])); }); });
