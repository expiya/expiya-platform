import { describe, expect, it, vi } from "vitest";
import { InMemoryV2ConversationStore } from "./store";
import { runCarsDecisionTurnV2 } from "./runCarsDecisionTurnV2";
import type { DecisionTurnV2Input, V2TurnStages } from "./types";
const turn = (overrides: Partial<DecisionTurnV2Input> = {}): DecisionTurnV2Input => ({ conversationId: "conversation", messageId: "message-1", idempotencyKey: "key-1", expectedConversationRevision: 0, userMessage: "Hadi seçelim", requestTime: "2026-08-19T00:00:00.000Z", ...overrides });
const action = { nextState: "READY", nextAction: { type: "ANSWER_DIRECTLY" }, directAnswerObligation: null, materialQuestion: null, shortlistIntent: null, explanationFactIds: [], prohibitedClaims: [], policyTrace: { policyId: "test", policyVersion: "1", matchedRule: "test", questionUtilities: [] } } as const;
const stages = (catalogStatus: "READY" | "UNAVAILABLE" = "READY"): V2TurnStages => ({
  loadCatalog: vi.fn(async ({ now }) => catalogStatus === "READY" && now.getTime() >= new Date("2026-08-18T23:00:00.000Z").getTime()
    ? ({ status: "READY", snapshot: { authority: { releaseVersion: "0.55.0", catalogFingerprint: "catalog" } } } as never)
    : ({ status: "UNAVAILABLE" as const, reason: "NOT_YET_EFFECTIVE" as const, diagnostics: [] })),
  interpret: vi.fn(async () => ({ result: { acts: [] }, acceptedConstraintMutations: [], acceptedBudgetMutations: [], acceptedPersonaMutations: [], diagnostics: [] } as never)),
  createEvents: vi.fn(() => []),
  reduceMemory: vi.fn(() => ({ state: "READY" } as never)),
  evaluate: vi.fn(async () => ({ action, candidateSummary: { count: 11, basis: "ACTIVE_DECISION_COHORT" as const, label: "11 aktif seçenek kaldı." }, facts: [] })),
  realize: vi.fn(async () => ({ message: "Karar hazır.", source: "MODEL" as const })),
});
describe("single V2 turn orchestrator", () => {
  it("preserves the temporal blocker at August 16 and is ready after effective time", async () => { const unavailable = await runCarsDecisionTurnV2(turn({ requestTime: "2026-08-16T00:00:00.000Z" }), { store: new InMemoryV2ConversationStore(), stages: stages() }); expect(unavailable).toMatchObject({ recoverableStatus: "CATALOG_UNAVAILABLE", revision: 0 }); const ready = await runCarsDecisionTurnV2(turn(), { store: new InMemoryV2ConversationStore(), stages: stages() }); expect(ready).toMatchObject({ revision: 1, message: "Karar hazır.", candidateSummary: { count: 11, label: "11 aktif seçenek kaldı." }, cards: [] }); });
  it("returns the same result for same message payload and rejects changed payload", async () => { const store = new InMemoryV2ConversationStore(); const pipeline = stages(); const first = await runCarsDecisionTurnV2(turn(), { store, stages: pipeline }); const replay = await runCarsDecisionTurnV2(turn(), { store, stages: pipeline }); expect(replay).toEqual(first); expect(pipeline.interpret).toHaveBeenCalledTimes(1); await expect(runCarsDecisionTurnV2(turn({ userMessage: "different" }), { store, stages: pipeline })).rejects.toMatchObject({ code: "MESSAGE_PAYLOAD_CONFLICT" }); });
  it("ignores a historical revealed-offer token during a later preference turn", async () => {
    const pipeline = { ...stages(), authorizeCards: vi.fn(async () => { throw new Error("STALE_OFFER_TOKEN_MUST_NOT_BE_PROJECTED"); }) };
    const output = await runCarsDecisionTurnV2(turn({ userMessage: "BMW olsun", offerToken: "historical-revealed-token" }), { store: new InMemoryV2ConversationStore(), stages: pipeline });
    expect(output.cards).toEqual([]);
    expect(pipeline.authorizeCards).not.toHaveBeenCalled();
  });
});
