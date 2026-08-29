import { afterEach, describe, expect, it, vi } from "vitest";
import { createDecisionNeutralityFingerprint, reconcileQuestionInput, resolveAnalystMode, runV3TurnWithAnalyst, shouldSampleShadow, type AnalystTraceEnvelope } from "./shadowRuntime.server";
import type { QuestionPlanningResult } from "./planner";
import { analyzeSemanticNeedsFallback } from "./fallback";
import { evaluateV3Catalog, rankV3Candidates } from "../catalogAdapter.server";

const priorProviderDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
const priorQuestionReady = process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY;
const priorExplicitReady = process.env.CARS_SEMANTIC_ANALYST_EXPLICIT_FACTS_READY;
afterEach(() => {
  if (priorProviderDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorProviderDisabled;
  if (priorQuestionReady === undefined) delete process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY; else process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY = priorQuestionReady;
  if (priorExplicitReady === undefined) delete process.env.CARS_SEMANTIC_ANALYST_EXPLICIT_FACTS_READY; else process.env.CARS_SEMANTIC_ANALYST_EXPLICIT_FACTS_READY = priorExplicitReady;
});
describe("OFF/SHADOW decision neutrality", () => {
  it("samples SHADOW conversations deterministically and fails closed for invalid rates", () => {
    expect(shouldSampleShadow("conversation", "0")).toBe(false);
    expect(shouldSampleShadow("conversation", "1")).toBe(true);
    expect(shouldSampleShadow("conversation", "invalid")).toBe(false);
    expect(shouldSampleShadow("conversation", "0.25")).toBe(shouldSampleShadow("conversation", "0.25"));
  });
  it("defaults and rolls back safely to OFF for missing or invalid mode", () => {
    expect(resolveAnalystMode(undefined)).toBe("OFF"); expect(resolveAnalystMode("INVALID")).toBe("OFF"); expect(resolveAnalystMode("SHADOW")).toBe("SHADOW");
  });
  it("downgrades advanced modes unless their independent readiness locks are open", () => {
    delete process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY; delete process.env.CARS_SEMANTIC_ANALYST_EXPLICIT_FACTS_READY;
    expect(resolveAnalystMode("QUESTION_INPUT")).toBe("SHADOW"); expect(resolveAnalystMode("EXPLICIT_FACTS_AND_QUESTIONS")).toBe("SHADOW");
    process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY = "true";
    expect(resolveAnalystMode("QUESTION_INPUT")).toBe("QUESTION_INPUT"); expect(resolveAnalystMode("EXPLICIT_FACTS_AND_QUESTIONS")).toBe("QUESTION_INPUT");
    process.env.CARS_SEMANTIC_ANALYST_EXPLICIT_FACTS_READY = "true";
    expect(resolveAnalystMode("EXPLICIT_FACTS_AND_QUESTIONS")).toBe("EXPLICIT_FACTS_AND_QUESTIONS");
  });
  it("OFF does not call the analyst", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true"; const provider = vi.fn();
    await runV3TurnWithAnalyst({ conversationId: "off", messageId: "m1", message: "Şehir içinde SUV arıyorum", expectedRevision: 0, analystMode: "OFF", analystProvider: provider as never });
    expect(provider).not.toHaveBeenCalled();
  });
  it("cannot enter QUESTION_INPUT through a direct argument while the readiness lock is closed", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true"; delete process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY; let envelope: AnalystTraceEnvelope | undefined;
    await runV3TurnWithAnalyst({ conversationId: "locked-question-input", messageId: "m1", message: "Şehir içinde araç arıyorum", expectedRevision: 0, analystMode: "QUESTION_INPUT", analystProvider: async (value) => analyzeSemanticNeedsFallback(value), onAnalystTrace: (value) => { envelope = value; } });
    expect(envelope?.trace.mode).toBe("SHADOW");
  });
  it("SHADOW keeps public response, ledger, question, candidates and offer behavior contract-identical", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true"; const request = { messageId: "m1", message: "Köyde kullanacağım, bozuk ve stabilize yollarda araç arıyorum", expectedRevision: 0 } as const;
    const off = await runV3TurnWithAnalyst({ conversationId: "neutral-off", ...request, analystMode: "OFF" }); let envelope: AnalystTraceEnvelope | undefined;
    const shadow = await runV3TurnWithAnalyst({ conversationId: "neutral-shadow", ...request, analystMode: "SHADOW", analystProvider: async (analystInput) => analyzeSemanticNeedsFallback(analystInput), onAnalystTrace: (value) => { envelope = value; } });
    const normalize = (value: typeof off) => ({ ...value, state: { ...value.state, conversationId: "neutral", processedMessages: {} } });
    expect(normalize(shadow)).toEqual(normalize(off)); expect(envelope?.trace.mode).toBe("SHADOW"); expect(envelope?.trace.acceptedHypotheses).toContain("groundClearanceNeed");
    expect(await createDecisionNeutralityFingerprint(shadow)).toBe(await createDecisionNeutralityFingerprint(off));
    expect(JSON.stringify(shadow)).not.toMatch(/acceptedHypotheses|questionEvaluations|decisionNeutralityFingerprint|semanticNeedsAnalysis/iu);
  });
  it("keeps analysis conversation-scoped without inheritance", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true"; const traces: AnalystTraceEnvelope[] = [];
    await runV3TurnWithAnalyst({ conversationId: "scope-a", messageId: "m1", message: "Köyde stabilize yolda kullanacağım", expectedRevision: 0, analystMode: "SHADOW", analystProvider: async (value) => analyzeSemanticNeedsFallback(value), onAnalystTrace: (value) => traces.push(value) });
    await runV3TurnWithAnalyst({ conversationId: "scope-b", messageId: "m1", message: "Merhaba", expectedRevision: 0, analystMode: "SHADOW", analystProvider: async (value) => analyzeSemanticNeedsFallback(value), onAnalystTrace: (value) => traces.push(value) });
    expect(traces[0]?.trace.acceptedExplicitFacts).toContain("roadCondition"); expect(traces[1]?.trace.acceptedExplicitFacts).toEqual([]);
  });
  it("lets the deterministic planner replace only an already-material V3 question", () => {
    const output = { kind: "V3_CONVERSATION" as const, message: "Yakıt sorusu", state: { version: "3.8" as const, conversationId: "q", revision: 1, processedMessages: {}, purchaseIntent: "ACTIVE_DISCOVERY" as const, intentObservationTurns: 1, ledger: [], askedQuestionKeys: ["fuelType"], lastQuestionKey: "fuelType", ended: false } };
    const planning: QuestionPlanningResult = { selectedQuestion: { key: "planner:bodyStyle", concept: "bodyStyleReference", kind: "MATERIAL_DECISION_QUESTION", text: "body", reliability: 1, partitions: [] }, evaluatedCandidates: [] };
    const reconciled = reconcileQuestionInput(output, planning);
    expect(reconciled.state.lastQuestionKey).toBe("bodyStyle"); expect(reconciled.state.askedQuestionKeys).toEqual(["bodyStyle"]); expect(reconciled.message).toContain("Park kolaylığı");
    expect(reconcileQuestionInput({ ...output, offerAwaitingConsent: true }, planning)).toEqual({ ...output, offerAwaitingConsent: true });
  });
  it("never replaces the required passenger-capacity question with a generic discriminator", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY = "true";
    const output = await runV3TurnWithAnalyst({
      conversationId: "school-service-capacity",
      messageId: "m1",
      message:
        "Okul servisçiliği yapıyorum. Acilen daha fazla yolcu kapasiteli bir araca ihtiyacım var.",
      expectedRevision: 0,
      analystMode: "QUESTION_INPUT",
      analystProvider: async (value) => analyzeSemanticNeedsFallback(value),
    });
    expect(output.state.lastQuestionKey).toBe("passengerCapacity");
    expect(output.message).toMatch(/toplam kaç kişilik/iu);
    expect(output.message).not.toMatch(/park kolaylığı|ferah ve yüksek/iu);
  });
  it("projects governed model facts before candidate and question planning in explicit mode", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY = "true";
    process.env.CARS_SEMANTIC_ANALYST_EXPLICIT_FACTS_READY = "true";
    const message = "Öğrenci taşıma amaçlı sıfır araç arıyorum.";
    const output = await runV3TurnWithAnalyst({
      conversationId: "explicit-projection-runtime",
      messageId: "m1",
      message,
      expectedRevision: 0,
      analystMode: "EXPLICIT_FACTS_AND_QUESTIONS",
      analystProvider: async () => ({
        version: "1.0",
        origin: "MODEL",
        sourceMessageId: "m1",
        conversationRevision: 0,
        explicitFacts: [
          {
            concept: "primaryUsage",
            normalizedValue: "PASSENGER_TRANSPORT",
            sourceSpan: { start: 0, end: message.length, text: message },
            confidence: 0.99,
            explicitness: "USER_EXPLICIT",
            confirmationRequired: false,
          },
        ],
        hypotheses: [],
        unknowns: [],
        corrections: [],
      }),
    });
    expect(output.state.ledger.some((item) => item.id.includes(":analyst:primaryUsage:"))).toBe(true);
    expect(output.state.ledger.filter((item) => item.concept === "primaryUsage")).toHaveLength(1);
    expect(output.state.lastQuestionKey).toBe("passengerCapacity");
    expect(output.message).toMatch(/toplam kaç kişilik/iu);
    expect(JSON.stringify(output)).not.toMatch(/acceptedExplicitFacts|questionEvaluations|decisionNeutralityFingerprint/iu);
  });
  it("uses model-only passenger intent and a written capacity without asking either again", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY = "true";
    process.env.CARS_SEMANTIC_ANALYST_EXPLICIT_FACTS_READY = "true";
    const message = "Sekiz kişiyi aynı rota üzerinde götüreceğim bir sıfır araç arıyorum.";
    const output = await runV3TurnWithAnalyst({
      conversationId: "explicit-written-passenger-capacity",
      messageId: "m1", message, expectedRevision: 0,
      analystMode: "EXPLICIT_FACTS_AND_QUESTIONS",
      analystProvider: async () => ({
        version: "1.0", origin: "MODEL", sourceMessageId: "m1", conversationRevision: 0,
        explicitFacts: [
          { concept: "primaryUsage", normalizedValue: "PASSENGER_TRANSPORT", sourceSpan: { start: 0, end: message.length, text: message }, confidence: 0.99, explicitness: "USER_EXPLICIT", confirmationRequired: false },
          { concept: "passengerCapacity", normalizedValue: 8, sourceSpan: { start: 0, end: message.length, text: message }, confidence: 0.99, explicitness: "USER_EXPLICIT", confirmationRequired: false },
        ],
        hypotheses: [], unknowns: [], corrections: [],
      }),
    });
    expect(output.state.ledger).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: expect.stringContaining(":analyst:primaryUsage:"), normalizedValue: "PASSENGER_TRANSPORT" }),
      expect.objectContaining({ id: expect.stringContaining(":analyst:minimumSeats:"), normalizedValue: 8 }),
    ]));
    expect(output.state.ledger.filter((item) => item.concept === "primaryUsage")).toHaveLength(1);
    expect(output.state.lastQuestionKey).not.toBe("passengerCapacity");
    expect(output.message).not.toMatch(/toplam kaç kişilik/iu);
  });
  it("changes only the material question while preserving candidates and rank order in QUESTION_INPUT", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true"; process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY = "true";
    const turn = { messageId: "m1", message: "Uzun yolda kullanacağım bir araç arıyorum.", expectedRevision: 0 } as const;
    const off = await runV3TurnWithAnalyst({ conversationId: "question-authority-off", ...turn, analystMode: "OFF" });
    const questionInput = await runV3TurnWithAnalyst({ conversationId: "question-authority-on", ...turn, analystMode: "QUESTION_INPUT", analystProvider: async (value) => analyzeSemanticNeedsFallback(value) });
    expect(off.state.lastQuestionKey).toBe("fuelType"); expect(questionInput.state.lastQuestionKey).toBe("bodyStyle"); expect(questionInput.state.ledger).toEqual(off.state.ledger);
    const offCatalog = await evaluateV3Catalog(off.state.ledger, undefined, off.state.budgetMode); const questionCatalog = await evaluateV3Catalog(questionInput.state.ledger, undefined, questionInput.state.budgetMode);
    expect(questionCatalog.variants.map((item) => item.id)).toEqual(offCatalog.variants.map((item) => item.id));
    expect(rankV3Candidates(questionCatalog.variants, questionInput.state.ledger, questionInput.state.budgetMode).map((item) => item.id)).toEqual(rankV3Candidates(offCatalog.variants, off.state.ledger, off.state.budgetMode).map((item) => item.id));
    expect(questionInput.state.pendingOffer).toBeUndefined(); expect(questionInput.recommendations).toBeUndefined();
  });
});
