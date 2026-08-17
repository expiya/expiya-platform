import { describe, expect, it } from "vitest";
import type { InterpretationResult, UserAct } from "./types";
import { enforceInterpretationSemanticCompleteness } from "./semanticCompleteness";

const empty = (): InterpretationResult => ({ schemaVersion: 1, messageId: "matrix", acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] });

type Expectation = {
  readonly act?: UserAct;
  readonly field?: string;
  readonly persona?: string;
  readonly budget?: string;
  readonly referenceCount?: number;
  readonly directAnswer?: string;
};

const cases: readonly (readonly [string, string, Expectation])[] = [
  ["greeting", "Merhaba", {},],
  ["friendly greeting", "Selam, nasılsın?", {},],
  ["first car", "İlk arabamı almak istiyorum", { act: "RECOMMENDATION_REQUEST" }],
  ["daily car", "Günlük kullanım için araba arıyorum", { act: "RECOMMENDATION_REQUEST" }],
  ["recommendation", "Bana bir araç öner", { act: "RECOMMENDATION_REQUEST", directAnswer: "RECOMMENDATION_REQUEST" }],
  ["advice", "Nasıl bir araba almalıyım?", {},],
  ["hybrid preference", "Hibrit tercih ederim", { field: "fuelType" }],
  ["hybrid request", "Hibrit istiyorum", { field: "fuelType" }],
  ["hard hybrid", "Kesinlikle hibrit olmalı", { field: "fuelType" }],
  ["electric preference", "Elektrikli olsun", { field: "fuelType" }],
  ["no electric", "Elektrikli istemiyorum", { field: "fuelType" }],
  ["gasoline", "Benzinli tercih ederim", { field: "fuelType" }],
  ["diesel", "Dizel olsun", { field: "fuelType" }],
  ["fuel indifferent", "Yakıt fark etmez", { field: "fuelType" }],
  ["sedan preference", "Sedan tercih ederim", { field: "bodyStyle" }],
  ["suv preference", "SUV olsun", { field: "bodyStyle" }],
  ["hatchback preference", "Kompakt hatchback istiyorum", { field: "bodyStyle" }],
  ["coupe preference", "Coupe olabilir", { field: "bodyStyle" }],
  ["pickup correction", "Pickup demedim, sedan dedim", { act: "CORRECTION", field: "bodyStyle" }],
  ["suv correction", "SUV değil, sedan olsun", { act: "CORRECTION", field: "bodyStyle" }],
  ["automatic", "Otomatik tercih ederim", { field: "transmission" }],
  ["manual", "Manuel olsun", { field: "transmission" }],
  ["automatic hard", "Kesinlikle otomatik olmalı", { field: "transmission" }],
  ["technical meaning", "Bunlar ne anlama geliyor?", { act: "TECHNICAL_EXPLANATION_REQUEST", directAnswer: "TECHNICAL_EXPLANATION" }],
  ["technical explain", "Bilmiyorum, açıkla", { act: "TECHNICAL_EXPLANATION_REQUEST", directAnswer: "TECHNICAL_EXPLANATION" }],
  ["daily examples", "Teknik terimlere hakim değilim, günlük örneklerle anlat", { act: "TECHNICAL_EXPLANATION_REQUEST", directAnswer: "TECHNICAL_EXPLANATION" }],
  ["cash", "3 milyon nakitim var", { budget: "AVAILABLE_CASH" }],
  ["preferred budget", "Bütçem 3 milyon", { budget: "PREFERRED_BUDGET" }],
  ["approximate budget", "Yaklaşık 4 milyon bütçem var", { budget: "PREFERRED_BUDGET" }],
  ["hard ceiling", "5 milyon üstüne çıkmam", { budget: "MAXIMUM_HARD_CEILING" }],
  ["max budget", "Maksimum 2 milyon", { budget: "MAXIMUM_HARD_CEILING" }],
  ["budget excluded", "Bütçe önemli değil", { budget: "EXCLUDE_FROM_DECISION" }],
  ["finance flexible", "Üstü için kredi kullanabilirim", { budget: "FINANCE_FLEXIBILITY" }],
  ["cargo architecture", "Şehir içinde mal dağıtacağım, kapalı yük alanı istiyorum", { field: "usageArchitecture" }],
  ["rear seats unnecessary", "Arka koltuklara gerek yok", { field: "rearSeatPreference" }],
  ["cargo combined", "Caddy tarzı kapalı yük alanı olsun, arka koltuk istemiyorum", { act: "RECOMMENDATION_REQUEST", field: "usageArchitecture", directAnswer: "RECOMMENDATION_REQUEST" }],
  ["prestige", "Prestijli bir araç olsun", { persona: "PRESTIGE" }],
  ["stylish", "Şık dursun", { persona: "DESIGN" }],
  ["sporty", "Sportif ve dinamik karakterli olsun", { persona: "DRIVING_ENGAGEMENT" }],
  ["technology", "Teknolojik ve fütüristik olsun", { persona: "TECHNOLOGY" }],
  ["adventure", "Macera ruhu olan bir araç istiyorum", { persona: "ADVENTURE" }],
  ["persona clear", "Bunlar önemli değil, fark etmez", {},],
  ["model lookup", "Micra var mı?", { act: "MODEL_LOOKUP_REQUEST", referenceCount: 1 }],
  ["comparison", "Clio mu Civic mi kararsızım", { act: "MODEL_COMPARISON_REQUEST", referenceCount: 2, directAnswer: "MODEL_COMPARISON" }],
  ["comparison sentence", "Araba alacağım. Corolla mı Megane mı?", { act: "MODEL_COMPARISON_REQUEST", referenceCount: 2 }],
  ["consent show", "Göster bakalım", { act: "OFFER_ACCEPTANCE" }],
  ["consent share", "Paylaş", { act: "OFFER_ACCEPTANCE" }],
  ["consent natural", "Hadi görelim", { act: "OFFER_ACCEPTANCE" }],
  ["consent options", "Seçenekleri göster", { act: "OFFER_ACCEPTANCE" }],
  ["decline", "Hayır", { act: "OFFER_DECLINE" }],
  ["recommend options", "Bana uygun seçenekleri hazırla", { act: "RECOMMENDATION_REQUEST" }],
  ["style plus request", "Premium ve şık bir araba öner", { act: "RECOMMENDATION_REQUEST", persona: "PRESTIGE" }],
  ["multi preference", "Şehir için otomatik hibrit hatchback araba istiyorum", { act: "RECOMMENDATION_REQUEST", field: "fuelType" }],
  ["budget and fuel", "Hibrit olsun, bütçem 3 milyon", { field: "fuelType", budget: "PREFERRED_BUDGET" }],
  ["cargo and diesel", "Dağıtım için kapalı yük alanı ve dizel istiyorum", { field: "usageArchitecture" }],
  ["first car stylish", "İlk arabam olacak, havalı ve şık bir araç arıyorum", { act: "RECOMMENDATION_REQUEST", persona: "DESIGN" }],
] as const;

describe("V2 Turkish conversation acceptance matrix", () => {
  it("contains at least fifty independent conversation utterances", () => expect(cases.length).toBeGreaterThanOrEqual(50));

  it.each(cases)("%s", (_name, userText, expected) => {
    const result = enforceInterpretationSemanticCompleteness({ result: empty(), userText, activeFieldIds: ["bodyStyle", "fuelType", "transmission"] });
    if (expected.act) expect(result.acts).toContain(expected.act);
    if (expected.field) expect(result.constraintMutations.some((mutation) => mutation.fieldId === expected.field)).toBe(true);
    if (expected.persona) expect(result.personaMutations.some((mutation) => mutation.traits.includes(expected.persona as never))).toBe(true);
    if (expected.budget === "EXCLUDE_FROM_DECISION") expect(result.budgetMutations.some((mutation) => mutation.operation === "EXCLUDE_FROM_DECISION")).toBe(true);
    else if (expected.budget) expect(result.budgetMutations.some((mutation) => mutation.field === expected.budget)).toBe(true);
    if (expected.referenceCount !== undefined) expect(result.modelReferences).toHaveLength(expected.referenceCount);
    if (expected.directAnswer) expect(result.directAnswerRequests.some((request) => request.kind === expected.directAnswer)).toBe(true);
  });
});
