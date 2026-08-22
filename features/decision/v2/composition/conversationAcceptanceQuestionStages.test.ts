import { describe, expect, it } from "vitest";
import { createHmacOfferSigner } from "../offer/signer.server";
import { InMemoryGovernedOfferStore } from "../offer/store";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import type { NaturalRealizationModel } from "../realization/types";
import type { QuestionStage } from "../action/types";
import { createCarsDecisionV2ProductionComposition } from "./production.server";

const empty = (messageId: string): InterpretationResult => ({ schemaVersion: 1, messageId, acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] });
const interpreter: StructuredInterpretationModel = { interpret: async ({ messageId }) => empty(messageId) };
const realizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };

type JourneySeed = { readonly message: string; readonly stage: QuestionStage | null; readonly answer: string; readonly prelude?: string; readonly commercial?: boolean; readonly passengerTransport?: boolean; readonly rough?: boolean; readonly seriousOffRoad?: boolean; readonly suppliedBodyFuel?: boolean; readonly earlyBudget?: boolean; readonly comparison?: boolean; readonly correction?: boolean; readonly completeToOffer?: boolean };
const contexts: readonly JourneySeed[] = [
  { message: "Araba almak istiyorum.", stage: "USAGE_CONTEXT", answer: "Günlük şehir içi", completeToOffer: true },
  { message: "Nasıl bir araba almalıyım bilmiyorum.", stage: "USAGE_CONTEXT", answer: "Aile ve yolcu kullanımı" },
  { message: "Yeni bir araç seçmem gerekiyor.", stage: "USAGE_CONTEXT", answer: "Uzun yol" },
  { message: "Bana uygun sıfır otomobili bulalım.", stage: "USAGE_CONTEXT", answer: "Karma kullanım" },
  { message: "Araç seçeneklerini birlikte daraltalım.", stage: "USAGE_CONTEXT", answer: "Günlük şehir içi" },
  { message: "Ne tür araba alacağıma karar veremedim.", stage: "USAGE_CONTEXT", answer: "Aile ve yolcu kullanımı" },
  { message: "Otomobil tavsiyesi istiyorum.", stage: "USAGE_CONTEXT", answer: "Bozuk yol / köy yolu" },
  { message: "Yeni araba bakıyorum ama nereden başlayacağımı bilmiyorum.", stage: "USAGE_CONTEXT", answer: "Uzun yol" },
  { message: "İhtiyacıma göre bir araç arıyorum.", stage: "USAGE_CONTEXT", answer: "Yük taşıma" },
  { message: "Günlük kullanım için iyi bir arabaya ihtiyacım var.", stage: "VEHICLE_ARCHITECTURE", answer: "Sedan şart", completeToOffer: true },
  { message: "Her gün kullanacağım bir araç arıyorum.", stage: "VEHICLE_ARCHITECTURE", answer: "Hatchback şart" },
  { message: "İşe gidip geleceğim bir otomobil lazım.", stage: "VEHICLE_ARCHITECTURE", answer: "SUV şart" },
  { message: "Gündelik işler için yeni araç bakıyorum.", stage: "VEHICLE_ARCHITECTURE", answer: "Sedan şart" },
  { message: "Şehirde olmasa da günlük kullanım için araba istiyorum.", stage: "VEHICLE_ARCHITECTURE", answer: "Hatchback şart" },
  { message: "İlk arabam olacak, şehir içinde kullanacağım.", stage: "VEHICLE_ARCHITECTURE", answer: "Hatchback şart" },
  { message: "Ailemle hafta içi ve hafta sonu kullanacağım.", stage: "VEHICLE_ARCHITECTURE", answer: "SUV şart" },
  { message: "Çocuklarla aile kullanımı için otomobil arıyorum.", stage: "VEHICLE_ARCHITECTURE", answer: "Station Wagon şart" },
  { message: "Sık sık şehirler arası uzun yol yapacağım.", stage: "VEHICLE_ARCHITECTURE", answer: "Sedan şart" },
  { message: "Uzun yol ağırlıklı yeni bir araç istiyorum.", stage: "VEHICLE_ARCHITECTURE", answer: "SUV şart" },
  { message: "Hem şehir içinde hem uzun yolda kullanacağım.", stage: "VEHICLE_ARCHITECTURE", answer: "Hatchback şart" },
  { message: "Karma kullanım için dengeli bir araba arıyorum.", stage: "VEHICLE_ARCHITECTURE", answer: "Sedan şart" },
  { message: "Şehir içinde mal dağıtıyorum.", stage: "VEHICLE_ARCHITECTURE", answer: "Panel Van şart", commercial: true, completeToOffer: true },
  { message: "Dükkânın kolilerini şehir içinde dağıtacağım.", stage: "VEHICLE_ARCHITECTURE", answer: "Panel Van şart", commercial: true },
  { message: "Genel yük taşıma işi için araç arıyorum.", stage: "VEHICLE_ARCHITECTURE", answer: "Pickup şart", commercial: true },
  { message: "Yolcu taşıma işi için yeni araç lazım.", stage: "VEHICLE_ARCHITECTURE", answer: "Passenger Van şart", passengerTransport: true },
  { message: "Servis ve transfer işinde yolcu taşıyacağım.", stage: "VEHICLE_ARCHITECTURE", answer: "MPV şart", passengerTransport: true },
  { message: "Köyde bozuk yollarda kullanacağım.", stage: "VEHICLE_ARCHITECTURE", answer: "SUV şart", rough: true },
  { message: "Köy yolları ve bozuk zeminde araç kullanacağım.", stage: "VEHICLE_ARCHITECTURE", answer: "Pickup şart", rough: true },
  { message: "Karlı ve çamurlu yollarda kullanacağım.", stage: "VEHICLE_ARCHITECTURE", answer: "SUV şart", rough: true },
  { message: "Kışın kar, baharda çamur olan yola gireceğim.", stage: "VEHICLE_ARCHITECTURE", answer: "Pickup şart", rough: true },
  { message: "Ciddi arazi ve off-road için araç arıyorum.", stage: "VEHICLE_ARCHITECTURE", answer: "SUV şart", seriousOffRoad: true, completeToOffer: true },
  { message: "Zorlu arazide kullanacağım bir otomobil istiyorum.", stage: "VEHICLE_ARCHITECTURE", answer: "Pickup şart", seriousOffRoad: true },
  { message: "Günlük şehir içinde elektrikli hatchback istiyorum.", stage: "BUDGET", answer: "Bütçe önemli değil", suppliedBodyFuel: true, completeToOffer: true },
  { message: "Her gün kullanacağım, benzinli sedan istiyorum.", stage: "TECHNICAL_PREFERENCES", answer: "Manuel", suppliedBodyFuel: true },
  { message: "Uzun yolda dizel SUV istiyorum.", stage: "TECHNICAL_PREFERENCES", answer: "Otomatik", suppliedBodyFuel: true },
  { message: "Aile için tam hibrit MPV istiyorum.", stage: "FUNCTIONAL_NEEDS", answer: "Fark etmez", suppliedBodyFuel: true },
  { message: "Şehir içi kullanımda yakıt fark etmez, hatchback olsun.", stage: "TECHNICAL_PREFERENCES", answer: "Otomatik", suppliedBodyFuel: true },
  { message: "Günlük kullanım için sedan istiyorum, maksimum 3 milyon.", stage: "ENERGY_FIT", answer: "Fark etmez", earlyBudget: true },
  { message: "Aile kullanımı için SUV istiyorum, bütçe önemli değil.", stage: "FUNCTIONAL_NEEDS", answer: "Fark etmez", earlyBudget: true },
  { message: "Uzun yol için sedan düşünüyorum, 4 milyon üstüne çıkamam.", stage: "ENERGY_FIT", answer: "Dizel", earlyBudget: true },
  { message: "Caddy tarzı kapalı kasa istiyorum.", stage: "ENERGY_FIT", answer: "Dizel", commercial: true },
  { message: "Şehir içi dağıtım için panel van istiyorum, bütçe önemli değil.", stage: "ENERGY_FIT", answer: "Fark etmez", commercial: true },
  { message: "Pickup, 4x4 ve dizel istiyorum; ciddi arazide kullanacağım.", stage: "TECHNICAL_PREFERENCES", answer: "Otomatik", seriousOffRoad: true },
  { message: "Köy yolunda kullanacağım; SUV ve dört çeker olsun.", stage: "ENERGY_FIT", answer: "Fark etmez", rough: true },
  { message: "Şehir içinde kullanacağım, gövde tipi fark etmez.", stage: "ENERGY_FIT", answer: "Hibrit olabilir" },
  { message: "Günlük kullanacağım, teknik terimleri bilmiyorum.", stage: "VEHICLE_ARCHITECTURE", answer: "Hatchback şart" },
  { message: "Clio mu Civic mi kararsızım.", stage: "ENERGY_FIT", answer: "Şehir içi", comparison: true },
  { message: "Corolla mı Golf mü karar veremedim.", stage: "ENERGY_FIT", answer: "Aile kullanımı", comparison: true },
  { prelude: "Günlük kullanımda SUV olabilir.", message: "Hayır, sedan demek istedim.", stage: "ENERGY_FIT", answer: "Fark etmez" },
  { prelude: "Günlük kullanımda benzinli tercih ederim.", message: "Yakıt fark etmez, günlük kullanım için olsun.", stage: "VEHICLE_ARCHITECTURE", answer: "Sedan şart" },
];
const journeys = contexts.map((context, index) => ({ id: `stage-journey-${index + 1}`, ...context }));

type DecisionTrace = { selectedQuestionStage?: QuestionStage | null; selectedQuestionKey?: string | null; recommendationReadiness?: string; unansweredDecisionFields?: readonly string[]; materialQuestionCount?: number; generatedQuestionStages?: readonly { stableSemanticKey: string; stage: QuestionStage; eligible: boolean }[]; questionStageCompletion?: readonly { stage: QuestionStage; status: string; reasonCodes: readonly string[] }[]; technicalBuckets?: { eligible: number; notEvaluable: number; eliminated: number } };

describe("V2.2 fifty multi-turn human question-order journeys", () => {
  it("covers fifty isolated journeys", () => expect(journeys).toHaveLength(50));

  it.each(journeys)("$id", async (scenario) => {
    const store = new InMemoryV2ConversationStore();
    const traces: Readonly<Record<string, unknown>>[] = [];
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore: new InMemoryGovernedOfferStore(), interpreter, realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-20T00:05:00.000Z") }), smokeObserver: (trace) => traces.push(trace) });
    let revision = 0;
    if (scenario.prelude) await runCarsDecisionTurnV2({ conversationId: scenario.id, messageId: "prelude", idempotencyKey: "prelude", expectedConversationRevision: revision++, userMessage: scenario.prelude, requestTime: "2026-08-20T00:00:00.000Z" }, composition);
    await runCarsDecisionTurnV2({ conversationId: scenario.id, messageId: "context", idempotencyKey: "context", expectedConversationRevision: revision++, userMessage: scenario.message, requestTime: "2026-08-20T00:01:00.000Z" }, composition);
    const first = traces.filter((trace) => trace.phase === "DECISION").at(-1) as DecisionTrace;
    const eligibleStages = first.generatedQuestionStages?.filter((item) => item.eligible) ?? [];
    expect(first.selectedQuestionStage).toBe(eligibleStages[0]?.stage ?? null);
    expect(first.materialQuestionCount).toBeLessThanOrEqual(1);
    if (scenario.comparison) {
      expect(first.recommendationReadiness).toBe("DIRECT_MODEL_SCOPE");
      expect(first.selectedQuestionKey).toBeTruthy();
    } else if (!scenario.correction && first.materialQuestionCount === 1) {
      expect(first.selectedQuestionKey).toBeTruthy();
      expect(first.unansweredDecisionFields?.length).toBeGreaterThan(0);
    } else {
      expect(first.materialQuestionCount).toBe(0);
      expect(first.selectedQuestionKey).toBeFalsy();
    }
    expect(first.technicalBuckets?.eligible).toBeGreaterThan(0);
    expect(first.questionStageCompletion?.every((stage) => stage.reasonCodes.length > 0)).toBe(true);
    if (scenario.commercial && scenario.stage === "VEHICLE_ARCHITECTURE") {
      const architecture = first.generatedQuestionStages?.find((item) => item.stage === "VEHICLE_ARCHITECTURE");
      expect(architecture?.stableSemanticKey).toBe("discovery.bodyStyle");
    }

    const answer = first.selectedQuestionKey === "discovery.usageScenario" ? (scenario.stage === "USAGE_CONTEXT" && scenario.answer !== "Karma kullanım" ? scenario.answer : "Fark etmez")
      : first.selectedQuestionKey === "discovery.bodyStyle" ? (scenario.stage === "VEHICLE_ARCHITECTURE" ? scenario.answer : "Fark etmez")
      : first.selectedQuestionKey === "discovery.fuelType" ? (scenario.stage === "ENERGY_FIT" ? scenario.answer : "Fark etmez")
      : first.selectedQuestionKey === "discovery.transmission" ? (scenario.stage === "TECHNICAL_PREFERENCES" ? scenario.answer : "Fark etmez")
      : first.selectedQuestionKey === "discovery.budget" ? (scenario.stage === "BUDGET" ? scenario.answer : "Bütçe önemli değil")
      : "Fark etmez";
    await runCarsDecisionTurnV2({ conversationId: scenario.id, messageId: "answer", idempotencyKey: "answer", expectedConversationRevision: revision++, userMessage: answer, requestTime: "2026-08-20T00:02:00.000Z" }, composition);
    const second = traces.filter((trace) => trace.phase === "DECISION").at(-1) as DecisionTrace;
    expect(second.materialQuestionCount).toBeLessThanOrEqual(1);
    if (first.selectedQuestionKey) expect(second.selectedQuestionKey).not.toBe(first.selectedQuestionKey);
    expect(second.technicalBuckets?.eligible).toBeGreaterThanOrEqual(0);
    if (first.selectedQuestionStage === "VEHICLE_ARCHITECTURE" && /şart/iu.test(answer)) expect((second.technicalBuckets?.eligible ?? 0) + (second.technicalBuckets?.notEvaluable ?? 0)).toBeLessThan((first.technicalBuckets?.eligible ?? 0) + (first.technicalBuckets?.notEvaluable ?? 0));

    if (scenario.completeToOffer) {
      let output = null as Awaited<ReturnType<typeof runCarsDecisionTurnV2>> | null;
      for (let step = 0; step < 8 && !output?.offer; step += 1) {
        const decision = traces.filter((trace) => trace.phase === "DECISION").at(-1) as DecisionTrace;
        const key = decision.selectedQuestionKey;
        const answer = key === "discovery.usageScenario" ? "Günlük şehir içi" : key === "discovery.bodyStyle" ? "Hatchback şart" : key === "discovery.budget" ? "Bütçe önemli değil" : key ? "Fark etmez" : "Bana uygun seçenekleri öner.";
        output = await runCarsDecisionTurnV2({ conversationId: scenario.id, messageId: `finish-${step}`, idempotencyKey: `finish-${step}`, expectedConversationRevision: revision++, userMessage: answer, requestTime: `2026-08-20T00:${String(step + 3).padStart(2, "0")}:00.000Z` }, composition);
      }
      expect(output?.state).toBe("AWAITING_CONSENT");
      expect(output?.offer?.token).toBeTruthy();
      expect((traces.filter((trace) => trace.phase === "DECISION").at(-1) as DecisionTrace).materialQuestionCount).toBe(0);
    }
  });
});
