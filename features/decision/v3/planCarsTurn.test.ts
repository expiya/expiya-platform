import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createV3ConversationState } from "./engine.server";
import { planCarsTurn } from "./planCarsTurn.server";
import { prepareCarsTurn } from "./prepareCarsTurn.server";
import { resetV31StoreForTests, runStoredV31Turn } from "./store.server";
import type { CarsValidatedContext } from "./carsStages";

beforeAll(() => { process.env.CARS_V31_PROVIDER_DISABLED = "true"; });

describe("Cars P/Y stage seam", () => {
  it("plans an ordinary material question and owns its history transition", async () => {
    const context = await prepareCarsTurn(createV3ConversationState("plan-question"), { conversationId: "plan-question", messageId: "1", message: "Yeni araç satın almak istiyorum", expectedRevision: 0 });
    const plan = await planCarsTurn(context);
    expect(plan.kind).toBe("TERMINAL");
    if (plan.kind !== "TERMINAL") return;
    expect(plan.mutation.outcome.message).toContain("?");
    expect(plan.mutation.state.lastQuestionKey).toBe("primaryUsage");
    expect(plan.mutation.state.askedQuestionKeys).toContain("primaryUsage");
  });

  it("commits terminal P once and skips Y, including replay", async () => {
    resetV31StoreForTests();
    const prepare = vi.fn(async (state) => ({ state } as CarsValidatedContext));
    const terminalState = { ...createV3ConversationState("terminal-stage"), revision: 1, processedMessages: { "terminal-message": "owned-by-store" } };
    const outcome = { kind: "V3_CONVERSATION" as const, message: "Terminal P response", state: terminalState };
    const plan = vi.fn(async () => ({ kind: "TERMINAL" as const, mutation: { state: terminalState, outcome } }));
    const decide = vi.fn();
    const turn = { conversationId: "terminal-stage", messageId: "terminal-message", message: "Araç almak istiyorum", expectedRevision: 0, stages: { prepare, plan, decide } };
    const first = await runStoredV31Turn(turn);
    const replay = await runStoredV31Turn(turn);
    expect(first).toEqual(replay);
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(plan).toHaveBeenCalledTimes(1);
    expect(decide).not.toHaveBeenCalled();
  });

  it("invokes Y exactly once for a DECIDE plan", async () => {
    resetV31StoreForTests();
    const initial = createV3ConversationState("decide-stage");
    const context = { state: initial } as CarsValidatedContext;
    const next = { ...initial, revision: 1 };
    const outcome = { kind: "V3_CONVERSATION" as const, message: "Y outcome", state: next };
    const decide = vi.fn(async () => ({ state: next, outcome }));
    await runStoredV31Turn({ conversationId: "decide-stage", messageId: "decision-message", message: "Tek araç öner", expectedRevision: 0, stages: {
      prepare: vi.fn(async () => context),
      plan: vi.fn(async () => ({ kind: "DECIDE" as const, context, decision: { kind: "RUN_COMPATIBILITY_ADAPTER" as const } })),
      decide,
    } });
    expect(decide).toHaveBeenCalledTimes(1);
  });

  it("keeps Y structurally question-free", () => {
    const source = readFileSync(new URL("./engine.server.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/carsQuestionPolicy|selectCarsQuestion|recordAskedQuestion|preservePendingQuestion|ASK|CLARIFY/u);
  });
});
