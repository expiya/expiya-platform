import { describe, expect, it } from "vitest";

import type { CarsActiveOptionSet } from "@/types/carsConversation";
import { buildCarsRequirementLedger } from "./carsConversationMemory";
import { evaluateCatalogFacets, selectCatalogFacetWinner } from "./carsCatalogFacetEngine";

describe("cars technical daily-life integration", () => {
  it("keeps a daily luggage example soft and separate from hard requirements", () => {
    const trace = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "İki büyük bavul taşıyorum" }]);
    expect(trace.requirements.some((entry) => entry.key === "MIN_CARGO_L")).toBe(false);
    expect(trace.technicalDailyLifeInterpretations).toContainEqual(expect.objectContaining({
      technicalField: "luggageVolume",
      interpretationClass: "GUIDED_APPROXIMATION",
      rankingEffect: "SOFT_UNTIL_CONFIRMED",
      confirmedForHardFilter: false,
    }));
  });

  it("keeps an explicit litre bound decision-safe", () => {
    const trace = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "Bagaj kesinlikle en az 400 litre olsun" }]);
    expect(trace.requirements).toContainEqual(expect.objectContaining({ key: "MIN_CARGO_L", value: 400 }));
    expect(trace.technicalDailyLifeInterpretations).toContainEqual(expect.objectContaining({
      mappingId: "luggage-volume--direct-user-constraint",
      interpretationClass: "DECISION_SAFE",
      rankingEffect: "DIRECT_FILTER",
      confirmedForHardFilter: true,
    }));
  });

  it("does not turn a daily-life option label into an accidental party-size constraint", () => {
    const optionSet: CarsActiveOptionSet = {
      id: "daily-luggage",
      purpose: "CATALOG_FACET:luggage_min_l",
      sourceAssistantTurn: 1,
      active: true,
      options: [{
        id: "daily-luggage-400",
        label: "Dört kişilik kısa tatil",
        semanticValue: "TECHNICAL_DAILY_LIFE:luggage-volume--400-499",
      }],
    };
    const trace = buildCarsRequirementLedger([
      { id: "a1", role: "assistant", content: "Bagajı nasıl kullanacaksın?", optionSet },
      { id: "u1", role: "user", content: "Dört kişilik kısa tatil" },
    ]);
    expect(trace.requirements.some((entry) => entry.key === "PARTY_SIZE" || entry.key === "MIN_CARGO_L")).toBe(false);
    expect(trace.technicalDailyLifeInterpretations).toContainEqual(expect.objectContaining({
      mappingId: "luggage-volume--400-499",
      activationSource: "ADVISOR_OPTION",
    }));
  });

  it("uses a soft mapping for ranking without shrinking the candidate pool", () => {
    const trace = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "5 milyon TL altında hibrit araç; bagajda aile tatili için çok sayıda parça taşıyorum" }]);
    const evaluation = evaluateCatalogFacets(trace);
    expect(evaluation.appliedFilters.some((filter) => filter.key.includes("TECHNICAL_DAILY_LIFE"))).toBe(false);
    const selected = selectCatalogFacetWinner(trace, evaluation.candidates);
    expect(selected).toBeDefined();
    expect(selected?.luggageLitres).toBeGreaterThanOrEqual(500);
    expect(selected?.luggageLitres).toBeLessThanOrEqual(889);
  });

  it("lets the user replace and then cancel an approximate preference", () => {
    const initial = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "Bagajda günlük çantalar ve küçük alışveriş olacak" }]);
    expect(initial.technicalDailyLifeInterpretations?.at(-1)?.mappingId).toBe("luggage-volume--63-299");
    const changed = buildCarsRequirementLedger([
      { id: "u1", role: "user", content: "Bagajda günlük çantalar ve küçük alışveriş olacak" },
      { id: "u2", role: "user", content: "Aslında aile tatili için çok sayıda parça taşıyacağım" },
    ]);
    expect(changed.technicalDailyLifeInterpretations?.filter((item) => item.technicalField === "luggageVolume")).toHaveLength(1);
    expect(changed.technicalDailyLifeInterpretations?.find((item) => item.technicalField === "luggageVolume")?.mappingId)
      .toBe("luggage-volume--500-889");
    const cancelled = buildCarsRequirementLedger([
      { id: "u1", role: "user", content: "Bagajda günlük çantalar ve küçük alışveriş olacak" },
      { id: "u2", role: "user", content: "Bagaj önemli değil, fark etmez" },
    ]);
    expect(cancelled.technicalDailyLifeInterpretations?.some((item) => item.technicalField === "luggageVolume")).toBe(false);
  });

  it("records illustrative charging language without giving it ranking power", () => {
    const trace = buildCarsRequirementLedger([{ id: "u1", role: "user", content: "Uzun yolda kahve molası kadar kısa bir hızlı şarj istiyorum" }]);
    expect(trace.technicalDailyLifeInterpretations).toContainEqual(expect.objectContaining({
      technicalField: "maxDcChargePower",
      interpretationClass: "ILLUSTRATIVE_ONLY",
      rankingEffect: "NONE",
      confirmedForHardFilter: false,
    }));
  });
});
