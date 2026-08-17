import { describe, expect, it } from "vitest";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import type { NaturalRealizationModel } from "../realization/types";
import { createCarsDecisionV2ProductionComposition } from "./production.server";

const empty = (messageId: string): InterpretationResult => ({ schemaVersion: 1, messageId, acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] });
const interpreter: StructuredInterpretationModel = { interpret: async ({ messageId }) => empty(messageId) };
const invalidRealizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };

type Case = { readonly name: string; readonly message: string; readonly fields?: readonly string[]; readonly budgetField?: string; readonly persona?: string; readonly maximumOptions?: number };

const cases: readonly Case[] = [
  { name: "city automatic hybrid hatchback", message: "Şehir içinde kullanacağım, otomatik hibrit hatchback bir araba istiyorum.", fields: ["transmission", "fuelType", "bodyStyle"] },
  { name: "family diesel sedan", message: "Ailem için dizel sedan bir araç arıyorum.", fields: ["fuelType", "bodyStyle"] },
  { name: "electric suv", message: "Elektrikli SUV olsun, bana seçenek hazırla.", fields: ["fuelType", "bodyStyle"] },
  { name: "gasoline coupe", message: "Benzinli coupe bir araba istiyorum.", fields: ["fuelType", "bodyStyle"] },
  { name: "manual hatchback", message: "Manuel hatchback araç öner.", fields: ["transmission", "bodyStyle"] },
  { name: "automatic sedan", message: "Otomatik sedan bir model arıyorum.", fields: ["transmission", "bodyStyle"] },
  { name: "no electric suv", message: "Elektrikli olmasın, SUV bir araç istiyorum.", fields: ["fuelType", "bodyStyle"] },
  { name: "hard hybrid sedan", message: "Kesinlikle hibrit olmalı ve sedan olmalı.", fields: ["fuelType", "bodyStyle"] },
  { name: "diesel automatic", message: "Dizel otomatik bir araba öner.", fields: ["fuelType", "transmission"] },
  { name: "electric hatchback", message: "Şehir için elektrikli hatchback araç arıyorum.", fields: ["fuelType", "bodyStyle"] },
  { name: "preferred two million", message: "Bütçem 2 milyon, bir araç öner.", budgetField: "PREFERRED_BUDGET" },
  { name: "hard three million", message: "Maksimum 3 milyon bütçem var, araba istiyorum.", budgetField: "MAXIMUM_HARD_CEILING" },
  { name: "cash plus finance", message: "2 milyon nakitim var, üstü için kredi kullanabilirim.", budgetField: "AVAILABLE_CASH" },
  { name: "budget ignored", message: "Bütçe önemli değil, bana şık bir araba öner.", persona: "DESIGN" },
  { name: "approximate four million", message: "Yaklaşık 4 milyon bütçeyle araç arıyorum.", budgetField: "PREFERRED_BUDGET" },
  { name: "ceiling five million", message: "5 milyon üzerine çıkmam, sedan istiyorum.", fields: ["bodyStyle"], budgetField: "MAXIMUM_HARD_CEILING" },
  { name: "available cash", message: "5 milyon nakitim var ama krediye de açığım.", budgetField: "AVAILABLE_CASH" },
  { name: "budget max spelling", message: "Max 2500000 TL verebilirim, hibrit araç öner.", fields: ["fuelType"], budgetField: "MAXIMUM_HARD_CEILING" },
  { name: "budget tavan", message: "Bütçe tavanım 3,5 milyon; otomatik olsun.", fields: ["transmission"], budgetField: "MAXIMUM_HARD_CEILING" },
  { name: "budget approximate", message: "3 milyon civarı bütçem var, SUV olabilir.", fields: ["bodyStyle"], budgetField: "PREFERRED_BUDGET" },
  { name: "prestige sedan", message: "Prestijli ve ağırbaşlı sedan bir araba öner.", fields: ["bodyStyle"], persona: "PRESTIGE" },
  { name: "stylish hatchback", message: "Şık tasarımlı hatchback araç istiyorum.", fields: ["bodyStyle"], persona: "DESIGN" },
  { name: "sporty coupe", message: "Sportif ve dinamik coupe olsun.", fields: ["bodyStyle"], persona: "DRIVING_ENGAGEMENT" },
  { name: "future electric", message: "Teknolojik ve fütüristik elektrikli araç öner.", fields: ["fuelType"], persona: "TECHNOLOGY" },
  { name: "minimal sedan", message: "Sade ve gösterişsiz sedan istiyorum.", fields: ["bodyStyle"], persona: "MINIMALISM" },
  { name: "adventure suv", message: "Macera ruhu olan SUV araç arıyorum.", fields: ["bodyStyle"], persona: "ADVENTURE" },
  { name: "premium hybrid", message: "Premium ve şık hibrit otomobil öner.", fields: ["fuelType"], persona: "PRESTIGE" },
  { name: "sporty gasoline", message: "Sportif karakterli benzinli araç istiyorum.", fields: ["fuelType"], persona: "DRIVING_ENGAGEMENT" },
  { name: "elegant automatic", message: "Zarif ve şık, otomatik bir araba olsun.", fields: ["transmission"], persona: "DESIGN" },
  { name: "persona indifferent", message: "Tasarım ve karakter fark etmez, en mantıklısını seç." },
  { name: "urban enclosed cargo", message: "Şehir içi dağıtım için kapalı yük alanı istiyorum.", fields: ["usageArchitecture"] },
  { name: "caddy style diesel", message: "Caddy tarzı kapalı yük alanı, dizel araç istiyorum.", fields: ["usageArchitecture", "fuelType"] },
  { name: "cargo no rear seats", message: "Mal dağıtacağım; panel van olsun, arka koltuklara gerek yok.", fields: ["usageArchitecture", "rearSeatPreference"] },
  { name: "cargo hard no seats", message: "Kapalı yük alanı şart, arka koltuk istemiyorum.", fields: ["usageArchitecture", "rearSeatPreference"] },
  { name: "cargo automatic", message: "Şehir içi mal dağıtımı için otomatik panel van istiyorum.", fields: ["usageArchitecture", "transmission"] },
  { name: "cargo budget", message: "Caddy tarzı dizel araç olsun, maksimum 4 milyon.", fields: ["usageArchitecture", "fuelType"], budgetField: "MAXIMUM_HARD_CEILING" },
  { name: "passenger van", message: "Yolcu taşımak için passenger van araç arıyorum.", fields: ["bodyStyle"] },
  { name: "pickup explicit", message: "Yük taşımak için kesinlikle pickup olmalı.", fields: ["bodyStyle"] },
  { name: "panel van explicit", message: "Panel van bir araç öner.", fields: ["bodyStyle", "usageArchitecture"] },
  { name: "commercial electric", message: "Elektrikli kapalı kasa ticari araç istiyorum.", fields: ["fuelType"] },
  { name: "transmission explanation", message: "Otomatik ve manuel ne anlama geliyor, günlük örnekle açıkla.", maximumOptions: 0 },
  { name: "hybrid explanation", message: "Hafif hibrit ile tam hibrit farkını günlük örnekle anlat.", maximumOptions: 0 },
  { name: "fuel explanation", message: "Yakıt türlerini bilmiyorum, beni günlük kullanımla yönlendir.", maximumOptions: 0 },
  { name: "body explanation", message: "Sedan, hatchback ve SUV farkını açıklar mısın?", maximumOptions: 0 },
  { name: "technical novice", message: "Teknik terimlere hakim değilim, günlük örneklerle anlat.", maximumOptions: 0 },
  { name: "clio civic comparison", message: "Clio mu Civic mi kararsızım." },
  { name: "corolla megane comparison", message: "Corolla mı Megane mı almalıyım?" },
  { name: "micra lookup", message: "Micra var mı?" },
  { name: "model y lookup", message: "Model Y var mı?" },
  { name: "complete first car", message: "İlk arabam olacak; şehir içinde otomatik hibrit hatchback istiyorum, bütçem maksimum 3 milyon.", fields: ["transmission", "fuelType", "bodyStyle"], budgetField: "MAXIMUM_HARD_CEILING" },
] as const;

describe("V2 second batch of fifty full-pipeline conversations", () => {
  it("contains exactly fifty new conversation scenarios", () => expect(cases).toHaveLength(50));

  it.each(cases)("$name", async ({ name, message, fields = [], budgetField, persona, maximumOptions }) => {
    const store = new InMemoryV2ConversationStore(); const traces: Readonly<Record<string, unknown>>[] = [];
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter, realizer: invalidRealizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId: `batch2-${name.replace(/\s+/gu, "-")}`, messageId: "turn-1", idempotencyKey: "turn-1", expectedConversationRevision: 0, userMessage: message, requestTime: "2026-08-19T10:00:00.000Z" }, composition);
    expect(output.message.trim().length).toBeGreaterThan(0); expect(output.cards).toEqual([]); expect(output.options.length).toBeLessThanOrEqual(maximumOptions ?? 10);
    expect(output.message).not.toMatch(/GASOLINE|DIESEL|MHEV|HEV|PHEV|BEV|runtime|discriminator|evidence/iu);
    const memory = (await store.load(`batch2-${name.replace(/\s+/gu, "-")}`))!.memory!;
    for (const field of fields) expect(memory.events.some((event) => event.eventType === "CONSTRAINT" && event.field === field)).toBe(true);
    if (budgetField) expect(memory.events.some((event) => event.eventType === "BUDGET_MUTATION" && "field" in event && event.field === budgetField)).toBe(true);
    if (persona) expect(memory.events.some((event) => event.eventType === "PERSONA_ACTIVATED" && event.requestedTraits.includes(persona as never))).toBe(true);
    expect(traces.some((trace) => trace.phase === "DECISION")).toBe(true);
  });
});
