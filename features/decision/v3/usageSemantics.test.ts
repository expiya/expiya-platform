import { afterEach, describe, expect, it } from "vitest";
import { applySemanticPreferenceSignals, latestActiveLedgerEvent } from "./ledger";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { detectExplicitUsagePurpose } from "./usageSemantics";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

describe("V3 explicit usage semantics", () => {
  it.each([
    ["Yolcu taşıma amaçlı araç arıyorum.", "PASSENGER_TRANSPORT"],
    ["Kongre katılımcılarını otelleri ile etkinlik alanı arasında taşımak için sıfır bir araç arıyoruz.", "PASSENGER_TRANSPORT"],
    ["Saha ekibimiz bayileri ve müşterileri ziyaret etmek için yeni bir otomobil kullanacak.", "CORPORATE_TRAVEL"],
    ["Kolili ürünleri mağazalara dağıtmak için sıfır bir araç satın alacağım.", "COMMERCIAL"],
    ["Şehir içinde kullanacağım, daha ferah ve yüksek bir araç arıyorum.", "URBAN_DAILY"],
    ["Çocuklarımla şehir içinde kullanacağım bir araç istiyorum.", "FAMILY"],
    ["Her hafta şehirler arası yol yapacağım.", "LONG_DISTANCE"],
    ["Bozuk köy yollarında kullanacağım.", "MIXED_ROAD"],
    ["Köyde kullanacağım, bozuk ve stabilize yollarda rahatlıkla gidebilen bir araç arıyorum.", "MIXED_ROAD"],
    ["Köyde kullanacağım.", "MIXED_ROAD"],
    ["Köyde yaşıyorum, bağ bahçe işleriyle uğraşıyorum ve araç almak istiyorum.", "RURAL_DAILY"],
    ["Stabilize yollarda kullanacağım.", "MIXED_ROAD"],
  ])("classifies explicit usage: %s", (message, expected) => {
    expect(detectExplicitUsagePurpose(message)?.value).toBe(expected);
  });

  it("does not turn high ride height into commercial use", () => {
    expect(detectExplicitUsagePurpose("Şehir içinde kullanacağım, daha ferah ve yüksek bir araç arıyorum.")?.value).toBe("URBAN_DAILY");
  });

  it("returns the exact matched source span instead of the whole message", () => {
    const message = "Aracı özellikle şehirler arası yolculuklarda kullanacağım.";
    expect(detectExplicitUsagePurpose(message)?.sourceSpan).toEqual({ start: 16, end: 30, text: "şehirler arası" });
  });

  it.each(["İşim için araç arıyorum.", "Merhaba, nasılsın?", "Elektrikli araçların menzili nasıl hesaplanır?"])("does not invent usage: %s", (message) => {
    expect(detectExplicitUsagePurpose(message)).toBeUndefined();
  });

  it.each([
    ["Yolcu taşıma amaçlı araç arıyorum.", "PASSENGER_TRANSPORT"],
    ["Kongre katılımcılarını otelleri ile etkinlik alanı arasında taşımak için sıfır bir araç arıyoruz.", "PASSENGER_TRANSPORT"],
    ["Saha ekibimiz bayileri ve müşterileri ziyaret etmek için yeni bir otomobil kullanacak.", "CORPORATE_TRAVEL"],
    ["Kolili ürünleri mağazalara dağıtmak için sıfır bir araç satın alacağım.", "COMMERCIAL"],
    ["Şehir içinde kullanacağım, daha ferah ve yüksek bir araç arıyorum.", "URBAN_DAILY"],
    ["Çocuklarımla şehir içinde kullanacağım bir araç istiyorum.", "FAMILY"],
    ["Her hafta şehirler arası yol yapacağım.", "LONG_DISTANCE"],
    ["Bozuk köy yollarında kullanacağım.", "MIXED_ROAD"],
    ["Köyde kullanacağım, bozuk ve stabilize yollarda rahatlıkla gidebilen bir araç arıyorum.", "MIXED_ROAD"],
  ])("does not ask an already stated usage again: %s", async (message, expected) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: `usage:${expected}`, messageId: "m1", message, expectedRevision: 0 });
    expect(latestActiveLedgerEvent(output.state.ledger, "primaryUsage")?.normalizedValue).toBe(expected);
    expect(output.message).not.toMatch(/nerede ve ne için|hangi günlük ihtiyaç/iu);
    if (expected === "PASSENGER_TRANSPORT") {
      expect(output.state.lastQuestionKey).toBe("passengerCapacity");
      expect(output.message).toMatch(/sürücü dahil.*toplam kaç kişi/iu);
    }
  });

  it("asks one clarifying usage question for an underspecified business need", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "usage:business-unspecified", messageId: "m1", message: "İşim için araç arıyorum.", expectedRevision: 0 });
    expect(latestActiveLedgerEvent(output.state.ledger, "primaryUsage")).toBeUndefined();
    expect((output.message.match(/\?/gu) ?? [])).toHaveLength(1);
    expect(output.state.lastQuestionKey).toBe("primaryUsage");
  });

  it("does not ask rural use again when village life and orchard work are explicit", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({
      conversationId: "usage:rural-orchard",
      messageId: "m1",
      message:
        "Köyde yaşıyorum. Bağ bahçe işleriyle uğraşıyorum. Araç almak istiyorum, ne önerirsin?",
      expectedRevision: 0,
    });
    expect(
      latestActiveLedgerEvent(output.state.ledger, "primaryUsage")
        ?.normalizedValue,
    ).toBe("RURAL_DAILY");
    expect(output.message).not.toMatch(/nerede ve ne için/iu);
    expect(output.message).toMatch(/bozuk veya stabilize.*ekipman ve ürün.*günlük ulaşım/iu);
    expect(output.message).not.toMatch(/SUV.*pick-up/iu);
  });

  it("does not invent camping or four-wheel drive for an explicit village-road need", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "usage:village-road-copy", messageId: "m1", message: "Köyde kullanacağım, bozuk ve stabilize yollarda rahatlıkla gidebilen bir araç arıyorum.", expectedRevision: 0 });
    expect(output.message).toMatch(/bozuk veya değişken zemin/iu);
    expect(output.message).not.toMatch(/kamp|4x4 kullanımı net/iu);
  });

  it("accepts only explicit, sufficiently confident model usage signals", () => {
    const state = createV3ConversationState("semantic-bridge");
    const message = "Aracı kongre katılımcılarını taşımak için alıyoruz.";
    const explicit = applySemanticPreferenceSignals(state, [], "m1", [{ concept: "primaryUsage", normalizedValue: "PASSENGER_TRANSPORT", sourceSpan: { start: 0, end: message.length, text: message }, confidence: 0.91, explicit: true }]);
    expect(latestActiveLedgerEvent(explicit, "primaryUsage")).toMatchObject({ normalizedValue: "PASSENGER_TRANSPORT", authority: "USER_EXPLICIT", decisionUse: "HARD_FILTER" });
    const low = applySemanticPreferenceSignals(state, [], "m2", [{ concept: "primaryUsage", normalizedValue: "URBAN_DAILY", sourceSpan: { start: 0, end: 5, text: "Aracı" }, confidence: 0.6, explicit: true }]);
    expect(latestActiveLedgerEvent(low, "primaryUsage")).toBeUndefined();
  });
});
