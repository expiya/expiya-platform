import { describe, expect, it } from "vitest";

import { buildCarsRequirementLedger, matchOptionSelection } from "./carsConversationMemory";
import { evaluateCarsConversationQuality } from "./evaluateCarsConversationQuality";

const usageOptions = {
  id: "opt-usage-detail",
  purpose: "USAGE_DETAIL" as const,
  active: true,
  sourceAssistantTurn: 1,
  options: [
    { id: "usage-camp", label: "Kamp ve stabilize yol", semanticValue: "CAMP" },
    { id: "usage-rough", label: "Çamurlu/kötü yol", semanticValue: "ROUGH_ROAD" },
    { id: "usage-serious", label: "Ciddi arazi kullanımı", semanticValue: "SERIOUS_OFF_ROAD" },
  ],
};

describe("option and short-answer binding", () => {
  it.each([
    ["Kamp ve stabilize yol", "usage-camp", "text"],
    ["kamp ve stabilize yol", "usage-camp", "text"],
    ["ilk seçenek", "usage-camp", "ordinal"],
    ["ilki", "usage-camp", "ordinal"],
    ["ikincisi", "usage-rough", "ordinal"],
    ["o olsun", "usage-camp", "confirmation"],
    ["evet, o", "usage-camp", "confirmation"],
    ["hafta sonu kamp ve stabilize yol da olacak", "usage-camp", "paraphrase"],
  ])("binds %s", (text, optionId, source) => {
    expect(matchOptionSelection(text, usageOptions)).toEqual({ optionId, source });
  });

  it("binds a button selectedOptionId over free text", () => {
    expect(matchOptionSelection("serbest metin", usageOptions, "usage-serious")).toEqual({
      optionId: "usage-serious",
      source: "button",
    });
  });

  it("binds evet to the pending four-seat confirmation", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "4 kişilik olsun, küçük olmasın" },
      { id: "2", role: "assistant", content: "4 kişi olduğunuzu anladım. En az 4 koltuk sizin için zorunlu mu?" },
      { id: "3", role: "user", content: "evet" },
    ]);
    expect(trace.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "PARTY_SIZE", value: 4 }),
      expect.objectContaining({ key: "SIZE_PREFERENCE", value: "NOT_SMALL" }),
      expect.objectContaining({ key: "MIN_SEATS", value: 4, sourceText: "evet" }),
    ]));
    expect(trace.didConversationProgress).toBe(true);
  });

  it("binds hayır, 5 yeter as a correction", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "7 koltuk lazım" },
      { id: "2", role: "assistant", content: "En az 7 koltuk zorunlu mu?" },
      { id: "3", role: "user", content: "hayır, 5 yeter" },
    ]);
    expect(trace.requirements).toContainEqual(expect.objectContaining({
      key: "MIN_SEATS", value: 5, previousValue: 7, category: "CORRECTION",
    }));
  });
});

describe("requirement ledger rebuild", () => {
  it("retains the complete reported conversation with evaluability and source turns", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "arazi aracı bakıyorum" },
      { id: "2", role: "assistant", content: "Kamp ve stabilize yol mu?", optionSet: usageOptions },
      { id: "3", role: "user", content: "Kamp ve stabilize yol" },
      { id: "4", role: "assistant", content: "Üst bütçeniz nedir?" },
      { id: "5", role: "user", content: "2 milyon tl" },
      { id: "6", role: "assistant", content: "Vazgeçilmez özellik nedir?" },
      { id: "7", role: "user", content: "4x4 olmalı" },
      { id: "8", role: "assistant", content: "En az kaç koltuk gerekli?" },
      { id: "9", role: "user", content: "pick up araç tercihim" },
    ]);

    expect(trace.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "USAGE_CAMP", value: "CAMP", status: "UNDERSTOOD_BUT_UNSUPPORTED" }),
      expect.objectContaining({ key: "USAGE_STABILIZED_ROAD", value: "STABILIZED_ROAD" }),
      expect.objectContaining({ key: "BUDGET_MAX_TRY", value: 2_000_000, sourceTurn: 3 }),
      expect.objectContaining({ key: "DRIVETRAIN", value: "AWD_OR_4X4", sourceTurn: 4 }),
      expect.objectContaining({ key: "BODY_TYPE", value: "PICKUP", sourceTurn: 5 }),
    ]));
    expect(trace.activeOptionSet?.selectedOptionId).toBe("usage-camp");
  });

  it("does not count a repeated pickup reminder as progress", () => {
    const repeated = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "pickup tercihim" },
      { id: "2", role: "assistant", content: "Pickup tercihinizi kaydettim." },
      { id: "3", role: "user", content: "pickup dedim ya" },
    ]);
    expect(repeated.didConversationProgress).toBe(false);
    expect(repeated.requirements).toContainEqual(expect.objectContaining({ key: "BODY_TYPE", sourceTurn: 1 }));
  });
});

describe("conversation quality metrics", () => {
  it("flags a generic final-priority loop as robotic", () => {
    const conversation = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "arazi aracı bakıyorum" },
      { id: "2", role: "assistant", content: "Sizin için vazgeçilmez özellik nedir?" },
      { id: "3", role: "user", content: "4x4 olmalı" },
    ]);
    const report = evaluateCarsConversationQuality({
      messages: [
        { id: "1", role: "user", content: "arazi aracı bakıyorum" },
        { id: "2", role: "assistant", content: "Sizin için vazgeçilmez özellik nedir?" },
        { id: "3", role: "user", content: "4x4 olmalı" },
      ],
      conversation,
      assistantMessage: "Kararı gerçekten değiştirecek son noktayı netleştirelim: Sizin için vazgeçilmez olan özellik nedir?",
      expectedKeys: ["USAGE_ROUGH_ROAD", "DRIVETRAIN"],
    });
    expect(report.roboticTemplateHits).toBeGreaterThan(0);
    expect(report.unnecessaryQuestionCount).toBeGreaterThan(0);
  });
});
