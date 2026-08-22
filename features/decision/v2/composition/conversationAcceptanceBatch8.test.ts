import { describe, expect, it } from "vitest";
import { createHmacOfferSigner } from "../offer/signer.server";
import { InMemoryGovernedOfferStore } from "../offer/store";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import type { NaturalRealizationModel } from "../realization/types";
import { createCarsDecisionV2ProductionComposition } from "./production.server";

const empty = (messageId: string): InterpretationResult => ({ schemaVersion: 1, messageId, acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] });
const interpreter: StructuredInterpretationModel = { interpret: async ({ messageId }) => empty(messageId) };
const realizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };

const starts = [
  "Selam dostum, araba almak istiyorum.",
  "Merhaba, ilk arabam olacak; biraz heyecanlıyım.",
  "Eşime sürpriz bir otomobil almak istiyorum.",
  "Kızım okula gidip gelsin diye sıfır araç bakıyorum.",
  "Oğluma ilk arabasını hediye edeceğim, babalık zor iş 🙂",
  "Şehir içinde her gün kullanacağım bir araba lazım.",
  "Aileyle hafta sonu da kullanacağımız bir araç arıyorum.",
  "Uzun yolda yormayacak yeni bir otomobil istiyorum.",
  "Şehir içinde koli dağıtacağım, büyük panelvan gerekmiyor.",
  "Köy yolunda kullanacağım, yollar bozuk ve bazen çamurlu.",
  "Hızlı ama günlük kullanılabilir bir araba istiyorum.",
  "Havalı ama abartısız, premium ve şık bir şey arıyorum.",
  "Satın alma fiyatı erişilebilir bir araç istiyorum.",
  "Araba almak istiyorum ama teknik terimleri bilmiyorum; beni günlük örneklerle yönlendir.",
  "Arkadaşım Clio önerdi ama önce sana danışmak istedim.",
  "Clio mu Civic mi kararsız kaldım.",
  "Günlük kullanıma elektrikli SUV istiyorum; bütçem 2 milyon civarı.",
  "Sedan, benzinli ve otomatik bir araç bakıyorum.",
  "Caddy tarzı kapalı kasa, şehir içi işe uygun araç lazım.",
  "Arazi için pickup düşünüyorum; dört çeker iyi olur.",
] as const;

const answerProfiles = [
  { usage: "günlük", body: "Hatchback", fuel: "Elektrik", transmission: "Otomatik", budget: "1 milyon param var", drivenWheels: "Dört çeker", seats: "5 koltuk" },
  { usage: "aile ve yolcu kullanımı", body: "SUV/crossover", fuel: "Tam hibrit", transmission: "Kesinlikle otomatik", budget: "2 milyon, belki biraz üstü", drivenWheels: "Önden çekiş", seats: "7 koltuk" },
  { usage: "uzun yol", body: "Sedan veya hatchback", fuel: "Benzin veya dizel", transmission: "Manuel", budget: "En fazla 3 milyon", drivenWheels: "Arkadan itiş", seats: "4 koltuk" },
  { usage: "fark etmez", body: "fark etmez", fuel: "yakıt fark etmez", transmission: "fark etmez", budget: "Bütçe önemli değil", drivenWheels: "fark etmez", seats: "fark etmez" },
  { usage: "bozuk yol / köy yolu", body: "Pickup", fuel: "Dizel", transmission: "Otomatik", budget: "1 milyon nakitim var, üstü için kredi kullanabilirim", drivenWheels: "AWD", seats: "5 kişilik" },
] as const;

const journeys = starts.flatMap((start, startIndex) => answerProfiles.map((answers, profileIndex) => ({ id: `foundation-${startIndex + 1}-${profileIndex + 1}`, start, answers })));
type DecisionTrace = { readonly selectedQuestionKey?: string | null; readonly materialQuestionCount?: number; readonly action?: string; readonly recommendationReadiness?: string; readonly availability?: string };

function answerFor(key: string | null | undefined, answers: typeof answerProfiles[number]): string {
  if (key === "discovery.usageScenario") return answers.usage;
  if (key === "discovery.bodyStyle") return answers.body;
  if (key === "discovery.fuelType") return answers.fuel;
  if (key === "discovery.transmission") return answers.transmission;
  if (key === "discovery.budget") return answers.budget;
  if (key === "discovery.drivenWheels") return answers.drivenWheels;
  if (key === "discovery.seats") return answers.seats;
  return "Araba seçimine devam edelim.";
}

describe("V2 eighth batch of one hundred conversational foundation journeys", () => {
  it("contains exactly one hundred distinct journeys", () => {
    expect(journeys).toHaveLength(100);
    expect(new Set(journeys.map((journey) => journey.id)).size).toBe(100);
  });

  it.each(journeys)("$id", async ({ id, start, answers }) => {
    const traces: Readonly<Record<string, unknown>>[] = [];
    const store = new InMemoryV2ConversationStore();
    const offerStore = new InMemoryGovernedOfferStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, interpreter, realizer, signer: createHmacOfferSigner({ secret: "01234567890123456789012345678901", now: () => new Date("2026-08-19T22:05:00.000Z") }), smokeObserver: (trace) => traces.push(trace) });
    const first = await runCarsDecisionTurnV2({ conversationId: id, messageId: "start", idempotencyKey: "start", expectedConversationRevision: 0, userMessage: start, requestTime: "2026-08-19T22:00:00.000Z" }, composition);
    const firstTrace = traces.filter((trace) => trace.phase === "DECISION").at(-1) as DecisionTrace;
    const secondText = first.offer ? "Evet, göster bakalım" : answerFor(firstTrace.selectedQuestionKey, answers);
    const second = await runCarsDecisionTurnV2({ conversationId: id, messageId: "response", idempotencyKey: "response", expectedConversationRevision: 1, userMessage: secondText, requestTime: "2026-08-19T22:01:00.000Z", ...(first.offer ? { offerToken: first.offer.token } : {}) }, composition);
    const secondTrace = traces.filter((trace) => trace.phase === "DECISION").at(-1) as DecisionTrace;

    for (const output of [first, second]) {
      expect(output.message.trim()).not.toBe("");
      expect(output.message).not.toMatch(/Tamam, bu tercihle devam edelim/iu);
      expect(output.message).not.toMatch(/runtime|discriminator|evidence|GASOLINE|DIESEL|BEV|internal estimate/iu);
      expect(output.options.length).toBeLessThanOrEqual(10);
    }
    expect(Number(firstTrace.materialQuestionCount ?? 0)).toBeLessThanOrEqual(1);
    expect(Number(secondTrace.materialQuestionCount ?? 0)).toBeLessThanOrEqual(1);
    if (firstTrace.selectedQuestionKey && secondText !== "Araba seçimine devam edelim.") expect(secondTrace.selectedQuestionKey).not.toBe(firstTrace.selectedQuestionKey);
    if (first.offer) {
      expect(second.state).toBe("REVEALED");
      expect(second.cards.length).toBeGreaterThan(0);
      expect(second.cards.length).toBeLessThanOrEqual(3);
    }
    const memory = (await store.load(id))?.memory;
    expect(memory?.vehicleIntentEstablished).toBe(true);
    expect(memory?.materialQuestionHistory.filter((item) => item.answerStatus === "OPEN").length ?? 0).toBeLessThanOrEqual(1);
  });
});
