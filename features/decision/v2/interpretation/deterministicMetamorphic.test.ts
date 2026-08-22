import { describe, expect, it } from "vitest";

import { enforceInterpretationSemanticCompleteness } from "./semanticCompleteness";
import type { InterpretationResult } from "./types";

const empty = (): InterpretationResult => ({
  schemaVersion: 1,
  messageId: "metamorphic",
  acts: [],
  directAnswerRequests: [],
  constraintMutations: [],
  budgetMutations: [],
  modelReferences: [],
  personaMutations: [],
  corrections: [],
  ambiguities: [],
});

const complete = (userText: string, openMaterialQuestionField?: string) =>
  enforceInterpretationSemanticCompleteness({
    result: empty(),
    userText,
    activeFieldIds: [],
    ...(openMaterialQuestionField ? { openMaterialQuestionField } : {}),
  });

const mutationSignature = (userText: string, openMaterialQuestionField?: string) => complete(userText, openMaterialQuestionField)
  .constraintMutations.map(({ fieldId, normalizedValue }) => ({ fieldId, normalizedValue }));

describe("deterministic interpretation metamorphic contract", () => {
  it.each([
    "pickup",
    "pick up",
    "pick-up",
    "pikap",
    "PICKUP!",
  ])("keeps pickup aliases equivalent while answering the body question: %s", (answer) => {
    expect(mutationSignature(answer, "bodyStyle")).toContainEqual(expect.objectContaining({
      fieldId: "bodyStyle",
      normalizedValue: { operator: "EQUALS", value: "Pickup" },
    }));
  });

  it.each([
    "4x4 arazi aracı bakıyorum",
    "Arazi aracı bakıyorum, 4X4 olsun.",
    "Ciddi arazi için dört çeker araç istiyorum",
  ])("preserves both usage and traction meaning across surface forms: %s", (message) => {
    const mutations = mutationSignature(message);
    expect(mutations).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldId: "usageScenario", normalizedValue: "SERIOUS_OFF_ROAD" }),
      expect.objectContaining({ fieldId: "drivenWheels", normalizedValue: { operator: "EQUALS", value: "AWD" } }),
    ]));
  });

  it.each(["Fark etmez", "Önemli değil.", "Fikrim yok!"])("binds short indifference only to the open field: %s", (answer) => {
    const result = complete(answer, "fuelType");
    expect(result.constraintMutations).toEqual([expect.objectContaining({ operation: "DECLINE", fieldId: "fuelType" })]);
    expect(result.budgetMutations).toEqual([]);
    expect(result.modelReferences).toEqual([]);
  });

  it.each([
    "3 milyon",
    "3 MİLYON",
    "3 milyon TL",
    "3.000.000 TL",
  ])("normalizes equivalent explicit budget answers: %s", (answer) => {
    expect(complete(answer, "budget").budgetMutations).toContainEqual(expect.objectContaining({
      field: "PREFERRED_BUDGET",
      value: { amount: 3_000_000, currency: "TRY" },
    }));
  });

  it("keeps a technical information request decision-neutral", () => {
    const result = complete("Elektrikli araçta kW nedir?");
    expect(result.constraintMutations).toEqual([]);
    expect(result.budgetMutations).toEqual([]);
    expect(result.modelReferences).toEqual([]);
    expect(result.personaMutations).toEqual([]);
    expect(result.directAnswerRequests).toContainEqual({ kind: "TECHNICAL_EXPLANATION" });
  });
});
