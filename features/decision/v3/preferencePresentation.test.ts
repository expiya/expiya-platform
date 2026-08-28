import { describe, expect, it } from "vitest";
import type { PreferenceEvent } from "./types";
import { humanizePreferenceText, publicPreferenceSummary } from "./preferencePresentation";

const event = (concept: string, normalizedValue: string): PreferenceEvent => ({
  id: concept, sourceMessageId: "m", sourceTurn: 1, sourceSpan: { start: 0, end: 4, text: "Evet" }, concept, normalizedValue,
  strength: "CONFIRMED_STRONG", status: "ACTIVE", decisionUse: "SOFT_RANK", confidence: 1, authority: "USER_CONFIRMED", confirmationRequired: false,
});

describe("public preference presentation", () => {
  it.each([
    ["safetyConfidence", "SAFETY_CONFIDENCE", "Güvenlik ve sürücü desteği önceliği: doğrulanabilir güvenlik ve sürücü destekleri"],
    ["driverConfidence", "DRIVER_CONFIDENCE", "Sürücü güveni önceliği: görüş kolaylığı ve sürücü destekleri"],
    ["roofLoadLifestyle", "ROOF_LOAD", "Tavan taşıma ihtiyacı: tavan taşıma uyumluluğu"],
    ["fuelEconomy", "FUEL_ECONOMY", "Tüketim önceliği: düşük enerji veya yakıt tüketimi"],
  ])("translates %s without leaking internal codes", (concept, value, expected) => {
    const summary = publicPreferenceSummary(event(concept, value));
    expect(summary).toBe(expected);
    expect(summary).not.toMatch(/\b[A-Z][A-Z0-9_]{2,}\b/u);
  });

  it("also repairs summaries embedded in an older handoff", () => {
    expect(humanizePreferenceText("Onaylı tercih: SAFETY_CONFIDENCE")).toBe("Onaylı tercih: doğrulanabilir güvenlik ve sürücü destekleri");
  });
});
