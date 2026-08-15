import { describe, expect, it } from "vitest";

import { buildCarsRequirementLedger } from "./carsRequirementLedger";

describe("buildCarsRequirementLedger", () => {
  it("retains the complete reported conversation with evaluability and source turns", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "arazi aracı bakıyorum" },
      { id: "2", role: "assistant", content: "Kamp ve stabilize yol mu?" },
      { id: "3", role: "user", content: "Kamp ve stabilize yol" },
      { id: "4", role: "assistant", content: "Üst bütçeniz nedir?" },
      { id: "5", role: "user", content: "2 milyon tl" },
      { id: "6", role: "assistant", content: "Vazgeçilmez özellik nedir?" },
      { id: "7", role: "user", content: "4x4 olmalı" },
      { id: "8", role: "assistant", content: "En az kaç koltuk gerekli?" },
      { id: "9", role: "user", content: "pick up araç tercihim" },
    ]);

    expect(trace.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "USAGE_CAMP", value: "CAMP", sourceTurn: 2, status: "UNDERSTOOD_BUT_UNSUPPORTED" }),
      expect.objectContaining({ key: "USAGE_STABILIZED_ROAD", value: "STABILIZED_ROAD", sourceTurn: 2 }),
      expect.objectContaining({ key: "BUDGET_MAX_TRY", value: 2_000_000, sourceTurn: 3, status: "UNDERSTOOD_BUT_UNSUPPORTED" }),
      expect.objectContaining({ key: "DRIVETRAIN", value: "AWD_OR_4X4", sourceTurn: 4, status: "UNDERSTOOD_BUT_UNSUPPORTED" }),
      expect.objectContaining({ key: "BODY_TYPE", value: "PICKUP", sourceTurn: 5, status: "UNDERSTOOD_BUT_UNSUPPORTED" }),
    ]));
    expect(trace.answeredQuestionPurposes).toEqual(expect.arrayContaining(["PRIMARY_USAGE", "BUDGET_MAX", "FINAL_PRIORITY"]));
  });

  it("applies the latest explicit correction and does not count repetition as progress", () => {
    const corrected = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "7 koltuk lazım" },
      { id: "2", role: "user", content: "5 koltuk yeter" },
    ]);
    expect(corrected.requirements).toContainEqual(expect.objectContaining({
      key: "MIN_SEATS", value: 5, previousValue: 7, sourceTurn: 2,
    }));
    expect(corrected.didConversationProgress).toBe(true);

    const repeated = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "pickup tercihim" },
      { id: "2", role: "assistant", content: "Pickup tercihinizi kaydettim." },
      { id: "3", role: "user", content: "pickup dedim ya" },
    ]);
    expect(repeated.didConversationProgress).toBe(false);
    expect(repeated.requirements).toContainEqual(expect.objectContaining({ key: "BODY_TYPE", sourceTurn: 1 }));
  });
});
