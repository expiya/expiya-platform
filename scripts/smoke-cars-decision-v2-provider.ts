import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

import { getOpenAIClient } from "../lib/openai";
import { createCarsDecisionV2ProductionComposition } from "../features/decision/v2/composition/production.server";
import { InMemoryGovernedOfferStore } from "../features/decision/v2/offer/store";
import { createHmacOfferSigner } from "../features/decision/v2/offer/signer.server";
import { InMemoryV2ConversationStore } from "../features/decision/v2/orchestrator/store";
import { runCarsDecisionTurnV2 } from "../features/decision/v2/orchestrator/runCarsDecisionTurnV2";
import { validatePublicDecisionTurnOutput } from "../features/decision/v2/orchestrator/publicOutput";
import { createOpenAIStructuredProviderTransport, readCarsDecisionV2ProviderConfig } from "../features/decision/v2/provider/openaiTransport.server";
import { createStructuredProviderAdapters } from "../features/decision/v2/provider/structuredProvider";
import { createProductionCatalogReleaseRepository } from "../features/decision/v2/catalog/fileSystemRepository.server";
import { loadActiveCatalogSnapshot } from "../features/decision/v2/catalog/snapshot";
import type { ConversationEvent } from "../features/decision/v2/domain/conversationEvent";

type Trace = Readonly<Record<string, unknown>>;
type TurnSpec = { readonly message: string; readonly offerFromPriorTurn?: boolean };
type JourneySpec = { readonly name: string; readonly turns: readonly TurnSpec[] };

const journeys: readonly JourneySpec[] = [
  { name: "greeting-first-car", turns: [{ message: "Merhaba, ilk arabamı alacağım." }] },
  { name: "hybrid-guidance", turns: [{ message: "Hibrit istiyorum ama kW nedir bilmiyorum, açıklar mısın?" }] },
  { name: "body-correction", turns: [{ message: "SUV olabilir." }, { message: "Hayır, sedan demek istedim." }] },
  { name: "budget-semantics", turns: [{ message: "2 milyon nakitim var, kredi kullanabilirim ama kesin tavan söylemedim." }, { message: "En fazla 3 milyon; bunun üstüne çıkmam." }] },
  { name: "explicit-persona", turns: [{ message: "Şık ve prestijli karakteri açıkça tercih ediyorum." }] },
  { name: "cargo-first", turns: [{ message: "Şehir içinde mal dağıtıyorum. Büyük panelvan gerekmiyor. Caddy tarzı yeterli. Arka koltuklara gerek yok, hazır kapalı yük alanı istiyorum." }] },
  { name: "catalog-model-lookup", turns: [{ message: "Micra katalogda var mı?" }] },
  { name: "internal-estimate-guidance", turns: [{ message: "5 milyon üstüne çıkmam; güncel fiyatı doğrulanmamış seçenekleri de yaklaşık bütçe değerlendirmesinde kaybetme." }] },
  { name: "abuse-with-correction", turns: [{ message: "Elektrikli istiyorum." }, { message: "Salak mısın, hibrit dedim; elektrikli demedim." }] },
  { name: "offer-consent-reveal", turns: [{ message: "Hadi seçelim, önerini görmek istiyorum." }, { message: "Evet, göster.", offerFromPriorTurn: true }] },
];

const terminalConstraints = (events: readonly ConversationEvent[]) => {
  const constraints = events.filter((event) => event.eventType === "CONSTRAINT");
  const superseded = new Set(constraints.flatMap((event) => event.supersedesId ? [event.supersedesId] : []));
  return constraints.filter((event) => event.status === "ACTIVE" && !superseded.has(event.id)).map((event) => ({ field: event.field, value: event.normalizedValue, effect: event.decisionEffect }));
};

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_REQUIRED");
  const codeFingerprint = process.env.CARS_DECISION_V2_SMOKE_CODE_FINGERPRINT;
  if (!codeFingerprint || !/^[a-f0-9]{64}$/u.test(codeFingerprint)) throw new Error("SMOKE_CODE_FINGERPRINT_REQUIRED");
  const config = readCarsDecisionV2ProviderConfig(process.env);
  const adapters = createStructuredProviderAdapters({ transport: createOpenAIStructuredProviderTransport(getOpenAIClient(), config), timeoutMs: config.timeoutMs });
  const catalog = await loadActiveCatalogSnapshot({ repository: createProductionCatalogReleaseRepository(process.cwd()), now: new Date("2026-08-19T00:00:00.000Z") });
  if (catalog.status !== "READY") throw new Error("SMOKE_CATALOG_NOT_READY");
  const internalAmounts = new Set(catalog.snapshot.variants.flatMap((variant) => variant.activeNewPrice?.consumerVisibility === "INTERNAL_ONLY" ? [String(variant.activeNewPrice.amountTry)] : []));
  const summaries: Record<string, unknown>[] = [];

  for (const [journeyIndex, journey] of journeys.entries()) {
    const conversationId = `provider-final-${journeyIndex + 1}-${randomBytes(6).toString("hex")}`;
    const store = new InMemoryV2ConversationStore(); const offerStore = new InMemoryGovernedOfferStore(); const trace: Trace[] = []; let currentTurn = 0; let currentPhase = "SETUP";
    const safeMeta = (phase: string) => ({ runId: "v2-final-authority-boundary", codeFingerprint, journeyId: journeyIndex + 1, journeyName: journey.name, turnIndex: currentTurn, completedJourneys: summaries.length, conversationHash: createHash("sha256").update(conversationId).digest("hex").slice(0, 16), phase });
    const interpreter = { interpret: async (request: Parameters<typeof adapters.interpreter.interpret>[0]) => { currentPhase = "INTERPRETATION"; console.error(JSON.stringify(safeMeta(currentPhase))); return adapters.interpreter.interpret(request); } };
    const realizer = { realize: async (request: Parameters<typeof adapters.realizer.realize>[0]) => { currentPhase = "REALIZATION"; console.error(JSON.stringify(safeMeta(currentPhase))); return adapters.realizer.realize(request); } };
    const signer = createHmacOfferSigner({ secret: randomBytes(48).toString("base64url"), now: () => new Date(`2026-08-19T00:${String(journey.turns.length).padStart(2, "0")}:00.000Z`) });
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, signer, interpreter, realizer, smokeObserver: (value) => trace.push(value) });
    const turnReports: Record<string, unknown>[] = []; let offerToken: string | undefined; let priorEligible = 577; let finalOutput;
    for (const [turnIndex, turn] of journey.turns.entries()) {
      currentTurn = turnIndex + 1; currentPhase = turn.offerFromPriorTurn ? "CONSENT" : "DECISION"; console.error(JSON.stringify(safeMeta(currentPhase)));
      const messageId = `journey-${journeyIndex + 1}-turn-${turnIndex + 1}`; const beforeEvents = (await store.load(conversationId))?.memory?.events ?? [];
      let output;
      try { output = await runCarsDecisionTurnV2({ conversationId, messageId, idempotencyKey: messageId, expectedConversationRevision: turnIndex, userMessage: turn.message, ...(turn.offerFromPriorTurn && offerToken ? { offerToken } : {}), requestTime: `2026-08-19T00:${String(turnIndex).padStart(2, "0")}:00.000Z` }, composition); }
      catch (error) { console.error(JSON.stringify({ ...safeMeta(currentPhase), errorClass: error instanceof Error ? error.name : "UNKNOWN", errorCode: error instanceof Error ? error.message.split(":")[0] : "UNKNOWN" })); throw error; }
      finalOutput = output; offerToken = output.offer?.token ?? offerToken;
      const record = await store.load(conversationId); const allEvents = record?.memory?.events ?? []; const newEvents = allEvents.slice(beforeEvents.length); const decision = trace.filter((item) => item.phase === "DECISION").at(-1) ?? {}; const realization = trace.filter((item) => item.phase === "REALIZATION").at(-1) ?? {}; const eligible = Number((decision.technicalBuckets as { eligible?: number } | undefined)?.eligible ?? priorEligible);
      const serialized = JSON.stringify(output); const validation = validatePublicDecisionTurnOutput(output);
      assert.ok(output.message.trim(), `${journey.name}:EMPTY_PUBLIC_MESSAGE`); assert.equal(validation.length, 0, `${journey.name}:PUBLIC_VALIDATION_FAILED`); assert.ok([...internalAmounts].every((amount) => !serialized.includes(amount)), `${journey.name}:INTERNAL_ESTIMATE_LEAK`); assert.ok(Number(decision.materialQuestionCount ?? 0) <= 1, `${journey.name}:MULTIPLE_MATERIAL_QUESTIONS`);
      turnReports.push({ turn: turnIndex + 1, acts: decision.interpretedActs, semanticCompleteness: decision.semanticCompleteness, mutationCounts: decision.acceptedMutationCounts, eventTypes: newEvents.map((event) => event.eventType), activeConstraints: terminalConstraints(allEvents), candidatePool: { beforeEligible: priorEligible, afterEligible: eligible, buckets: decision.technicalBuckets }, affordability: decision.affordabilityBuckets, persona: decision.persona, lookupResolution: decision.lookupResolution, action: decision.action, materialQuestionCount: decision.materialQuestionCount, directAnswerPlacement: decision.directAnswerPlacement, realization: { firstAttempt: realization.firstAttemptCodes, repairAttempt: realization.repairAttemptCodes, source: realization.source }, offerCandidateIds: decision.shortlistCandidateIds, offerCreated: decision.offerCreated, consentBound: turn.offerFromPriorTurn ? output.state === "REVEALED" : null, revealedCardCount: output.cards.length, publicValidator: "PASS" });
      priorEligible = eligible;
    }
    const memory = (await store.load(conversationId))?.memory; assert.ok(memory, `${journey.name}:MEMORY_MISSING`);
    const constraints = memory.events.filter((event) => event.eventType === "CONSTRAINT"); const active = terminalConstraints(memory.events);
    if (journey.name === "greeting-first-car") assert.equal((turnReports[0] as { action?: string }).action, "SOCIAL_REPLY");
    if (journey.name === "hybrid-guidance") { const fuel = active.find((item) => item.field === "fuelType"); assert.ok(fuel && !JSON.stringify(fuel.value).includes("BEV"), "HYBRID_INCLUDED_BEV"); }
    if (journey.name === "body-correction") { const bodies = constraints.filter((event) => event.field === "bodyStyle"); assert.equal(bodies.length, 2); assert.equal(bodies[1]?.supersedesId, bodies[0]?.id); assert.equal((active.find((item) => item.field === "bodyStyle")?.value as { value?: string })?.value, "Sedan"); }
    if (journey.name === "budget-semantics") { assert.equal(memory.budget.availableCash?.amount, 2_000_000); assert.equal(memory.budget.maximumHardCeiling?.amount, 3_000_000); }
    if (journey.name === "explicit-persona") assert.equal(memory.persona.activated, true);
    if (journey.name === "cargo-first") { const last = turnReports.at(-1)! as { candidatePool: { afterEligible: number } }; assert.ok(last.candidatePool.afterEligible < 577); assert.ok(active.some((item) => item.field === "usageArchitecture")); }
    if (journey.name === "catalog-model-lookup") assert.ok(memory.events.some((event) => event.eventType === "MODEL_REFERENCE" && event.resolution !== "UNRESOLVED"));
    if (journey.name === "internal-estimate-guidance") { const affordability = (turnReports.at(-1)! as { affordability: { estimateWithin: number; estimateOverConditional: number; verifiedOver: number; unresolved: number } }).affordability; assert.equal(memory.budget.maximumHardCeiling?.amount, 5_000_000); assert.equal(memory.budget.budgetUnknown, false); assert.ok(affordability.estimateWithin + affordability.estimateOverConditional > 0, "INTERNAL_ESTIMATE_AUTHORITY_NOT_USED"); assert.ok(affordability.unresolved < 394, "INTERNAL_ESTIMATES_COLLAPSED_TO_PRICE_UNRESOLVED"); assert.ok(affordability.estimateWithin + affordability.estimateOverConditional + affordability.verifiedOver > 0, "NO_MEANINGFUL_AFFORDABILITY_BUCKET"); }
    if (journey.name === "abuse-with-correction") { assert.ok(memory.events.some((event) => event.eventType === "ABUSE")); assert.ok(active.some((item) => item.field === "fuelType" && !JSON.stringify(item.value).includes("BEV"))); }
    if (journey.name === "offer-consent-reveal") { assert.ok(offerToken); assert.equal((turnReports[0] as { revealedCardCount: number }).revealedCardCount, 0); assert.ok((finalOutput?.cards.length ?? 0) >= 1 && (finalOutput?.cards.length ?? 0) <= 3); }
    const journeyResult = { runId: "v2-final-authority-boundary", codeFingerprint, journey: journeyIndex + 1, name: journey.name, userTurnCount: journey.turns.length, conversationHash: safeMeta("COMPLETE").conversationHash, turns: turnReports, finalState: finalOutput?.state, publicSafe: true, status: "PASS" as const };
    summaries.push(journeyResult); console.error(JSON.stringify({ type: "JOURNEY_RESULT", ...journeyResult }));
  }
  console.log(JSON.stringify({ runId: "v2-final-authority-boundary", codeFingerprint, journeyCount: summaries.length, status: "PASS", allPublicSafe: true, allInternalEstimatesHidden: true, summaries }, null, 2));
}

void main();
