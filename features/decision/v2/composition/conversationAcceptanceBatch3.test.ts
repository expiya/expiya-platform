import { describe, expect, it } from "vitest";
import { InMemoryV2ConversationStore } from "../orchestrator/store";
import { runCarsDecisionTurnV2 } from "../orchestrator/runCarsDecisionTurnV2";
import type { InterpretationResult, StructuredInterpretationModel } from "../interpretation/types";
import type { NaturalRealizationModel } from "../realization/types";
import { createCarsDecisionV2ProductionComposition } from "./production.server";

type Scenario = { readonly name: string; readonly message: string; readonly fields?: readonly string[]; readonly persona?: string; readonly budget?: string; readonly references?: number; readonly explanation?: boolean };
const empty = (messageId: string): InterpretationResult => ({ schemaVersion: 1, messageId, acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] });
const interpreter: StructuredInterpretationModel = { interpret: async ({ messageId }) => empty(messageId) };
const realizer: NaturalRealizationModel = { realize: async () => ({ message: "", usedExplanationFactIds: [], mentionedCandidateIds: [] }) };

const fuelPhrases = ["benzinli", "dizel", "hibrit", "elektrikli", "LPG'li"] as const;
const bodyPhrases = ["sedan", "hatchback", "SUV", "coupe", "station wagon"] as const;
const powertrainBody: Scenario[] = fuelPhrases.flatMap((fuel) => bodyPhrases.map((body) => ({ name: `${fuel}-${body}`, message: `Günlük kullanım için ${fuel} ${body} bir araç istiyorum.`, fields: ["fuelType", "bodyStyle"] })));

const budgetAmounts = ["1,5", "2", "2,5", "3", "3,5", "4", "4,5", "5", "6", "8"] as const;
const transmissionBudget: Scenario[] = budgetAmounts.flatMap((amount, index) => [
  { name: `automatic-budget-${index}`, message: `Otomatik bir araç istiyorum; bütçem ${amount} milyon.`, fields: ["transmission"], budget: "PREFERRED_BUDGET" },
  { name: `manual-ceiling-${index}`, message: `Manuel araç olsun; maksimum ${amount} milyon üzerine çıkmam.`, fields: ["transmission"], budget: "MAXIMUM_HARD_CEILING" },
]);

const personaPhrases = [
  ["şık ve zarif", "DESIGN"], ["premium ve prestijli", "PRESTIGE"], ["sportif ve dinamik", "DRIVING_ENGAGEMENT"], ["teknolojik ve fütüristik", "TECHNOLOGY"], ["sade ve minimalist", "MINIMALISM"],
] as const;
const personaBody: Scenario[] = personaPhrases.flatMap(([phrase, trait]) => ["sedan", "hatchback", "SUV"].map((body) => ({ name: `${trait}-${body}`, message: `${phrase} görünen ${body} bir araba öner.`, fields: ["bodyStyle"], persona: trait })));

const cargoMessages: readonly string[] = [
  "Şehir içi dağıtım için kapalı yük alanı olan araç istiyorum.",
  "Küçük işletmem için panel van bir araç öner.",
  "Caddy tarzı dizel ve otomatik bir ticari araç istiyorum.",
  "Mal taşıyacağım; arka koltuklara gerek yok, kapalı kasa olsun.",
  "Arka koltuk istemiyorum, panel van şart.",
  "Şehir içi kargo dağıtımı için elektrikli kapalı kasa araç arıyorum.",
  "İş için benzinli panel van olabilir.",
  "Yük alanı öncelikli, otomatik ticari araç istiyorum.",
  "Dizel kapalı yük alanı olsun, bütçe önemli değil.",
  "Caddy tarzı araç olsun ama arka koltuk gerekli değil.",
  "Koli dağıtımı için küçük panel van arıyorum.",
  "Kapalı kasa ticari araçta manuel vites de olabilir.",
  "Şehir dağıtımında yük öncelikli ve dizel olsun.",
  "Panel van istiyorum, maksimum 4 milyon bütçem var.",
  "Kapalı yük alanı şart; bütçem yaklaşık 3 milyon.",
] as const;
const cargo: Scenario[] = cargoMessages.map((message, index) => ({ name: `cargo-${index + 1}`, message, fields: [7, 12].includes(index) ? [] : ["usageArchitecture"], ...(message.includes("arka koltuk") ? { fields: ["usageArchitecture", "rearSeatPreference"] } : {}), ...(message.includes("maksimum") ? { budget: "MAXIMUM_HARD_CEILING" } : message.includes("yaklaşık") ? { budget: "PREFERRED_BUDGET" } : {}) }));

const technicalMessages = [
  "Otomatik şanzıman ne demek, günlük örnekle anlat.", "Manuel vitesin günlük kullanım farkını açıkla.", "Hafif hibrit nedir, anlayacağım şekilde açıkla.", "Tam hibrit nasıl çalışır, günlük örnek ver.", "Şarj edilebilir hibrit ne anlama geliyor?", "Elektrikli araçta kW nedir?", "Bagaj litresini bilmiyorum, günlük örnekle yönlendir.", "Yakıt tüketimi L/100 km ne demek?", "Sedan ile liftback farkını açıkla.", "SUV ve crossover farkını günlük kullanımla anlat.",
] as const;
const technical: Scenario[] = technicalMessages.map((message, index) => ({ name: `technical-${index + 1}`, message, explanation: true }));

const modelMessages: readonly [string, number][] = [
  ["Clio mu Civic mi?", 2], ["Corolla mı Megane mı?", 2], ["Corsa mı Yaris mi?", 2], ["Captur mu Tucson mu?", 2], ["Leon mu Clio mu?", 2],
  ["Micra var mı?", 1], ["Civic var mı?", 1], ["Clio var mı?", 1], ["Model Y var mı?", 1], ["BMW 320i var mı?", 1],
] as const;
const models: Scenario[] = modelMessages.map(([message, references], index) => ({ name: `model-${index + 1}`, message, references }));

const budgetOnlyMessages: readonly [string, string][] = [
  ["Bütçe önemli değil, en mantıklı aracı seç.", "EXCLUDE_FROM_DECISION"],
  ["Yaklaşık 2,8 milyon bütçem var.", "PREFERRED_BUDGET"],
  ["3 milyon nakitim var, kredi kullanabilirim.", "AVAILABLE_CASH"],
  ["En fazla 4 milyon verebilirim.", "MAXIMUM_HARD_CEILING"],
  ["Bütçe tavanım 5 milyon.", "MAXIMUM_HARD_CEILING"],
] as const;
const budgets: Scenario[] = budgetOnlyMessages.map(([message, budget], index) => ({ name: `budget-only-${index + 1}`, message, budget }));

const scenarios: readonly Scenario[] = [...powertrainBody, ...transmissionBudget, ...personaBody, ...cargo, ...technical, ...models, ...budgets];

describe("V2 third batch of one hundred full-pipeline conversations", () => {
  it("contains exactly one hundred previously uncounted scenarios", () => expect(scenarios).toHaveLength(100));

  it.each(scenarios)("$name", async ({ name, message, fields = [], persona, budget, references, explanation }) => {
    const conversationId = `batch3-${name}`; const store = new InMemoryV2ConversationStore(); const traces: Readonly<Record<string, unknown>>[] = [];
    const composition = createCarsDecisionV2ProductionComposition({ store, interpreter, realizer, shadow: true, smokeObserver: (trace) => traces.push(trace) });
    const output = await runCarsDecisionTurnV2({ conversationId, messageId: "message-1", idempotencyKey: "message-1", expectedConversationRevision: 0, userMessage: message, requestTime: "2026-08-19T12:00:00.000Z" }, composition);
    expect(output.message.trim()).not.toBe(""); expect(output.cards).toEqual([]); expect(output.options.length).toBeLessThanOrEqual(10);
    expect(output.message).not.toMatch(/GASOLINE|DIESEL|MHEV|HEV|PHEV|BEV|runtime|fingerprint|authorization|discriminator|evidence/iu);
    const memory = (await store.load(conversationId))!.memory!;
    for (const field of fields) expect(memory.events.some((event) => event.eventType === "CONSTRAINT" && event.field === field)).toBe(true);
    if (persona) expect(memory.events.some((event) => event.eventType === "PERSONA_ACTIVATED" && event.requestedTraits.includes(persona as never))).toBe(true);
    if (budget === "EXCLUDE_FROM_DECISION") expect(memory.events.some((event) => event.eventType === "BUDGET_MUTATION" && event.operation === "EXCLUDE_FROM_DECISION")).toBe(true);
    else if (budget) expect(memory.events.some((event) => event.eventType === "BUDGET_MUTATION" && "field" in event && event.field === budget)).toBe(true);
    if (references !== undefined) expect(memory.events.filter((event) => event.eventType === "MODEL_REFERENCE")).toHaveLength(references);
    const decision = traces.find((trace) => trace.phase === "DECISION"); expect(decision).toBeTruthy();
    if (explanation) { expect(decision).toMatchObject({ action: "EXPLAIN_TECHNICAL_CONCEPT", materialQuestionCount: 0 }); expect(output.options).toEqual([]); }
  });
});
