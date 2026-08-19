import { describe, expect, it } from "vitest";
import { createHmacOfferSigner } from "../offer/signer.server";
import { InMemoryGovernedOfferStore } from "../offer/store";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import { loadActiveProductionSnapshotForTest } from "../catalog/productionSnapshotFixture.testSupport";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import type { NaturalRealizationModel } from "../realization/types";
import { createCarsDecisionV2ProductionComposition } from "./production.server";
const result = (messageId: string, acts: InterpretationResult["acts"], extra: Partial<InterpretationResult> = {}): InterpretationResult => ({ schemaVersion: 1, messageId, acts, directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [], ...extra });
const model = (results: Record<string, InterpretationResult>): StructuredInterpretationModel => ({ interpret: async (request) => results[request.messageId] });
const realizer: NaturalRealizationModel = { realize: async (request) => ({ message: request.action.type === "SOCIAL_REPLY" ? "Merhaba, araç seçimini birlikte netleştirebiliriz." : request.action.type === "REQUEST_REVEAL_CONSENT" ? "İhtiyaçlarına göre bir seçki hazırladım. Görmek ister misin?" : "Değerlendirmeyi güvenli biçimde tamamladım.", usedExplanationFactIds: [], mentionedCandidateIds: [], ...(request.materialQuestion ? { renderedQuestionId: request.materialQuestion.id } : {}) }) };
async function activeVariantCount() { const loaded = await loadActiveProductionSnapshotForTest(); if (loaded.status !== "READY") throw new Error("ACTIVE_CATALOG_NOT_READY"); return loaded.snapshot.variants.length; }
async function discoverAndOffer(conversationId: string, composition: ReturnType<typeof createCarsDecisionV2ProductionComposition>) {
  const turns = [
    ["recommendation", "Nasıl bir araba almalıyım karar veremiyorum."],
    ["skip-usage", "Fark etmez"],
    ["skip-body", "Fark etmez"],
    ["skip-fuel", "Fark etmez"],
    ["skip-transmission", "Fark etmez"],
    ["exclude-budget", "Bütçe önemli değil"],
  ] as const;
  let output;
  for (let index = 0; index < turns.length; index += 1) {
    const [messageId, userMessage] = turns[index]!;
    output = await runCarsDecisionTurnV2({ conversationId, messageId, idempotencyKey: messageId, expectedConversationRevision: index, userMessage, requestTime: `2026-08-20T00:0${index}:00.000Z` }, composition);
    if (index < turns.length - 1) expect(output.offer).toBeUndefined();
  }
  return output!;
}
describe("production V2 composition with real WP pipeline", () => {
  it("keeps a stated preferred budget attached to a one-turn recommendation", async () => {
    const traces: Readonly<Record<string, unknown>>[] = [];
    const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ budget: result("budget", ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST", "BUDGET_STATEMENT"], { directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }] }) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId: "preferred-budget-gap", messageId: "budget", idempotencyKey: "budget", expectedConversationRevision: 0, userMessage: "Araba almak istiyorum. Günlük kullanım, elektrikli, SUV, 1,5 milyon bütçem var.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(output.offer).toBeUndefined();
    expect(output.cards).toEqual([]);
    expect(traces.findLast((trace) => trace.phase === "DECISION")).toMatchObject({ availability: "READY", offerCreated: false });
    expect((traces.findLast((trace) => trace.phase === "DECISION")?.shortlistCandidateIds as readonly string[])).toContain("6157aea5-cda6-5784-8452-91db40fc7613");
  });
  it("runs greeting through real snapshot, reducer, full catalog evaluation, ranking and social action", async () => { const store = new InMemoryV2ConversationStore(); const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ greeting: result("greeting", ["GREETING"], { socialSignal: { kind: "GREETING" } }) }), realizer, shadow: true }); const output = await runCarsDecisionTurnV2({ conversationId: "composition-greeting", messageId: "greeting", idempotencyKey: "greeting", expectedConversationRevision: 0, userMessage: "Merhaba", requestTime: "2026-08-20T00:00:00.000Z" }, composition); expect(output).toMatchObject({ state: "SOCIAL", cards: [] }); expect(output.message).toContain("Merhaba"); expect((await store.load("composition-greeting"))?.memory?.events.some((event) => event.eventType === "SOCIAL_INTERACTION")).toBe(true); });
  it("does not answer an unasked how-are-you question and repairs the conversational mistake", async () => {
    const fallbackRealizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };
    const store = new InMemoryV2ConversationStore(); const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ hello: result("hello", ["GREETING"], { socialSignal: { kind: "GREETING" } }), repair: result("repair", ["SOCIAL_MESSAGE"], { socialSignal: { kind: "GENERAL" } }) }), realizer: fallbackRealizer, shadow: true });
    const hello = await runCarsDecisionTurnV2({ conversationId: "social-repair", messageId: "hello", idempotencyKey: "hello", expectedConversationRevision: 0, userMessage: "merhaba", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(hello.message).toBe("Merhaba! Hoş geldin."); expect(hello.message).not.toMatch(/iyiyim/iu);
    const repair = await runCarsDecisionTurnV2({ conversationId: "social-repair", messageId: "repair", idempotencyKey: "repair", expectedConversationRevision: 1, userMessage: "Ben sana nasılsın diye sormadım.", requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    expect(repair.message).toMatch(/haklısın.*sormadın.*hatalıydı/iu);
  });
  it("acknowledges first-car excitement and binds a bare daily answer to the open usage question", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ first: result("first", ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST"], { directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }] }), daily: result("daily", ["QUESTION_ANSWER"]) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const first = await runCarsDecisionTurnV2({ conversationId: "first-car-daily", messageId: "first", idempotencyKey: "first", expectedConversationRevision: 0, userMessage: "İyiyim, ilk arabamı almak için heyecanlıyım.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(first.message).toMatch(/hayırlı olsun|ilk araba heyecan/iu);
    expect(traces.filter((trace) => trace.phase === "DECISION").at(-1)).toMatchObject({ selectedQuestionKey: "discovery.usageScenario" });
    await runCarsDecisionTurnV2({ conversationId: "first-car-daily", messageId: "daily", idempotencyKey: "daily", expectedConversationRevision: 1, userMessage: "günlük", requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    const usageConstraints = (await store.load("first-car-daily"))!.memory!.events.filter((event) => event.eventType === "CONSTRAINT" && event.field === "usageScenario");
    expect(usageConstraints.at(-1)).toMatchObject({ normalizedValue: "URBAN_DAILY", status: "ACTIVE" });
    expect(traces.filter((trace) => trace.phase === "DECISION").at(-1)).toMatchObject({ selectedQuestionStage: "VEHICLE_ARCHITECTURE" });
  });
  it("acknowledges human context once without turning it into a vehicle constraint", async () => {
    const store = new InMemoryV2ConversationStore(); const values = { urgent: result("urgent", ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST"], { directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }] }), urgentAgain: result("urgentAgain", ["SOCIAL_MESSAGE"]) };
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model(values), realizer, shadow: true });
    const first = await runCarsDecisionTurnV2({ conversationId: "human-context-once", messageId: "urgent", idempotencyKey: "urgent", expectedConversationRevision: 0, userMessage: "Acil araba almam gerekiyor.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(first.message).toMatch(/aciliyeti anladım/iu); expect(first.options.length).toBeGreaterThan(0);
    const memoryAfterFirst = (await store.load("human-context-once"))!.memory!;
    expect(memoryAfterFirst.events.some((event) => event.eventType === "SOCIAL_INTERACTION" && event.humanContext === "URGENCY")).toBe(true);
    expect(memoryAfterFirst.events.some((event) => event.eventType === "CONSTRAINT" && event.sourceText.includes("Acil"))).toBe(false);
    const repeated = await runCarsDecisionTurnV2({ conversationId: "human-context-once", messageId: "urgentAgain", idempotencyKey: "urgentAgain", expectedConversationRevision: 1, userMessage: "Acil araba almam gerekiyor.", requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    expect(repeated.message).not.toMatch(/aciliyeti anladım/iu);
  });
  it("keeps a broad daily-use recommendation in discovery instead of creating an offer", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ greeting: result("greeting", ["GREETING"], { socialSignal: { kind: "GREETING" } }), daily: result("daily", ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST"], { directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }] }) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    await runCarsDecisionTurnV2({ conversationId: "daily-discovery", messageId: "greeting", idempotencyKey: "greeting", expectedConversationRevision: 0, userMessage: "merhaba", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    const output = await runCarsDecisionTurnV2({ conversationId: "daily-discovery", messageId: "daily", idempotencyKey: "daily", expectedConversationRevision: 1, userMessage: "günlük kullanım için iyi bir arabaya ihtiyacım var.", requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    expect(output.offer).toBeUndefined(); expect(output.cards).toEqual([]); expect(output.options.length).toBeGreaterThan(0);
    expect(traces.filter((trace) => trace.phase === "DECISION").at(-1)).toMatchObject({ recommendationReadiness: "NEEDS_MATERIAL_DISCRIMINATOR", action: "ASK_MATERIAL_QUESTION", selectedQuestionStage: "VEHICLE_ARCHITECTURE", selectedQuestionKey: "discovery.bodyStyle", materialQuestionCount: 1, offerCreated: false });
  });
  it("asks a conversation-local clarification for an ambiguous five-door expression", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ fiveDoor: result("fiveDoor", ["VEHICLE_INTENT", "USAGE_STATEMENT", "PREFERENCE_STATEMENT"]) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId: "five-door-recovery", messageId: "fiveDoor", idempotencyKey: "fiveDoor", expectedConversationRevision: 0, userMessage: "Günlük şehir içi kullanacağım, 5 kapılı bir araç olsun.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(output.options.map((option) => option.label)).toEqual(["Özellikle hatchback", "Beş kapılı SUV/crossover da olabilir"]);
    expect(traces.find((trace) => trace.phase === "DECISION")).toMatchObject({ action: "ASK_MATERIAL_QUESTION", selectedQuestionKey: "semanticRecovery.fiveDoorBodyStyle", selectedQuestionStage: "VEHICLE_ARCHITECTURE", offerCreated: false });
    expect((await store.load("five-door-recovery"))?.memory?.materialQuestionHistory.at(-1)).toMatchObject({ stableSemanticKey: "semanticRecovery.fiveDoorBodyStyle", field: "bodyStyle", answerStatus: "OPEN" });
  });
  it("binds economic-meaning recovery to running-cost ranking and advances the conversation", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ economic: result("economic", []), running: result("running", ["QUESTION_ANSWER"]) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const first = await runCarsDecisionTurnV2({ conversationId: "economic-running-cost", messageId: "economic", idempotencyKey: "economic", expectedConversationRevision: 0, userMessage: "Şehir içinde otomatik hibrit hatchback kullanacağım; bütçe önemli değil, ekonomik olsun.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(first.options.map((option) => option.label)).toEqual(["Satın alma fiyatı erişilebilir olsun", "Kullanım ve yakıt maliyeti düşük olsun"]);
    const second = await runCarsDecisionTurnV2({ conversationId: "economic-running-cost", messageId: "running", idempotencyKey: "running", expectedConversationRevision: 1, userMessage: "Kullanım ve yakıt maliyeti düşük olsun", requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    const memory = (await store.load("economic-running-cost"))!.memory!;
    expect(memory.events).toContainEqual(expect.objectContaining({ eventType: "CONSTRAINT", field: "runningCostPreference", normalizedValue: "LOW_RUNNING_COST", decisionEffect: "STRONG_RANK" }));
    expect(memory.materialQuestionHistory.find((item) => item.stableSemanticKey === "semanticRecovery.economicMeaning")?.answerStatus).toBe("ANSWERED");
    expect(traces.filter((trace) => trace.phase === "DECISION").at(-1)?.selectedQuestionKey).not.toBe("semanticRecovery.economicMeaning");
    expect(second.message).not.toBe("Değerlendirmeyi güvenli biçimde tamamladım.");
  });
  it("keeps the open budget question visible after an unrelated economic-preference correction", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ economic: result("economic", []), running: result("running", ["QUESTION_ANSWER"]), correction: result("correction", ["CORRECTION"]) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    await runCarsDecisionTurnV2({ conversationId: "economic-budget-continuity", messageId: "economic", idempotencyKey: "economic", expectedConversationRevision: 0, userMessage: "Şehir içinde günlük kullanacağım, otomatik benzinli hatchback bir araba istiyorum. Ekonomik olsun.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    await runCarsDecisionTurnV2({ conversationId: "economic-budget-continuity", messageId: "running", idempotencyKey: "running", expectedConversationRevision: 1, userMessage: "Kullanım ve yakıt maliyeti düşük olsun", requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    const third = await runCarsDecisionTurnV2({ conversationId: "economic-budget-continuity", messageId: "correction", idempotencyKey: "correction", expectedConversationRevision: 2, userMessage: "Düzeltme: satın alma fiyatını kastediyordum.", requestTime: "2026-08-20T00:02:00.000Z" }, composition);
    expect(traces.filter((trace) => trace.phase === "DECISION").at(-1)).toMatchObject({ action: "ASK_MATERIAL_QUESTION", selectedQuestionKey: "discovery.budget" });
    expect(third.message).toContain("Aşmak istemediğin yaklaşık bütçe nedir?");
    expect((await store.load("economic-budget-continuity"))!.memory!.materialQuestionHistory.filter((item) => item.stableSemanticKey === "discovery.budget" && item.answerStatus === "OPEN")).toHaveLength(1);
  });
  it("binds a bare amount to the open budget question and immediately creates the governed offer", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore();
    const interpreter: StructuredInterpretationModel = { interpret: async (request) => result(request.messageId, []) };
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter, realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T00:08:00.000Z") }), smokeObserver: (trace) => traces.push(trace) });
    const conversationId = "bare-budget-answer"; let revision = 0;
    let output = await runCarsDecisionTurnV2({ conversationId, messageId: "start", idempotencyKey: "start", expectedConversationRevision: revision++, userMessage: "Araba alacağım", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    for (let step = 0; step < 5 && !output.offer; step += 1) {
      const decision = traces.filter((trace) => trace.phase === "DECISION").at(-1)!; const key = decision.selectedQuestionKey;
      const answer = key === "discovery.bodyStyle" ? "SUV/crossover" : key === "discovery.fuelType" ? "Fark etmez" : key === "discovery.transmission" ? "Otomatik" : key === "discovery.budget" ? "3 milyon tl" : "Fark etmez";
      output = await runCarsDecisionTurnV2({ conversationId, messageId: `answer-${step}`, idempotencyKey: `answer-${step}`, expectedConversationRevision: revision++, userMessage: answer, requestTime: `2026-08-20T00:0${step + 1}:00.000Z` }, composition);
    }
    const memory = (await store.load(conversationId))!.memory!;
    expect(memory.budget.budgetUnknown).toBe(false); expect(memory.budget.preferredBudget?.amount).toBe(3_000_000);
    expect(output.state).toBe("AWAITING_CONSENT"); expect(output.offer?.token).toBeTruthy(); expect(output.cards).toEqual([]); expect(output.message).toMatch(/Bütçe çerçeven net/);
  });
  it("supersedes a redirected material question and does not let it block the next stage or final offer", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore();
    const interpreter: StructuredInterpretationModel = { interpret: async (request) => result(request.messageId, []) };
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter, realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T00:08:00.000Z") }), smokeObserver: (trace) => traces.push(trace) });
    const conversationId = "redirected-question"; let revision = 0;
    let output = await runCarsDecisionTurnV2({ conversationId, messageId: "start", idempotencyKey: "start", expectedConversationRevision: revision++, userMessage: "Evet, araba almak istiyorum", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(traces.filter((trace) => trace.phase === "DECISION").at(-1)?.selectedQuestionKey).toBe("discovery.usageScenario");
    output = await runCarsDecisionTurnV2({ conversationId, messageId: "redirect", idempotencyKey: "redirect", expectedConversationRevision: revision++, userMessage: "Kullanım ayrıntısını sonra konuşalım, önce nasıl bir araç istediğimizi belirleyelim", requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    expect(traces.filter((trace) => trace.phase === "DECISION").at(-1)?.selectedQuestionKey).toBe("discovery.bodyStyle");
    for (let step = 0; step < 4 && !output.offer; step += 1) {
      const key = traces.filter((trace) => trace.phase === "DECISION").at(-1)?.selectedQuestionKey;
      const answer = key === "discovery.bodyStyle" ? "Kapalı kasa ticari" : key === "discovery.transmission" ? "Manuel" : key === "discovery.budget" ? "2 milyon" : "Fark etmez";
      output = await runCarsDecisionTurnV2({ conversationId, messageId: `answer-${step}`, idempotencyKey: `answer-${step}`, expectedConversationRevision: revision++, userMessage: answer, requestTime: `2026-08-20T00:0${step + 2}:00.000Z` }, composition);
    }
    const memory = (await store.load(conversationId))!.memory!;
    expect(memory.materialQuestionHistory.find((item) => item.field === "usageScenario")?.answerStatus).toBe("DEFERRED");
    expect(output.state).toBe("AWAITING_CONSENT"); expect(output.offer?.token).toBeTruthy();
  });
  it("keeps the real manual diesel AWD pickup candidate eligible", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ pickup: result("pickup", []) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId: "manual-pickup", messageId: "pickup", idempotencyKey: "pickup", expectedConversationRevision: 0, userMessage: "Köyde kullanacağım. Pickup olmalı, 4x4 şart, dizel olmalı ve manuel olmalı.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    const decision = traces.find((trace) => trace.phase === "DECISION")!; const buckets = decision.technicalBuckets as { eligible: number };
    expect(buckets.eligible).toBeGreaterThan(0); expect(decision.availability).not.toBe("HARD_CONFLICT"); expect(output.state).not.toBe("CONFLICT");
  });
  it("reaches an offer after completing the off-road pickup discovery path", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore();
    const interpreter: StructuredInterpretationModel = { interpret: async (request) => result(request.messageId, []) };
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter, realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T00:06:00.000Z") }), smokeObserver: (trace) => traces.push(trace) });
    const messages = ["merhaba. arazi aracı bakıyorum.", "Pickup", "Dört çeker", "fark etmez", "Manuel", "4 milyon tl"] as const;
    let output;
    for (let index = 0; index < messages.length; index += 1) output = await runCarsDecisionTurnV2({ conversationId: "off-road-pickup-offer", messageId: `offroad-${index}`, idempotencyKey: `offroad-${index}`, expectedConversationRevision: index, userMessage: messages[index]!, requestTime: `2026-08-20T00:0${index}:00.000Z` }, composition);
    const finalDecision = traces.filter((trace) => trace.phase === "DECISION").at(-1)!;
    expect(finalDecision).toMatchObject({ recommendationReadiness: "READY_FOR_OFFER", action: "REQUEST_REVEAL_CONSENT", offerCreated: true, materialQuestionCount: 0 });
    expect(output?.state).toBe("AWAITING_CONSENT"); expect(output?.offer?.token).toBeTruthy(); expect(output?.message).toMatch(/görmek ister misin/iu);
  });
  it("answers a requested technical explanation without appending an unrelated material question", async () => {
    const store = new InMemoryV2ConversationStore(); const traces: Readonly<Record<string, unknown>>[] = [];
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ explain: result("explain", ["TECHNICAL_EXPLANATION_REQUEST"], { directAnswerRequests: [{ kind: "TECHNICAL_EXPLANATION" }], technicalGuidanceRequest: { fieldId: "fuelType", mode: "GUIDE_WITH_DAILY_LIFE" } }) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId: "technical-explanation", messageId: "explain", idempotencyKey: "explain", expectedConversationRevision: 0, userMessage: "Hafif hibrit ile tam hibrit arasındaki farkı günlük örnekle açıklar mısın?", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(output.options).toEqual([]); expect(output.message).toMatch(/hafif hibrit|tam hibrit/iu);
    expect(traces.find((trace) => trace.phase === "DECISION")).toMatchObject({ action: "EXPLAIN_TECHNICAL_CONCEPT", materialQuestionCount: 0 });
  });
  it("explains the current traction question instead of replaying an older model lookup", async () => {
    const fallbackRealizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };
    const store = new InMemoryV2ConversationStore(); const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ lookup: result("lookup", ["MODEL_LOOKUP_REQUEST"], { directAnswerRequests: [{ kind: "MODEL_AVAILABILITY" }], modelReferences: [{ rawText: "Clio", parsedModelText: "Clio", purpose: "LOOKUP_ONLY" }] }), explain: result("explain", ["TECHNICAL_EXPLANATION_REQUEST"], { directAnswerRequests: [{ kind: "TECHNICAL_EXPLANATION" }], technicalGuidanceRequest: { fieldId: "drivenWheels", mode: "GUIDE_WITH_DAILY_LIFE" } }) }), realizer: fallbackRealizer, shadow: true });
    await runCarsDecisionTurnV2({ conversationId: "lookup-then-traction", messageId: "lookup", idempotencyKey: "lookup", expectedConversationRevision: 0, userMessage: "Clio var mı?", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    const explained = await runCarsDecisionTurnV2({ conversationId: "lookup-then-traction", messageId: "explain", idempotencyKey: "explain", expectedConversationRevision: 1, userMessage: "FWD, AWD ve RWD bunların anlamı ne?", requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    expect(explained.message).toMatch(/FWD.*ön tekerlek.*RWD.*arka tekerlek.*AWD/iu); expect(explained.message).not.toMatch(/Clio.*katalog/iu);
  });

  it("acknowledges a resolved model preference before asking the next discovery question", async () => {
    const fallbackRealizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };
    const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ prefer: result("prefer", ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST", "PREFERENCE_STATEMENT"], { modelReferences: [{ rawText: "Clio", parsedModelText: "Clio", purpose: "PREFERENCE" }] }) }), realizer: fallbackRealizer, shadow: true });
    const output = await runCarsDecisionTurnV2({ conversationId: "model-preference", messageId: "prefer", idempotencyKey: "prefer", expectedConversationRevision: 0, userMessage: "Clio almak istiyorum", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(output.message).toMatch(/Renault Clio.*başlangıç noktası/iu);
    expect(output.options.length).toBeGreaterThan(0);
  });

  it("explains kW with a bounded daily-life comparison when the provider leaves the field unspecified", async () => {
    const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ kw: result("kw", ["TECHNICAL_EXPLANATION_REQUEST"], { directAnswerRequests: [{ kind: "TECHNICAL_EXPLANATION" }], technicalGuidanceRequest: { mode: "GUIDE_WITH_DAILY_LIFE" } }) }), realizer, shadow: true });
    const output = await runCarsDecisionTurnV2({ conversationId: "kw-explanation", messageId: "kw", idempotencyKey: "kw", expectedConversationRevision: 0, userMessage: "Elektrikli araçta kW nedir? Teknik bilgim yok, günlük örnekle açıkla.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(output.message).toMatch(/motor gücünü|100–150 kW/u);
    expect(output.message).not.toMatch(/hangisi|istersin\?/iu);
  });
  it("resolves two model references and restricts comparison scope without a generic offer", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ compare: result("compare", ["MODEL_COMPARISON_REQUEST"], { directAnswerRequests: [{ kind: "MODEL_COMPARISON" }] }) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId: "compare-scope", messageId: "compare", idempotencyKey: "compare", expectedConversationRevision: 0, userMessage: "Araba almak istiyorum. Clio mu Civic mi kararsızım.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    const references = (await store.load("compare-scope"))!.memory!.events.filter((event) => event.eventType === "MODEL_REFERENCE");
    expect(references).toHaveLength(2); expect(references.every((event) => event.decisionEffect === "COMPARISON_SCOPE")).toBe(true);
    expect(output.offer).toBeUndefined(); expect(output.message).not.toMatch(/değerlendirmeyi tamamladım/iu);
    const decision = traces.find((trace) => trace.phase === "DECISION")!; expect(decision).toMatchObject({ recommendationReadiness: "DIRECT_MODEL_SCOPE", action: "ANSWER_DIRECTLY", directAnswerRequired: true });
    expect((decision.modelScope as string[]).length).toBeGreaterThan(0); expect((decision.technicalBuckets as { eligible: number }).eligible).toBeLessThan(await activeVariantCount());
  });
  it("persists an identity-free offer and reveals only its exact authorized cards after consent", async () => {
    const store = new InMemoryV2ConversationStore();
    const offerStore = new InMemoryGovernedOfferStore();
    const composition = createCarsDecisionV2ProductionComposition({
      store,
      offerStore,
      interpreter: model({
        recommendation: result("recommendation", ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST"], { directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }] }), "skip-usage": result("skip-usage", ["DECLINE_TO_ANSWER"]), "skip-body": result("skip-body", ["DECLINE_TO_ANSWER"]), "skip-fuel": result("skip-fuel", ["DECLINE_TO_ANSWER"]), "skip-transmission": result("skip-transmission", ["DECLINE_TO_ANSWER"]), "exclude-budget": result("exclude-budget", ["BUDGET_STATEMENT"]),
        consent: result("consent", ["OFFER_ACCEPTANCE"]),
      }),
      realizer,
      signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T00:01:00.000Z") }),
    });
    const offered = await discoverAndOffer("composition-offer", composition);
    expect(offered.state).toBe("AWAITING_CONSENT");
    expect(offered.offer?.token).toMatch(/^v2\./u);
    expect(offered.cards).toEqual([]);
    expect(offered.message).not.toMatch(/BMW|Mercedes|Fiat|Toyota/iu);

    const revealed = await runCarsDecisionTurnV2({ conversationId: "composition-offer", messageId: "consent", idempotencyKey: "consent", expectedConversationRevision: offered.revision, userMessage: "Paylaş", offerToken: offered.offer!.token, requestTime: "2026-08-20T00:06:00.000Z" }, composition);
    expect(revealed.state).toBe("REVEALED");
    expect(revealed.cards.length).toBeGreaterThanOrEqual(1);
    expect(revealed.cards.length).toBeLessThanOrEqual(3);
    expect(new Set(revealed.cards.map((card) => card.exactVariantId)).size).toBe(revealed.cards.length);

    const crossConversation = await runCarsDecisionTurnV2({ conversationId: "different-conversation", messageId: "consent", idempotencyKey: "cross-consent", expectedConversationRevision: 0, userMessage: "Göster", offerToken: offered.offer!.token, requestTime: "2026-08-20T00:01:00.000Z" }, createCarsDecisionV2ProductionComposition({ store: new InMemoryV2ConversationStore(), offerStore, interpreter: model({ consent: result("consent", ["OFFER_ACCEPTANCE"]) }), realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T00:01:00.000Z") }) }));
    expect(crossConversation.cards).toEqual([]);
  });
  it("does not broaden confirmed functional preferences after every matching revealed variant is rejected", async () => {
    const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore();
    const interpreter: StructuredInterpretationModel = { interpret: async (request) => result(request.messageId, []) };
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter, realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T00:04:00.000Z") }) });
    const firstOffer = await runCarsDecisionTurnV2({ conversationId: "plural-rejection", messageId: "first", idempotencyKey: "first", expectedConversationRevision: 0, userMessage: "Uzun yol için hızlı elektrikli coupe istiyorum, otomatik olsun; bütçe önemli değil.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(firstOffer.offer?.token).toBeTruthy();
    const firstReveal = await runCarsDecisionTurnV2({ conversationId: "plural-rejection", messageId: "reveal-first", idempotencyKey: "reveal-first", expectedConversationRevision: 1, userMessage: "göster", offerToken: firstOffer.offer!.token, requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    const rejectedIds = firstReveal.cards.map((card) => card.exactVariantId); expect(rejectedIds.length).toBeGreaterThan(0);
    const replacementOffer = await runCarsDecisionTurnV2({ conversationId: "plural-rejection", messageId: "reject", idempotencyKey: "reject", expectedConversationRevision: 2, userMessage: "Bunları beğenmedim. Bütçem 15 milyon mümkün.", requestTime: "2026-08-20T00:02:00.000Z" }, composition);
    expect(replacementOffer.state).toBe("FILTERING"); expect(replacementOffer.offer).toBeUndefined(); expect(replacementOffer.message).toMatch(/yeniden önermeyeceğim.*başka bir seçenek kalmadı.*gövde veya yakıt/iu);
    const rejectionEvents = (await store.load("plural-rejection"))!.memory!.events.filter((event) => event.eventType === "CANDIDATE_REJECTION" && event.sourceMessageId === "reject");
    expect(rejectionEvents.flatMap((event) => event.eventType === "CANDIDATE_REJECTION" ? [event.candidateId] : []).sort()).toEqual([...rejectedIds].sort());
  });
  it("binds the complete natural consent fixture to one persisted offer and reveals it", async () => {
    const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore(); const traces: Readonly<Record<string, unknown>>[] = [];
    let providerCalls = 0; const interpreter: StructuredInterpretationModel = { interpret: async (request) => { providerCalls += 1; if (request.messageId === "share") throw new Error("provider must be bypassed"); return result("prepared", ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST"], { directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }] }); } };
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter, realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T00:01:00.000Z") }), smokeObserver: (trace) => traces.push(trace) });
    const prepared = await runCarsDecisionTurnV2({ conversationId: "natural-consent-fixture", messageId: "prepared", idempotencyKey: "prepared", expectedConversationRevision: 0, userMessage: "Şehir içinde günlük kullanacağım. Otomatik, hibrit ve kompakt hatchback istiyorum. İki kabin boy bavul yeterli; bütçe önemli değil. Bana uygun seçenekleri hazırla.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    const firstDecision = traces.find((trace) => trace.phase === "DECISION")!; expect(firstDecision.unansweredDecisionFields).toEqual([]); expect(firstDecision).toMatchObject({ recommendationReadiness: "READY_FOR_OFFER", action: "REQUEST_REVEAL_CONSENT", offerCreated: true, materialQuestionCount: 0 }); expect(prepared.cards).toEqual([]); expect(prepared.offer?.token).toBeTruthy();
    const before = (await store.load("natural-consent-fixture"))!.memory!; const decisionFingerprint = before.decisionFingerprint; expect(before.currentOffer?.lifecycleState).toBe("CREATED");
    const revealed = await runCarsDecisionTurnV2({ conversationId: "natural-consent-fixture", messageId: "share", idempotencyKey: "share", expectedConversationRevision: 1, userMessage: "Paylaş", offerToken: prepared.offer!.token, requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    const after = (await store.load("natural-consent-fixture"))!.memory!; const persistedOffer = await offerStore.get(prepared.offer!.offerId); expect(providerCalls).toBe(1); expect(after.decisionFingerprint).toBe(decisionFingerprint); expect(after.currentOffer?.lifecycleState).toBe("REVEALED"); expect(revealed.state).toBe("REVEALED"); expect(revealed.offer).toBeUndefined(); expect(revealed.cards.length).toBeGreaterThanOrEqual(1); expect(revealed.cards.length).toBeLessThanOrEqual(3); expect(revealed.cards.map((card) => card.exactVariantId)).toEqual(persistedOffer?.candidateRefs.map((ref) => ref.exactVariantId)); expect(new Set(persistedOffer?.candidateRefs.map((ref) => ref.modelFamilyId)).size).toBe(persistedOffer?.candidateRefs.length); expect(revealed.cards.map((card) => card.bodyTypeLabel)).toEqual(revealed.cards.map(() => "Hatchback")); expect(revealed.cards.every((card) => ["Manuel", "Otomatik", "Çift kavramalı otomatik", "Tek oranlı otomatik"].includes(card.transmissionLabel ?? ""))).toBe(true); expect(traces).toContainEqual(expect.objectContaining({ phase: "OFFER_RESPONSE", interpretationSource: "DETERMINISTIC_OFFER_RESPONSE", providerCalled: false, offerResponse: "ACCEPT" }));
  });
  it("creates a governed offer for a complete first-car request with a hard budget", async () => {
    const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter: model({ first: result("first", []) }), realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T00:00:00.000Z") }) });
    const output = await runCarsDecisionTurnV2({ conversationId: "complete-first-car", messageId: "first", idempotencyKey: "first", expectedConversationRevision: 0, userMessage: "İlk arabam olacak; şehir içinde otomatik hibrit hatchback istiyorum, bütçem maksimum 3 milyon.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect(output.state).toBe("AWAITING_CONSENT"); expect(output.offer?.token).toBeTruthy(); expect(output.cards).toEqual([]); expect(output.message).toMatch(/görmek ister misin/iu);
  });
  it("keeps offer ids unique when separate conversations reuse the same client message id", async () => {
    const offerStore = new InMemoryGovernedOfferStore(); const outputs = [];
    for (const conversationId of ["same-message-a", "same-message-b"]) { const store = new InMemoryV2ConversationStore(); const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter: model({ first: result("first", []) }), realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T00:00:00.000Z") }) }); outputs.push(await runCarsDecisionTurnV2({ conversationId, messageId: "first", idempotencyKey: "first", expectedConversationRevision: 0, userMessage: "Şehir içinde kullanacağım; otomatik hibrit hatchback araç istiyorum, bütçe önemli değil.", requestTime: "2026-08-20T00:00:00.000Z" }, composition)); }
    expect(outputs[0]?.offer?.offerId).toBeTruthy(); expect(outputs[1]?.offer?.offerId).toBeTruthy(); expect(outputs[0]?.offer?.offerId).not.toBe(outputs[1]?.offer?.offerId);
  });
  it("keeps the real temporal blocker on August 16", async () => { const composition = createCarsDecisionV2ProductionComposition({ store: new InMemoryV2ConversationStore(), interpreter: model({ temporal: result("temporal", ["GREETING"]) }), realizer, shadow: true }); const output = await runCarsDecisionTurnV2({ conversationId: "temporal", messageId: "temporal", idempotencyKey: "temporal", expectedConversationRevision: 0, userMessage: "Merhaba", requestTime: "2026-08-16T00:00:00.000Z" }, composition); expect(output.recoverableStatus).toBe("CATALOG_UNAVAILABLE"); });
  it("enforces cargo-first semantics before action selection and reduces the real catalog pool", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ cargo: result("cargo", ["USAGE_STATEMENT"]) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    await runCarsDecisionTurnV2({ conversationId: "cargo-semantic", messageId: "cargo", idempotencyKey: "cargo", expectedConversationRevision: 0, userMessage: "Şehir içi dağıtım için kapalı yük alanı istiyorum, arka koltuklara gerek yok.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    const decision = traces.find((trace) => trace.phase === "DECISION")!; const buckets = decision.technicalBuckets as { eligible: number; eliminated: number };
    expect(buckets.eligible).toBeLessThan(await activeVariantCount()); expect(buckets.eliminated).toBeGreaterThan(0);
    const constraints = (await store.load("cargo-semantic"))!.memory!.events.filter((event) => event.eventType === "CONSTRAINT");
    expect(constraints).toEqual(expect.arrayContaining([expect.objectContaining({ field: "usageArchitecture", decisionEffect: "HARD_FILTER" }), expect.objectContaining({ field: "rearSeatPreference", decisionEffect: "STRONG_RANK" })]));
  });
  it("never dead-ends a fully stated cargo request with a generic acknowledgement", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ cargo: result("cargo", []) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId: "cargo-complete", messageId: "cargo", idempotencyKey: "cargo", expectedConversationRevision: 0, userMessage: "Şehir içinde mal dağıtıyorum. Caddy tarzı kapalı yük alanı olsun, arka koltuğa gerek yok. Dizel otomatik istiyorum, bütçem maksimum 3 milyon.", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    const decision = traces.find((trace) => trace.phase === "DECISION")!;
    expect(decision.action).not.toBe("ANSWER_DIRECTLY"); expect(output.message).not.toMatch(/ihtiyacını birlikte daraltalım/iu); expect(output.options.map((option) => option.label)).not.toEqual(expect.arrayContaining(["SUV/crossover", "Sedan"]));
    expect(["EXPLAIN_CONFLICT", "REQUEST_REVEAL_CONSENT", "ASK_MATERIAL_QUESTION"]).toContain(decision.action);
  });
  it("supersedes body corrections and recomputes from the full snapshot", async () => {
    const store = new InMemoryV2ConversationStore(); const traces: Readonly<Record<string, unknown>>[] = [];
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ suv: result("suv", []), sedan: result("sedan", []), correction: result("correction", ["CORRECTION"]) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    await runCarsDecisionTurnV2({ conversationId: "body-correction", messageId: "suv", idempotencyKey: "suv", expectedConversationRevision: 0, userMessage: "SUV", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    await runCarsDecisionTurnV2({ conversationId: "body-correction", messageId: "sedan", idempotencyKey: "sedan", expectedConversationRevision: 1, userMessage: "Sedan", requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    await runCarsDecisionTurnV2({ conversationId: "body-correction", messageId: "correction", idempotencyKey: "correction", expectedConversationRevision: 2, userMessage: "Pickup demedim, sedan dedim", requestTime: "2026-08-20T00:02:00.000Z" }, composition);
    const events = (await store.load("body-correction"))!.memory!.events.filter((event) => event.eventType === "CONSTRAINT" && event.field === "bodyStyle");
    expect(events).toHaveLength(3); expect(events[1]).toMatchObject({ supersedesId: events[0]!.id }); expect(events[2]).toMatchObject({ supersedesId: events[1]!.id, normalizedValue: { operator: "EQUALS", value: "Sedan" } });
    const finalDecision = traces.filter((trace) => trace.phase === "DECISION").at(-1)!; expect((finalDecision.technicalBuckets as { eligible: number }).eligible).toBeLessThan(await activeVariantCount());
  });
  it("binds model lookup to the generated catalog index", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ lookup: result("lookup", ["MODEL_LOOKUP_REQUEST"]) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    await runCarsDecisionTurnV2({ conversationId: "lookup-authority", messageId: "lookup", idempotencyKey: "lookup", expectedConversationRevision: 0, userMessage: "Micra var mı?", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    const reference = (await store.load("lookup-authority"))!.memory!.events.find((event) => event.eventType === "MODEL_REFERENCE");
    expect(reference).toMatchObject({ decisionEffect: "LOOKUP_ONLY" }); expect(reference?.resolution).not.toBe("UNRESOLVED");
    expect(traces.find((trace) => trace.phase === "DECISION")).toMatchObject({ action: "ANSWER_MODEL_LOOKUP", lookupResolution: reference?.resolution });
  });
  it("activates and deactivates persona without changing the technical pool", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore(); const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ persona: result("persona", []), clear: result("clear", []) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    await runCarsDecisionTurnV2({ conversationId: "persona-semantic", messageId: "persona", idempotencyKey: "persona", expectedConversationRevision: 0, userMessage: "Premium ve şık olsun", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    await runCarsDecisionTurnV2({ conversationId: "persona-semantic", messageId: "clear", idempotencyKey: "clear", expectedConversationRevision: 1, userMessage: "Fark etmez", requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    const decisions = traces.filter((trace) => trace.phase === "DECISION"); expect(decisions[0]?.persona).toMatchObject({ activated: true, requestedTraits: ["DESIGN", "PRESTIGE"] }); expect((decisions[0]?.technicalBuckets as { eligible: number }).eligible).toBe(await activeVariantCount()); expect(decisions[1]?.persona).toMatchObject({ activated: false, affectedRanking: false });
  });
  it("keeps available cash flexible and applies only an explicit hard ceiling", async () => {
    const store = new InMemoryV2ConversationStore(); const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ cash: result("cash", []), ceiling: result("ceiling", []) }), realizer, shadow: true });
    await runCarsDecisionTurnV2({ conversationId: "budget-semantic", messageId: "cash", idempotencyKey: "cash", expectedConversationRevision: 0, userMessage: "5 milyon nakitim var, üstü için kredi kullanabilirim", requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    expect((await store.load("budget-semantic"))!.memory!.budget).toMatchObject({ availableCash: { amount: 5_000_000, currency: "TRY" }, financeFlexibility: "YES", unresolvedFinancedCeiling: true }); expect((await store.load("budget-semantic"))!.memory!.budget.maximumHardCeiling).toBeUndefined();
    await runCarsDecisionTurnV2({ conversationId: "budget-semantic", messageId: "ceiling", idempotencyKey: "ceiling", expectedConversationRevision: 1, userMessage: "5 milyon üstüne çıkmam", requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    expect((await store.load("budget-semantic"))!.memory!.budget.maximumHardCeiling).toEqual({ amount: 5_000_000, currency: "TRY" });
  });
  it("keeps offer authorization and reveal deterministic across twenty replays even with realization fallback", async () => {
    const signatures: string[] = [];
    const invalidRealizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };
    for (let index = 0; index < 20; index += 1) {
      const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore();
      const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter: model({ recommendation: result("recommendation", ["RECOMMENDATION_REQUEST"], { directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }] }), "skip-usage": result("skip-usage", ["DECLINE_TO_ANSWER"]), "skip-body": result("skip-body", ["DECLINE_TO_ANSWER"]), "skip-fuel": result("skip-fuel", ["DECLINE_TO_ANSWER"]), "skip-transmission": result("skip-transmission", ["DECLINE_TO_ANSWER"]), "exclude-budget": result("exclude-budget", ["BUDGET_STATEMENT"]), consent: result("consent", ["OFFER_ACCEPTANCE"]) }), realizer: invalidRealizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T00:05:00.000Z") }) });
      const offered = await discoverAndOffer(`determinism-${index}`, composition);
      const revealed = await runCarsDecisionTurnV2({ conversationId: `determinism-${index}`, messageId: "consent", idempotencyKey: "consent", expectedConversationRevision: offered.revision, userMessage: "Göster bakalım", offerToken: offered.offer!.token, requestTime: "2026-08-20T00:05:00.000Z" }, composition);
      expect(offered.cards).toEqual([]); expect(revealed.cards.length).toBeGreaterThan(0);
      signatures.push(JSON.stringify(revealed.cards.map((card) => card.exactVariantId)));
    }
    expect(new Set(signatures)).toHaveLength(1);
  }, 120_000);
});
