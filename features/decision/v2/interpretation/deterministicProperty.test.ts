import { describe, expect, it } from "vitest";

import { enforceInterpretationSemanticCompleteness } from "./semanticCompleteness";
import type { InterpretationResult } from "./types";

const empty = (id: string): InterpretationResult => ({ schemaVersion: 1, messageId: id, acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] });
const interpret = (text: string, field?: string) => enforceInterpretationSemanticCompleteness({ result: empty(text), userText: text, activeFieldIds: [], ...(field ? { openMaterialQuestionField: field } : {}) });
const random = (seed: number) => () => ((seed = Math.imul(seed ^ seed >>> 15, 1 | seed), seed ^= seed + Math.imul(seed ^ seed >>> 7, 61 | seed), ((seed ^ seed >>> 14) >>> 0) / 4294967296));
const pick = <T>(items: readonly T[], value: number): T => items[Math.floor(value * items.length)]!;

describe("deterministic interpretation generated invariants", () => {
  it("preserves controlled meaning across 300 seeded spelling, case, punctuation and filler variants", () => {
    const next = random(20260822);
    for (let index = 0; index < 300; index += 1) {
      const punctuation = pick(["", ".", "!", "!!"], next());
      const body = `${pick(["pickup", "pick-up", "pick up", "pikap"], next())}${punctuation}`;
      const bodyResult = interpret(next() > 0.5 ? body.toLocaleUpperCase("tr-TR") : body, "bodyStyle");
      expect(bodyResult.constraintMutations).toContainEqual(expect.objectContaining({ fieldId: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "Pickup" } }));

      const budget = `${pick(["3 milyon", "3 MİLYON", "3 milyon TL", "3.000.000 TL"], next())}${punctuation}`;
      expect(interpret(budget, "budget").budgetMutations).toContainEqual(expect.objectContaining({ field: "PREFERRED_BUDGET", value: { amount: 3_000_000, currency: "TRY" } }));

      const offRoad = pick(["4x4 arazi aracı bakıyorum", "arazi aracı bakıyorum 4X4 olsun", "ciddi arazi için dört çeker araç istiyorum"], next());
      const fields = new Map(interpret(`${pick(["", "şöyle, ", "yani "], next())}${offRoad}${punctuation}`).constraintMutations.map((item) => [item.fieldId, item.normalizedValue]));
      expect(fields.get("usageScenario")).toBe("SERIOUS_OFF_ROAD");
      expect(fields.get("drivenWheels")).toEqual({ operator: "EQUALS", value: "AWD" });
    }
  });

  it("never turns generated technical questions into fuel decisions", () => {
    const next = random(554);
    const topics = ["şarj", "batarya", "elektrikli araç menzili", "elektrikli araçta kW"] as const;
    const requests = ["nedir", "nasıl çalışır", "önemli mi", "ne demek"] as const;
    for (let index = 0; index < 200; index += 1) {
      const result = interpret(`${pick(topics, next())} ${pick(requests, next())}?`);
      expect(result.constraintMutations.filter((item) => item.fieldId === "fuelType")).toEqual([]);
      expect(result.personaMutations).toEqual([]);
    }
  });
});
