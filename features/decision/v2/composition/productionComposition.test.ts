import { describe, expect, it } from "vitest";
import { createHmacOfferSigner } from "../offer/signer.server";
import { InMemoryGovernedOfferStore } from "../offer/store";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import type { NaturalRealizationModel } from "../realization/types";
import { createCarsDecisionV2ProductionComposition } from "./production.server";
const result = (messageId: string, acts: InterpretationResult["acts"], extra: Partial<InterpretationResult> = {}): InterpretationResult => ({ schemaVersion: 1, messageId, acts, directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [], ...extra });
const model = (results: Record<string, InterpretationResult>): StructuredInterpretationModel => ({ interpret: async (request) => results[request.messageId] });
const realizer: NaturalRealizationModel = { realize: async (request) => ({ message: request.action.type === "SOCIAL_REPLY" ? "Merhaba, araç seçimini birlikte netleştirebiliriz." : request.action.type === "REQUEST_REVEAL_CONSENT" ? "İhtiyaçlarına göre bir seçki hazırladım. Görmek ister misin?" : "Değerlendirmeyi güvenli biçimde tamamladım.", usedExplanationFactIds: [], mentionedCandidateIds: [], ...(request.materialQuestion ? { renderedQuestionId: request.materialQuestion.id } : {}) }) };
async function discoverAndOffer(conversationId: string, composition: ReturnType<typeof createCarsDecisionV2ProductionComposition>) {
  const turns = [
    ["recommendation", "Nasıl bir araba almalıyım karar veremiyorum."],
    ["skip-body", "Fark etmez"],
    ["skip-fuel", "Fark etmez"],
    ["skip-transmission", "Fark etmez"],
    ["exclude-budget", "Bütçe önemli değil"],
  ] as const;
  let output;
  for (let index = 0; index < turns.length; index += 1) {
    const [messageId, userMessage] = turns[index]!;
    output = await runCarsDecisionTurnV2({ conversationId, messageId, idempotencyKey: messageId, expectedConversationRevision: index, userMessage, requestTime: `2026-08-19T00:0${index}:00.000Z` }, composition);
    if (index < turns.length - 1) expect(output.offer).toBeUndefined();
  }
  return output!;
}
describe("production V2 composition with real WP pipeline", () => {
  it("runs greeting through real snapshot, reducer, full catalog evaluation, ranking and social action", async () => { const store = new InMemoryV2ConversationStore(); const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ greeting: result("greeting", ["GREETING"], { socialSignal: { kind: "GREETING" } }) }), realizer, shadow: true }); const output = await runCarsDecisionTurnV2({ conversationId: "composition-greeting", messageId: "greeting", idempotencyKey: "greeting", expectedConversationRevision: 0, userMessage: "Merhaba", requestTime: "2026-08-19T00:00:00.000Z" }, composition); expect(output).toMatchObject({ state: "SOCIAL", cards: [] }); expect(output.message).toContain("Merhaba"); expect((await store.load("composition-greeting"))?.memory?.events.some((event) => event.eventType === "SOCIAL_INTERACTION")).toBe(true); });
  it("keeps a broad daily-use recommendation in discovery instead of creating an offer", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ greeting: result("greeting", ["GREETING"], { socialSignal: { kind: "GREETING" } }), daily: result("daily", ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST"], { directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }] }) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    await runCarsDecisionTurnV2({ conversationId: "daily-discovery", messageId: "greeting", idempotencyKey: "greeting", expectedConversationRevision: 0, userMessage: "merhaba", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    const output = await runCarsDecisionTurnV2({ conversationId: "daily-discovery", messageId: "daily", idempotencyKey: "daily", expectedConversationRevision: 1, userMessage: "günlük kullanım için iyi bir arabaya ihtiyacım var.", requestTime: "2026-08-19T00:01:00.000Z" }, composition);
    expect(output.offer).toBeUndefined(); expect(output.cards).toEqual([]); expect(output.options.length).toBeGreaterThan(0);
    expect(traces.filter((trace) => trace.phase === "DECISION").at(-1)).toMatchObject({ recommendationReadiness: "NEEDS_MATERIAL_DISCRIMINATOR", action: "ASK_MATERIAL_QUESTION", materialQuestionCount: 1, offerCreated: false });
  });
  it("answers a requested technical explanation without appending an unrelated material question", async () => {
    const store = new InMemoryV2ConversationStore(); const traces: Readonly<Record<string, unknown>>[] = [];
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ explain: result("explain", ["TECHNICAL_EXPLANATION_REQUEST"], { directAnswerRequests: [{ kind: "TECHNICAL_EXPLANATION" }], technicalGuidanceRequest: { fieldId: "fuelType", mode: "GUIDE_WITH_DAILY_LIFE" } }) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId: "technical-explanation", messageId: "explain", idempotencyKey: "explain", expectedConversationRevision: 0, userMessage: "Hafif hibrit ile tam hibrit arasındaki farkı günlük örnekle açıklar mısın?", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    expect(output.options).toEqual([]); expect(output.message).toMatch(/hafif hibrit|tam hibrit/iu);
    expect(traces.find((trace) => trace.phase === "DECISION")).toMatchObject({ action: "EXPLAIN_TECHNICAL_CONCEPT", materialQuestionCount: 0 });
  });

  it("explains kW with a bounded daily-life comparison when the provider leaves the field unspecified", async () => {
    const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ kw: result("kw", ["TECHNICAL_EXPLANATION_REQUEST"], { directAnswerRequests: [{ kind: "TECHNICAL_EXPLANATION" }], technicalGuidanceRequest: { mode: "GUIDE_WITH_DAILY_LIFE" } }) }), realizer, shadow: true });
    const output = await runCarsDecisionTurnV2({ conversationId: "kw-explanation", messageId: "kw", idempotencyKey: "kw", expectedConversationRevision: 0, userMessage: "Elektrikli araçta kW nedir? Teknik bilgim yok, günlük örnekle açıkla.", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    expect(output.message).toMatch(/motor gücünü|100–150 kW/u);
    expect(output.message).not.toMatch(/hangisi|istersin\?/iu);
  });
  it("resolves two model references and restricts comparison scope without a generic offer", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ compare: result("compare", ["MODEL_COMPARISON_REQUEST"], { directAnswerRequests: [{ kind: "MODEL_COMPARISON" }] }) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId: "compare-scope", messageId: "compare", idempotencyKey: "compare", expectedConversationRevision: 0, userMessage: "Araba almak istiyorum. Clio mu Civic mi kararsızım.", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    const references = (await store.load("compare-scope"))!.memory!.events.filter((event) => event.eventType === "MODEL_REFERENCE");
    expect(references).toHaveLength(2); expect(references.every((event) => event.decisionEffect === "COMPARISON_SCOPE")).toBe(true);
    expect(output.offer).toBeUndefined(); expect(output.message).not.toMatch(/değerlendirmeyi tamamladım/iu);
    const decision = traces.find((trace) => trace.phase === "DECISION")!; expect(decision).toMatchObject({ recommendationReadiness: "DIRECT_MODEL_SCOPE", action: "ANSWER_DIRECTLY", directAnswerRequired: true });
    expect((decision.modelScope as string[]).length).toBeGreaterThan(0); expect((decision.technicalBuckets as { eligible: number }).eligible).toBeLessThan(577);
  });
  it("persists an identity-free offer and reveals only its exact authorized cards after consent", async () => {
    const store = new InMemoryV2ConversationStore();
    const offerStore = new InMemoryGovernedOfferStore();
    const composition = createCarsDecisionV2ProductionComposition({
      store,
      offerStore,
      interpreter: model({
        recommendation: result("recommendation", ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST"], { directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }] }), "skip-body": result("skip-body", ["DECLINE_TO_ANSWER"]), "skip-fuel": result("skip-fuel", ["DECLINE_TO_ANSWER"]), "skip-transmission": result("skip-transmission", ["DECLINE_TO_ANSWER"]), "exclude-budget": result("exclude-budget", ["BUDGET_STATEMENT"]),
        consent: result("consent", ["OFFER_ACCEPTANCE"]),
      }),
      realizer,
      signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-19T00:01:00.000Z") }),
    });
    const offered = await discoverAndOffer("composition-offer", composition);
    expect(offered.state).toBe("AWAITING_CONSENT");
    expect(offered.offer?.token).toMatch(/^v2\./u);
    expect(offered.cards).toEqual([]);
    expect(offered.message).not.toMatch(/BMW|Mercedes|Fiat|Toyota/iu);

    const revealed = await runCarsDecisionTurnV2({ conversationId: "composition-offer", messageId: "consent", idempotencyKey: "consent", expectedConversationRevision: 5, userMessage: "Paylaş", offerToken: offered.offer!.token, requestTime: "2026-08-19T00:05:00.000Z" }, composition);
    expect(revealed.state).toBe("REVEALED");
    expect(revealed.cards.length).toBeGreaterThanOrEqual(1);
    expect(revealed.cards.length).toBeLessThanOrEqual(3);
    expect(new Set(revealed.cards.map((card) => card.exactVariantId)).size).toBe(revealed.cards.length);

    const crossConversation = await runCarsDecisionTurnV2({ conversationId: "different-conversation", messageId: "consent", idempotencyKey: "cross-consent", expectedConversationRevision: 0, userMessage: "Göster", offerToken: offered.offer!.token, requestTime: "2026-08-19T00:01:00.000Z" }, createCarsDecisionV2ProductionComposition({ store: new InMemoryV2ConversationStore(), offerStore, interpreter: model({ consent: result("consent", ["OFFER_ACCEPTANCE"]) }), realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-19T00:01:00.000Z") }) }));
    expect(crossConversation.cards).toEqual([]);
  });
  it("binds the complete natural consent fixture to one persisted offer and reveals it", async () => {
    const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore(); const traces: Readonly<Record<string, unknown>>[] = [];
    let providerCalls = 0; const interpreter: StructuredInterpretationModel = { interpret: async (request) => { providerCalls += 1; if (request.messageId === "share") throw new Error("provider must be bypassed"); return result("prepared", ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST"], { directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }] }); } };
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter, realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-19T00:01:00.000Z") }), smokeObserver: (trace) => traces.push(trace) });
    const prepared = await runCarsDecisionTurnV2({ conversationId: "natural-consent-fixture", messageId: "prepared", idempotencyKey: "prepared", expectedConversationRevision: 0, userMessage: "Şehir içinde günlük kullanacağım. Otomatik, hibrit ve kompakt hatchback istiyorum. İki kabin boy bavul yeterli; bütçe önemli değil. Bana uygun seçenekleri hazırla.", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    const firstDecision = traces.find((trace) => trace.phase === "DECISION")!; expect(firstDecision.unansweredDecisionFields).toEqual([]); expect(firstDecision).toMatchObject({ recommendationReadiness: "READY_FOR_OFFER", action: "REQUEST_REVEAL_CONSENT", offerCreated: true, materialQuestionCount: 0 }); expect(prepared.cards).toEqual([]); expect(prepared.offer?.token).toBeTruthy();
    const before = (await store.load("natural-consent-fixture"))!.memory!; const decisionFingerprint = before.decisionFingerprint; expect(before.currentOffer?.lifecycleState).toBe("CREATED");
    const revealed = await runCarsDecisionTurnV2({ conversationId: "natural-consent-fixture", messageId: "share", idempotencyKey: "share", expectedConversationRevision: 1, userMessage: "Paylaş", offerToken: prepared.offer!.token, requestTime: "2026-08-19T00:01:00.000Z" }, composition);
    const after = (await store.load("natural-consent-fixture"))!.memory!; expect(providerCalls).toBe(1); expect(after.decisionFingerprint).toBe(decisionFingerprint); expect(after.currentOffer?.lifecycleState).toBe("REVEALED"); expect(revealed.state).toBe("REVEALED"); expect(revealed.offer).toBeUndefined(); expect(revealed.cards.length).toBeGreaterThanOrEqual(1); expect(revealed.cards.length).toBeLessThanOrEqual(3); expect(revealed.cards.map((card) => card.bodyTypeLabel)).toEqual(revealed.cards.map(() => "Hatchback")); expect(revealed.cards.every((card) => ["Manuel", "Otomatik", "Çift kavramalı otomatik", "Tek oranlı otomatik"].includes(card.transmissionLabel ?? ""))).toBe(true); expect(traces).toContainEqual(expect.objectContaining({ phase: "OFFER_RESPONSE", interpretationSource: "DETERMINISTIC_OFFER_RESPONSE", providerCalled: false, offerResponse: "ACCEPT" }));
  });
  it("creates a governed offer for a complete first-car request with a hard budget", async () => {
    const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter: model({ first: result("first", []) }), realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-19T00:00:00.000Z") }) });
    const output = await runCarsDecisionTurnV2({ conversationId: "complete-first-car", messageId: "first", idempotencyKey: "first", expectedConversationRevision: 0, userMessage: "İlk arabam olacak; şehir içinde otomatik hibrit hatchback istiyorum, bütçem maksimum 3 milyon.", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    expect(output.state).toBe("AWAITING_CONSENT"); expect(output.offer?.token).toBeTruthy(); expect(output.cards).toEqual([]); expect(output.message).toMatch(/görmek ister misin/iu);
  });
  it("keeps offer ids unique when separate conversations reuse the same client message id", async () => {
    const offerStore = new InMemoryGovernedOfferStore(); const outputs = [];
    for (const conversationId of ["same-message-a", "same-message-b"]) { const store = new InMemoryV2ConversationStore(); const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter: model({ first: result("first", []) }), realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-19T00:00:00.000Z") }) }); outputs.push(await runCarsDecisionTurnV2({ conversationId, messageId: "first", idempotencyKey: "first", expectedConversationRevision: 0, userMessage: "Otomatik hibrit hatchback araç istiyorum, bütçe önemli değil.", requestTime: "2026-08-19T00:00:00.000Z" }, composition)); }
    expect(outputs[0]?.offer?.offerId).toBeTruthy(); expect(outputs[1]?.offer?.offerId).toBeTruthy(); expect(outputs[0]?.offer?.offerId).not.toBe(outputs[1]?.offer?.offerId);
  });
  it("keeps the real temporal blocker on August 16", async () => { const composition = createCarsDecisionV2ProductionComposition({ store: new InMemoryV2ConversationStore(), interpreter: model({ temporal: result("temporal", ["GREETING"]) }), realizer, shadow: true }); const output = await runCarsDecisionTurnV2({ conversationId: "temporal", messageId: "temporal", idempotencyKey: "temporal", expectedConversationRevision: 0, userMessage: "Merhaba", requestTime: "2026-08-16T00:00:00.000Z" }, composition); expect(output.recoverableStatus).toBe("CATALOG_UNAVAILABLE"); });
  it("enforces cargo-first semantics before action selection and reduces the real catalog pool", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ cargo: result("cargo", ["USAGE_STATEMENT"]) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    await runCarsDecisionTurnV2({ conversationId: "cargo-semantic", messageId: "cargo", idempotencyKey: "cargo", expectedConversationRevision: 0, userMessage: "Şehir içi dağıtım için kapalı yük alanı istiyorum, arka koltuklara gerek yok.", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    const decision = traces.find((trace) => trace.phase === "DECISION")!; const buckets = decision.technicalBuckets as { eligible: number; eliminated: number };
    expect(buckets.eligible).toBeLessThan(577); expect(buckets.eliminated).toBeGreaterThan(0);
    const constraints = (await store.load("cargo-semantic"))!.memory!.events.filter((event) => event.eventType === "CONSTRAINT");
    expect(constraints).toEqual(expect.arrayContaining([expect.objectContaining({ field: "usageArchitecture", decisionEffect: "HARD_FILTER" }), expect.objectContaining({ field: "rearSeatPreference", decisionEffect: "STRONG_RANK" })]));
  });
  it("never dead-ends a fully stated cargo request with a generic acknowledgement", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ cargo: result("cargo", []) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId: "cargo-complete", messageId: "cargo", idempotencyKey: "cargo", expectedConversationRevision: 0, userMessage: "Şehir içinde mal dağıtıyorum. Caddy tarzı kapalı yük alanı olsun, arka koltuğa gerek yok. Dizel otomatik istiyorum, bütçem maksimum 3 milyon.", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    const decision = traces.find((trace) => trace.phase === "DECISION")!;
    expect(decision.action).not.toBe("ANSWER_DIRECTLY"); expect(output.message).not.toMatch(/ihtiyacını birlikte daraltalım/iu); expect(output.options.map((option) => option.label)).not.toEqual(expect.arrayContaining(["SUV/crossover", "Sedan"]));
    expect(["EXPLAIN_CONFLICT", "REQUEST_REVEAL_CONSENT", "ASK_MATERIAL_QUESTION"]).toContain(decision.action);
  });
  it("supersedes body corrections and recomputes from the full snapshot", async () => {
    const store = new InMemoryV2ConversationStore(); const traces: Readonly<Record<string, unknown>>[] = [];
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ suv: result("suv", []), sedan: result("sedan", []), correction: result("correction", ["CORRECTION"]) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    await runCarsDecisionTurnV2({ conversationId: "body-correction", messageId: "suv", idempotencyKey: "suv", expectedConversationRevision: 0, userMessage: "SUV", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    await runCarsDecisionTurnV2({ conversationId: "body-correction", messageId: "sedan", idempotencyKey: "sedan", expectedConversationRevision: 1, userMessage: "Sedan", requestTime: "2026-08-19T00:01:00.000Z" }, composition);
    await runCarsDecisionTurnV2({ conversationId: "body-correction", messageId: "correction", idempotencyKey: "correction", expectedConversationRevision: 2, userMessage: "Pickup demedim, sedan dedim", requestTime: "2026-08-19T00:02:00.000Z" }, composition);
    const events = (await store.load("body-correction"))!.memory!.events.filter((event) => event.eventType === "CONSTRAINT" && event.field === "bodyStyle");
    expect(events).toHaveLength(3); expect(events[1]).toMatchObject({ supersedesId: events[0]!.id }); expect(events[2]).toMatchObject({ supersedesId: events[1]!.id, normalizedValue: { operator: "EQUALS", value: "Sedan" } });
    const finalDecision = traces.filter((trace) => trace.phase === "DECISION").at(-1)!; expect((finalDecision.technicalBuckets as { eligible: number }).eligible).toBeLessThan(577);
  });
  it("binds model lookup to the generated catalog index", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ lookup: result("lookup", ["MODEL_LOOKUP_REQUEST"]) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    await runCarsDecisionTurnV2({ conversationId: "lookup-authority", messageId: "lookup", idempotencyKey: "lookup", expectedConversationRevision: 0, userMessage: "Micra var mı?", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    const reference = (await store.load("lookup-authority"))!.memory!.events.find((event) => event.eventType === "MODEL_REFERENCE");
    expect(reference).toMatchObject({ decisionEffect: "LOOKUP_ONLY" }); expect(reference?.resolution).not.toBe("UNRESOLVED");
    expect(traces.find((trace) => trace.phase === "DECISION")).toMatchObject({ action: "ANSWER_MODEL_LOOKUP", lookupResolution: reference?.resolution });
  });
  it("activates and deactivates persona without changing the technical pool", async () => {
    const traces: Readonly<Record<string, unknown>>[] = []; const store = new InMemoryV2ConversationStore(); const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ persona: result("persona", []), clear: result("clear", []) }), realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    await runCarsDecisionTurnV2({ conversationId: "persona-semantic", messageId: "persona", idempotencyKey: "persona", expectedConversationRevision: 0, userMessage: "Premium ve şık olsun", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    await runCarsDecisionTurnV2({ conversationId: "persona-semantic", messageId: "clear", idempotencyKey: "clear", expectedConversationRevision: 1, userMessage: "Fark etmez", requestTime: "2026-08-19T00:01:00.000Z" }, composition);
    const decisions = traces.filter((trace) => trace.phase === "DECISION"); expect(decisions[0]?.persona).toMatchObject({ activated: true, requestedTraits: ["DESIGN", "PRESTIGE"] }); expect((decisions[0]?.technicalBuckets as { eligible: number }).eligible).toBe(577); expect(decisions[1]?.persona).toMatchObject({ activated: false, affectedRanking: false });
  });
  it("keeps available cash flexible and applies only an explicit hard ceiling", async () => {
    const store = new InMemoryV2ConversationStore(); const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ cash: result("cash", []), ceiling: result("ceiling", []) }), realizer, shadow: true });
    await runCarsDecisionTurnV2({ conversationId: "budget-semantic", messageId: "cash", idempotencyKey: "cash", expectedConversationRevision: 0, userMessage: "5 milyon nakitim var, üstü için kredi kullanabilirim", requestTime: "2026-08-19T00:00:00.000Z" }, composition);
    expect((await store.load("budget-semantic"))!.memory!.budget).toMatchObject({ availableCash: { amount: 5_000_000, currency: "TRY" }, financeFlexibility: "YES", unresolvedFinancedCeiling: true }); expect((await store.load("budget-semantic"))!.memory!.budget.maximumHardCeiling).toBeUndefined();
    await runCarsDecisionTurnV2({ conversationId: "budget-semantic", messageId: "ceiling", idempotencyKey: "ceiling", expectedConversationRevision: 1, userMessage: "5 milyon üstüne çıkmam", requestTime: "2026-08-19T00:01:00.000Z" }, composition);
    expect((await store.load("budget-semantic"))!.memory!.budget.maximumHardCeiling).toEqual({ amount: 5_000_000, currency: "TRY" });
  });
  it("keeps offer authorization and reveal deterministic across twenty replays even with realization fallback", async () => {
    const signatures: string[] = [];
    const invalidRealizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };
    for (let index = 0; index < 20; index += 1) {
      const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore();
      const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter: model({ recommendation: result("recommendation", ["RECOMMENDATION_REQUEST"], { directAnswerRequests: [{ kind: "RECOMMENDATION_REQUEST" }] }), "skip-body": result("skip-body", ["DECLINE_TO_ANSWER"]), "skip-fuel": result("skip-fuel", ["DECLINE_TO_ANSWER"]), "skip-transmission": result("skip-transmission", ["DECLINE_TO_ANSWER"]), "exclude-budget": result("exclude-budget", ["BUDGET_STATEMENT"]), consent: result("consent", ["OFFER_ACCEPTANCE"]) }), realizer: invalidRealizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-19T00:05:00.000Z") }) });
      const offered = await discoverAndOffer(`determinism-${index}`, composition);
      const revealed = await runCarsDecisionTurnV2({ conversationId: `determinism-${index}`, messageId: "consent", idempotencyKey: "consent", expectedConversationRevision: 5, userMessage: "Göster bakalım", offerToken: offered.offer!.token, requestTime: "2026-08-19T00:05:00.000Z" }, composition);
      expect(offered.cards).toEqual([]); expect(revealed.cards.length).toBeGreaterThan(0);
      signatures.push(JSON.stringify(revealed.cards.map((card) => card.exactVariantId)));
    }
    expect(new Set(signatures)).toHaveLength(1);
  }, 60_000);
});
