import { describe, expect, it } from "vitest";
import { applySemanticPreferenceSignals, latestActiveLedgerEvent } from "./ledger";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { detectExplicitUsagePurpose } from "./usageSemantics";

describe("V3 explicit usage semantics", () => {
  it.each([
    ["Yolcu taşıma amaçlı araç arıyorum.", "PASSENGER_TRANSPORT"],
    ["Okul servisi için sıfır bir araç alacağım.", "PASSENGER_TRANSPORT"],
    ["Havaalanı transferinde müşterilerimi taşıyacağım.", "PASSENGER_TRANSPORT"],
    ["Taksi olarak kullanacağım bir otomobil arıyorum.", "PASSENGER_TRANSPORT"],
    ["Kongre katılımcılarını otellerine taşıyacak sıfır bir araç arıyoruz.", "PASSENGER_TRANSPORT"],
    ["Satış ekibimiz müşteri ziyaretlerinde kullanacak.", "CORPORATE_TRAVEL"],
    ["Bayilere giden saha ekibine şirket aracı lazım.", "CORPORATE_TRAVEL"],
    ["Kolili ürün dağıtımı için araç arıyorum.", "COMMERCIAL"],
    ["Kolili ürünleri mağazalara dağıtmak için araç alacağım.", "COMMERCIAL"],
    ["Şantiyeye mal taşıyacağım bir panelvan istiyorum.", "COMMERCIAL"],
    ["Çocuklarımla kullanacağım aile aracı arıyorum.", "FAMILY"],
    ["Her hafta şehirler arası uzun yol yapıyorum.", "LONG_DISTANCE"],
    ["İşe gidip gelmek ve alışveriş için kullanacağım.", "URBAN_DAILY"],
    ["Köy yoluna ve bozuk yollara girecek araç lazım.", "MIXED_ROAD"],
  ])("classifies explicit daily language: %s", (message, expected) => {
    expect(detectExplicitUsagePurpose(message)?.value).toBe(expected);
  });

  it.each([
    ["İşim için bir araç arıyorum."],
    ["Yeni bir araç almak istiyorum."],
    ["İlk otomobilimi araştırıyorum."],
  ])("does not invent a usage from an underspecified purchase: %s", (message) => {
    expect(detectExplicitUsagePurpose(message)).toBeUndefined();
  });

  it.each([
    ["Yolcu taşıma amaçlı araç arıyorum.", "PASSENGER_TRANSPORT"],
    ["Satış temsilcilerimiz müşteri ziyaretlerinde kullanacak bir araç arıyoruz.", "CORPORATE_TRAVEL"],
    ["Kargo dağıtımı için yeni bir araç alacağım.", "COMMERCIAL"],
    ["Çocuklarımla şehir içinde kullanacağım bir araç istiyorum.", "FAMILY"],
    ["Her hafta şehirler arası yol yapacağım bir otomobil arıyorum.", "LONG_DISTANCE"],
    ["İşe gidip gelmek için küçük bir araba arıyorum.", "URBAN_DAILY"],
    ["Bozuk köy yollarında kullanacağım bir araç arıyorum.", "MIXED_ROAD"],
    ["Saha ekibimiz bayileri ziyaret etmek için yeni bir otomobil kullanacak.", "CORPORATE_TRAVEL"],
  ])("does not ask for an already-stated purpose: %s", async (message, expected) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: `usage:${expected}`, messageId: "1", message, expectedRevision: 0 });
    expect(latestActiveLedgerEvent(output.state.ledger, "primaryUsage")?.normalizedValue).toBe(expected);
    if (expected === "PASSENGER_TRANSPORT") expect(output.state.lastQuestionKey).toBe("passengerCapacity");
    expect(output.message).not.toMatch(/nerede ve ne için|hangi günlük ihtiyaç/iu);
  });

  it("projects a bounded model usage signal when fallback vocabulary has no phrase", () => {
    const state = createV3ConversationState("semantic-bridge");
    const message = "Aracı kongre katılımcılarını otellerine ulaştırmak için alıyoruz.";
    const next = applySemanticPreferenceSignals(state, [], "m1", [{ concept: "primaryUsage", normalizedValue: "PASSENGER_TRANSPORT", sourceSpan: { start: 0, end: message.length, text: message }, confidence: 0.91, explicit: true }]);
    expect(latestActiveLedgerEvent(next, "primaryUsage")).toMatchObject({ normalizedValue: "PASSENGER_TRANSPORT", authority: "USER_EXPLICIT", decisionUse: "HARD_FILTER" });
  });

  it("rejects a low-confidence model usage signal", () => {
    const state = createV3ConversationState("semantic-bridge-low");
    const message = "Bir araç düşünüyorum.";
    const next = applySemanticPreferenceSignals(state, [], "m1", [{ concept: "primaryUsage", normalizedValue: "URBAN_DAILY", sourceSpan: { start: 0, end: message.length, text: message }, confidence: 0.6, explicit: true }]);
    expect(latestActiveLedgerEvent(next, "primaryUsage")).toBeUndefined();
  });
});
