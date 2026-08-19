import { describe, expect, it } from "vitest";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import type { NaturalRealizationModel } from "../realization/types";
import { createCarsDecisionV2ProductionComposition } from "./production.server";

const empty = (messageId: string): InterpretationResult => ({ schemaVersion: 1, messageId, acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] });
const interpreter: StructuredInterpretationModel = { interpret: async ({ messageId }) => empty(messageId) };
const realizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };

type Single = { readonly name: string; readonly message: string; readonly field?: string; readonly budget?: string; readonly lookup?: boolean; readonly technical?: boolean; readonly persona?: string };
type Correction = { readonly name: string; readonly first: string; readonly second: string; readonly field: string; readonly terminalValue: string };

const functional: readonly Single[] = [
  ["petrol-car", "Benzinle çalışan küçük bir araba bakıyorum.", "fuelType"], ["diesel-road", "Uzun yol için dizel araç arıyorum.", "fuelType"], ["ev-only", "Tamamen elektrikle giden bir otomobil olsun.", "fuelType"], ["hybrid-no-plug", "Prize takmadan kullanılan hibrit istiyorum.", "fuelType"], ["no-bev", "Elektrikli olmasın, başka yakıtlar olabilir.", "fuelType"],
  ["saloon", "Ayrı bagajlı sedan bir otomobil arıyorum.", "bodyStyle"], ["compact-hatch", "Kısa ve çevik bir hatchback olsun.", "bodyStyle"], ["high-suv", "Yüksek yapılı SUV istiyorum.", "bodyStyle"], ["two-door-coupe", "İki kapılı coupe tarzına yakınım.", "bodyStyle"], ["estate", "Uzun tavanlı station wagon arıyorum.", "bodyStyle"],
  ["auto-traffic", "Trafikte vitesle uğraşmayayım, otomatik olsun.", "transmission"], ["manual-control", "Vitesi kendim değiştirmek istiyorum, manuel olsun.", "transmission"], ["auto-mandatory", "Otomatik vites olmazsa olmaz.", "transmission"], ["manual-mandatory", "Kesinlikle manuel bir otomobil olmalı.", "transmission"], ["auto-city", "Şehir içinde rahat etmek için otomatik istiyorum.", "transmission"],
  ["five-seats", "Ailem için en az 5 koltuk şart.", "seats"], ["seven-seats", "Yedi kişilik bir araç gerekli.", "seats"], ["large-boot", "Bagajı aile tatili yükünü alacak kadar geniş olsun.", "luggageLitres"], ["two-suitcases", "Bagaja iki büyük bavul rahatça sığsın.", "luggageLitres"], ["four-wheel", "Dört çeker bir araç arıyorum.", "drivenWheels"],
].map(([name, message, field]) => ({ name, message, field }));

const corrections: readonly Correction[] = [
  ["suv-to-sedan", "SUV istiyorum.", "Fikrimi değiştirdim, sedan olsun.", "bodyStyle", "Sedan"], ["sedan-to-hatch", "Sedan düşünüyorum.", "Sedan değil, hatchback dedim sayalım.", "bodyStyle", "Hatchback"], ["hatch-to-suv", "Hatchback olabilir.", "Artık SUV istiyorum.", "bodyStyle", "SUV"], ["coupe-to-sedan", "Coupe bakıyorum.", "Coupe'den vazgeçtim, sedan olsun.", "bodyStyle", "Sedan"], ["suv-to-coupe", "SUV olsun.", "Düzeltme: coupe istiyorum.", "bodyStyle", "Coupe"],
  ["sedan-to-wagon", "Sedan arıyorum.", "Sedan demedim, station wagon dedim.", "bodyStyle", "Station Wagon"], ["wagon-to-suv", "Station wagon istiyorum.", "Fikrimi değiştirdim, SUV olsun.", "bodyStyle", "SUV"], ["coupe-to-hatch", "Coupe istiyorum.", "Artık hatchback olsun.", "bodyStyle", "Hatchback"], ["hatch-to-sedan", "Hatchback düşünüyorum.", "Düzelt, sedan istiyorum.", "bodyStyle", "Sedan"], ["sedan-to-coupe", "Sedan olsun.", "Sedan değil, coupe istiyorum.", "bodyStyle", "Coupe"],
  ["gas-to-diesel", "Benzinli istiyorum.", "Fikrimi değiştirdim, dizel olsun.", "fuelType", "DIESEL"], ["diesel-to-hybrid", "Dizel bakıyorum.", "Artık hibrit istiyorum.", "fuelType", "MHEV"], ["hybrid-to-electric", "Hibrit olsun.", "Düzeltme: elektrikli istiyorum.", "fuelType", "BEV"], ["electric-to-gas", "Elektrikli düşünüyorum.", "Elektrikli istemiyorum, benzinli olsun.", "fuelType", "GASOLINE"], ["gas-to-any", "Benzinli olsun.", "Yakıt fark etmez.", "fuelType", "CLEARED"],
  ["auto-to-manual", "Otomatik istiyorum.", "Fikrimi değiştirdim, manuel olsun.", "transmission", "MANUAL"], ["manual-to-auto", "Manuel bakıyorum.", "Artık otomatik istiyorum.", "transmission", "AUTOMATIC"], ["auto-correct-manual", "Otomatik olsun.", "Düzeltme: manuel dedim.", "transmission", "MANUAL"], ["manual-correct-auto", "Manuel olsun.", "Manuel değil, otomatik istiyorum.", "transmission", "AUTOMATIC"], ["auto-repeat", "Otomatik düşünüyorum.", "Otomatik tercihim devam ediyor.", "transmission", "AUTOMATIC"],
].map(([name, first, second, field, terminalValue]) => ({ name, first, second, field, terminalValue }));

const budgets: readonly Single[] = [
  ["budget-words", "İki milyon civarında bütçem var.", "PREFERRED_BUDGET"], ["budget-decimal", "Bütçem yaklaşık 2,75 milyon TL.", "PREFERRED_BUDGET"], ["budget-upper", "3,2 milyon TL üstüne çıkamam.", "MAXIMUM_HARD_CEILING"], ["budget-max-short", "Max 4 mn verebilirim.", "MAXIMUM_HARD_CEILING"], ["budget-ceiling", "Tavan bütçem 4,5 milyon.", "MAXIMUM_HARD_CEILING"],
  ["cash-credit", "2 milyon nakitim var, kredi kullanabilirim.", "AVAILABLE_CASH"], ["cash-only", "3 milyon nakitim mevcut.", "AVAILABLE_CASH"], ["finance-open", "Bütçem 2 milyon ama finansmana açığım.", "PREFERRED_BUDGET"], ["ignore-budget", "Para sınırı koymayalım, bütçe önemli değil.", "EXCLUDE_FROM_DECISION"], ["budget-any", "Bütçe fark etmez, uygun olanı bul.", "EXCLUDE_FROM_DECISION"],
  ["budget-1500k", "Yaklaşık 1500 bin TL ayırdım.", "PREFERRED_BUDGET"], ["budget-6m", "En fazla 6 milyon TL harcarım.", "MAXIMUM_HARD_CEILING"], ["budget-around-7", "7 milyon civarı olabilir.", "PREFERRED_BUDGET"], ["budget-8-ceiling", "8 milyon benim kesin tavanım.", "MAXIMUM_HARD_CEILING"], ["cash-finance-5", "5 milyon nakit var, üstü için kredi olabilir.", "AVAILABLE_CASH"],
].map(([name, message, budget]) => ({ name, message, budget }));

const lookups: readonly Single[] = ["Tesla Model 3", "Toyota Yaris Cross", "Renault Megane Sedan", "Hyundai IONIQ 9", "BMW 320i", "Opel Corsa", "Toyota Yaris", "Renault Captur", "Hyundai Tucson", "CUPRA Leon", "Citroën C4 X", "MG MG3", "Fiat Egea", "Ford Ranger", "Volkswagen Caddy"].map((modelName, index) => ({ name: `lookup-${index + 1}`, message: `${modelName} katalogda var mı?`, lookup: true }));

const technicalMessages = [
  "DC hızlı şarj ne demek?", "Şarj molası neden her araçta farklı sürüyor, açıkla.", "Elektrikli menzil günlük hayatta neyi anlatır?", "L/100 km değerini nasıl okumalıyım?", "300 litre bagaj gerçekte ne kadar eşya alır?", "500 litre bagaja neler sığar?", "150 kW güçlü mü, günlük örnek ver.", "250 kW motor gücü ne ifade ediyor?", "Önden çekiş ile dört çeker farkını açıkla.", "PHEV ile tam hibrit farkını anlat.", "Çift kavramalı otomatik ne demek?", "Tork nedir, sürerken nerede hissederim?", "0-100 süresi günlük kullanımda önemli mi?", "Batarya kapasitesi ile menzil aynı şey mi?", "Payload ne demek, ticari araçta açıkla.",
] as const;
const technical: readonly Single[] = technicalMessages.map((message, index) => ({ name: `technical-new-${index + 1}`, message, technical: true }));

const persona: readonly Single[] = [
  ["quiet-luxury", "Gösterişsiz ama kaliteli ve sade dursun.", "MINIMALISM"], ["executive", "Ağırbaşlı ve prestijli bir karakteri olsun.", "PRESTIGE"], ["elegant", "Zarif, temiz çizgili ve şık görünsün.", "DESIGN"], ["bold", "Dikkat çekici ve dinamik bir araç istiyorum.", "DRIVING_ENGAGEMENT"], ["future", "İçinde gelecekteymişim gibi teknolojik hissettirsin.", "TECHNOLOGY"],
  ["adventure", "Doğa gezilerine yakışan macera ruhlu olsun.", "ADVENTURE"], ["minimal", "Sade ve minimalist tasarım istiyorum.", "MINIMALISM"], ["sport-character", "Gerçekten sportif karakterli bir otomobil olsun.", "DRIVING_ENGAGEMENT"], ["prestige-look", "Premium ve ağırbaşlı görünsün.", "PRESTIGE"], ["design-focus", "Tasarımı zarif ve dikkat çekici olsun.", "DESIGN"],
  ["tech-look", "Fütüristik ve teknolojik bir havası olsun.", "TECHNOLOGY"], ["masculine-neutral", "Erkeksi, güçlü çizgileri olan bir tasarım istiyorum.", "DRIVING_ENGAGEMENT"], ["understated", "Gösterişsiz ve sade bir otomobil arıyorum.", "MINIMALISM"], ["premium-design", "Prestijli ama aynı zamanda şık olsun.", "PRESTIGE"], ["dynamic-design", "Dinamik ve tasarım odaklı görünsün.", "DESIGN"],
].map(([name, message, trait]) => ({ name, message, persona: trait }));

const singles: readonly Single[] = [...functional, ...budgets, ...lookups, ...technical, ...persona];

describe("V2 fourth batch of one hundred distinct conversations", () => {
  it("contains exactly one hundred new scenarios", () => expect(singles.length + corrections.length).toBe(100));

  it.each(singles)("$name", async ({ name, message, field, budget, lookup, technical: asksTechnical, persona: trait }) => {
    const store = new InMemoryV2ConversationStore(); const traces: Readonly<Record<string, unknown>>[] = [];
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter, realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId: `batch4-${name}`, messageId: "m1", idempotencyKey: "m1", expectedConversationRevision: 0, userMessage: message, requestTime: "2026-08-20T14:00:00.000Z" }, composition);
    expect(output.message.trim()).not.toBe(""); expect(output.cards).toEqual([]); expect(output.options.length).toBeLessThanOrEqual(10);
    expect(output.message).not.toMatch(/GASOLINE|DIESEL|MHEV|HEV|PHEV|BEV|runtime|fingerprint|authorization|discriminator|evidence/iu);
    const memory = (await store.load(`batch4-${name}`))!.memory!;
    if (field) expect(memory.events.some((event) => event.eventType === "CONSTRAINT" && event.field === field)).toBe(true);
    if (budget === "EXCLUDE_FROM_DECISION") expect(memory.events.some((event) => event.eventType === "BUDGET_MUTATION" && event.operation === "EXCLUDE_FROM_DECISION")).toBe(true);
    else if (budget) expect(memory.events.some((event) => event.eventType === "BUDGET_MUTATION" && "field" in event && event.field === budget)).toBe(true);
    if (lookup) expect(memory.events.some((event) => event.eventType === "MODEL_REFERENCE")).toBe(true);
    if (asksTechnical) expect(traces.find((trace) => trace.phase === "DECISION")).toMatchObject({ action: "EXPLAIN_TECHNICAL_CONCEPT", materialQuestionCount: 0 });
    if (trait) expect(memory.events.some((event) => event.eventType === "PERSONA_ACTIVATED" && event.requestedTraits.includes(trait as never))).toBe(true);
  });

  it.each(corrections)("$name", async ({ name, first, second, field, terminalValue }) => {
    const store = new InMemoryV2ConversationStore(); const composition = createCarsDecisionV2ProductionComposition({ store, interpreter, realizer, shadow: true }); const conversationId = `batch4-correction-${name}`;
    await runCarsDecisionTurnV2({ conversationId, messageId: "m1", idempotencyKey: "m1", expectedConversationRevision: 0, userMessage: first, requestTime: "2026-08-20T14:00:00.000Z" }, composition);
    const output = await runCarsDecisionTurnV2({ conversationId, messageId: "m2", idempotencyKey: "m2", expectedConversationRevision: 1, userMessage: second, requestTime: "2026-08-20T14:01:00.000Z" }, composition);
    expect(output.message.trim()).not.toBe(""); expect(output.cards).toEqual([]);
    const events = (await store.load(conversationId))!.memory!.events.filter((event) => event.eventType === "CONSTRAINT" && event.field === field);
    if (terminalValue === "CLEARED") expect(events.at(-1)).toMatchObject({ decisionEffect: "NONE", normalizedValue: null });
    else { expect(events).toHaveLength(2); expect(events[1]).toMatchObject({ supersedesId: events[0]!.id }); expect(JSON.stringify(events[1] && "normalizedValue" in events[1] ? events[1].normalizedValue : undefined)).toContain(terminalValue); }
  });
});
