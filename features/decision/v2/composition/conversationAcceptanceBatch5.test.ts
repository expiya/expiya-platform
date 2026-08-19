import { describe, expect, it } from "vitest";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import type { NaturalRealizationModel } from "../realization/types";
import { createCarsDecisionV2ProductionComposition } from "./production.server";

const result = (messageId: string, acts: InterpretationResult["acts"], extra: Partial<InterpretationResult> = {}): InterpretationResult => ({ schemaVersion: 1, messageId, acts, directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [], ...extra });
const model = (values: Readonly<Record<string, InterpretationResult>>): StructuredInterpretationModel => ({ interpret: async ({ messageId }) => values[messageId] ?? result(messageId, []) });
const realizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };
const turn = (conversationId: string, messageId: string, revision: number, userMessage: string) => ({ conversationId, messageId, idempotencyKey: messageId, expectedConversationRevision: revision, userMessage, requestTime: `2026-08-20T16:${String(revision).padStart(2, "0")}:00.000Z` });

const socialMessages = ["Selam", "Selamlar", "Merhaba", "Merhabalar", "Günaydın", "İyi günler", "İyi akşamlar", "Nasılsın?", "Nasıl gidiyor?", "Kolay gelsin", "Hey", "Selam dostum", "Naber?", "Orada mısın?", "Hayırlı işler", "Ne var ne yok?", "Bugün keyfin nasıl?", "Merhaba 😄", "Selam, umarım iyisindir", "Önce bir merhabalaşalım"] as const;
const contextMessages: readonly [string, "FIRST_CAR" | "BUYING_FOR_OTHER" | "HUMOR"][] = [
  ["İlk arabam olacak, biraz heyecanlıyım.", "FIRST_CAR"], ["Hayatımda ilk kez araç alacağım.", "FIRST_CAR"], ["Ehliyeti yeni aldım, ilk otomobilimi arıyorum.", "FIRST_CAR"], ["İlk arabam için buradayım 😁", "FIRST_CAR"], ["Acemiyim, bu benim ilk aracım olacak.", "FIRST_CAR"],
  ["Arabayı kızım için alıyorum.", "BUYING_FOR_OTHER"], ["Oğluma mezuniyet hediyesi araç bakıyorum.", "BUYING_FOR_OTHER"], ["Eşim için şehir otomobili arıyoruz.", "BUYING_FOR_OTHER"], ["Annem kullanacak, ona araç seçelim.", "BUYING_FOR_OTHER"], ["Babam için rahat bir otomobil bakıyorum.", "BUYING_FOR_OTHER"],
  ["Bekarlık bitti, bagaj büyüsün artık 😂", "HUMOR"], ["Arkadaşları biraz kıskandıralım 😎", "HUMOR"], ["Araba benden daha havalı olsun bari 😄", "HUMOR"], ["Beni servise götürmesin de nereye götürürse götürsün 😂", "HUMOR"], ["Dört tekerli terapi arıyorum, şaka bir yana araba lazım 😁", "HUMOR"],
];
const offTopicMessages = ["Bana makarna tarifi ver", "Bugünkü hava nasıl?", "Bir şiir yazar mısın?", "Futbol maçını kim kazanır?", "Telefon önerir misin?", "Kripto para almalı mıyım?", "Bir fıkra anlat", "İstanbul'da restoran öner", "Ödevimi çözer misin?", "Film tavsiyesi ver", "Bana İngilizce öğret", "Kedim neden miyavlıyor?", "Tatil planı yapalım", "Bilgisayar toplamak istiyorum", "Kahve falı bakar mısın?"] as const;
const offTopicEscalations = ["recipe-loop", "weather-loop", "poem-loop", "football-loop", "phone-loop", "crypto-loop", "joke-loop", "travel-loop", "homework-loop", "movie-loop"] as const;
const abuseMessages: readonly [string, boolean][] = [
  ["Salak mısın?", true], ["Aptal gibi cevap verme.", true], ["Gerizekalı mısın nesin?", true], ["Mal mısın, dediğimi anla.", true], ["Lanet olsun sana.", true], ["Salakça konuşuyorsun.", true], ["Aptal sistem.", true], ["Gerizekâlı gibi davranma.", true], ["Mal mısın kardeşim?", true], ["Lanet bir cevap verdin.", true],
  ["Bu cevap olmamış ya.", false], ["Saçmaladın bence.", false], ["Yok artık, ne alaka?", false], ["Kafayı mı yedin?", false], ["Berbat cevap verdin.", false],
];
const abuseEscalations = ["salak", "aptal", "gerizekalı", "mal mısın", "lanet", "salak mısın", "aptal sistem", "gerizekâlı mısın", "mal mısın kardeşim", "lanet olsun"] as const;
const unusualVehicleMessages: readonly [string, string][] = [
  ["Prizde sabaha kadar bekleyebilir ama yolda oyalanmak istemem; elektrikli olsun.", "fuelType"], ["Vites koluyla arkadaş olmak istemiyorum, otomatik olsun.", "transmission"], ["Yere yakın değil, yukarıdan baktıran bir SUV olsun.", "bodyStyle"], ["Bagajı ayrı bir oda gibi olan sedan istiyorum.", "bodyStyle"], ["Şehirde minnacık hissettiren hatchback arıyorum.", "bodyStyle"],
  ["Fişe takmadan elektrik desteği veren hibrit olsun.", "fuelType"], ["Mazotlu olsun, uzun yolda gezeceğim.", "fuelType"], ["Dört pati gibi dört çeker olsun.", "drivenWheels"], ["Evde beş kişiyiz; en az 5 koltuk gerekli.", "seats"], ["Çocuklar ve büyükanneyle yedi kişiyiz, 7 kişilik gerekli.", "seats"],
  ["İki büyük valiz ve bebek arabası taşıyacağım.", "luggageLitres"], ["Hafta sonu aile tatili yükü bagaja girmeli.", "luggageLitres"], ["Dükkânın kolilerini dağıtacağım, kapalı kasa olsun.", "usageArchitecture"], ["Arka taraf insan değil yük taşısın, panel van istiyorum.", "usageArchitecture"], ["Elektrikliye hayır, benzinli devam edelim.", "fuelType"],
];

describe("V2 fifth batch of one hundred unusual and conversational scenarios", () => {
  it("contains exactly one hundred new scenarios", () => expect(socialMessages.length + contextMessages.length + offTopicMessages.length + offTopicEscalations.length + abuseMessages.length + abuseEscalations.length + unusualVehicleMessages.length).toBe(100));

  it.each(socialMessages)("social: %s", async (message) => {
    const id = `batch5-social-${socialMessages.indexOf(message)}`; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ m1: result("m1", ["GREETING"], { socialSignal: { kind: "GREETING" } }) }), realizer, shadow: true });
    const output = await runCarsDecisionTurnV2(turn(id, "m1", 0, message), composition);
    expect(output).toMatchObject({ state: "SOCIAL", cards: [] }); expect(output.message.trim()).not.toBe(""); expect(output.options).toEqual([]);
  });

  it.each(contextMessages)("human context: %s", async (message, kind) => {
    const id = `batch5-context-${contextMessages.findIndex((item) => item[0] === message)}`; const store = new InMemoryV2ConversationStore(); const socialKind = kind === "HUMOR" ? "HUMOR" : kind;
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ m1: result("m1", ["VEHICLE_INTENT", "SOCIAL_MESSAGE"], { socialSignal: { kind: socialKind } }) }), realizer, shadow: true });
    const output = await runCarsDecisionTurnV2(turn(id, "m1", 0, message), composition); const memory = (await store.load(id))!.memory!;
    expect(output.message.trim()).not.toBe(""); expect(output.cards).toEqual([]); expect(memory.events.some((event) => event.eventType === "SOCIAL_INTERACTION")).toBe(true); expect(memory.vehicleIntentEstablished).toBe(true);
  });

  it.each(offTopicMessages)("off-topic: %s", async (message) => {
    const id = `batch5-off-${offTopicMessages.indexOf(message)}`; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ m1: result("m1", ["OFF_TOPIC"], { offTopicSignal: { detected: true } }) }), realizer, shadow: true });
    const output = await runCarsDecisionTurnV2(turn(id, "m1", 0, message), composition);
    expect(output.state).toBe("OFF_TOPIC_RECOVERY"); expect(output.cards).toEqual([]); expect(output.options).toEqual([]); expect(output.message.trim()).not.toBe("");
  });

  it.each(offTopicEscalations)("off-topic escalation: %s", async (name) => {
    const id = `batch5-${name}`; const store = new InMemoryV2ConversationStore(); const values = Object.fromEntries([1, 2, 3].map((index) => [`m${index}`, result(`m${index}`, ["OFF_TOPIC"], { offTopicSignal: { detected: true } })]));
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model(values), realizer, shadow: true }); let output;
    for (let index = 1; index <= 3; index += 1) output = await runCarsDecisionTurnV2(turn(id, `m${index}`, index - 1, `Konu dışı isteğim ${index}`), composition);
    expect(output).toMatchObject({ state: "LIMITED_OR_ENDED", cards: [], options: [] });
  });

  it.each(abuseMessages)("slang/abuse: %s", async (message, abusive) => {
    const id = `batch5-abuse-${abuseMessages.findIndex((item) => item[0] === message)}`; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ m1: result("m1", abusive ? ["ABUSE"] : ["NEGATIVE_FEEDBACK"], abusive ? { abuseSignal: { detected: true } } : {}) }), realizer, shadow: true });
    const output = await runCarsDecisionTurnV2(turn(id, "m1", 0, message), composition); const memory = (await store.load(id))!.memory!;
    expect(output.message.trim()).not.toBe(""); expect(output.message).not.toMatch(/salak|aptal|gerizek[aâ]lı|mal mısın/iu); expect(memory.abuseState.strikeCount).toBe(abusive ? 1 : 0);
  });

  it.each(abuseEscalations)("abuse escalation: %s", async (word) => {
    const id = `batch5-abuse-loop-${abuseEscalations.indexOf(word)}`; const store = new InMemoryV2ConversationStore(); const values = Object.fromEntries([1, 2, 3].map((index) => [`m${index}`, result(`m${index}`, ["ABUSE"], { abuseSignal: { detected: true } })]));
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model(values), realizer, shadow: true }); const outputs = [];
    for (let index = 1; index <= 3; index += 1) outputs.push(await runCarsDecisionTurnV2(turn(id, `m${index}`, index - 1, `${word} ${index}`), composition));
    expect(outputs[0]?.state).toBe("ABUSE_WARNING"); expect(outputs[1]?.state).toBe("ABUSE_WARNING"); expect(outputs[2]?.state).toBe("LIMITED_OR_ENDED"); expect(outputs.every((output) => output.options.length === 0 && output.cards.length === 0)).toBe(true);
  });

  it.each(unusualVehicleMessages)("unusual vehicle language: %s", async (message, field) => {
    const id = `batch5-unusual-${unusualVehicleMessages.findIndex((item) => item[0] === message)}`; const store = new InMemoryV2ConversationStore();
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter: model({ m1: result("m1", []) }), realizer, shadow: true });
    const output = await runCarsDecisionTurnV2(turn(id, "m1", 0, message), composition); const memory = (await store.load(id))!.memory!;
    expect(output.message.trim()).not.toBe(""); expect(output.cards).toEqual([]); expect(memory.events.some((event) => event.eventType === "CONSTRAINT" && event.field === field)).toBe(true);
  });
});
