import { afterEach, describe, expect, it } from "vitest";
import { runV3Turn } from "./engine.server";
import { routeConversationMessage } from "./router";
import { evaluateV3Catalog, resolveV3CatalogEntities } from "./catalogAdapter.server";
import type { PreferenceEvent } from "./types";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

describe("V3.8 corpus-derived conversation contracts", () => {
  it.each([
    "Cuma akşamı bagaja kamp malzemelerini atıp kaçmalık, arkasında yatılabilecek bir araba arıyorum.",
    "Bel fıtığım var, rahat ve sarsmayan bir araç lazım.",
    "Hafta sonu bisikletimi sökmeden atabileceğim bir araba bakıyorum.",
    "Virajlı yollarda sürüşü keyifli bir şey önerir misin?",
  ])("keeps a holistic vehicle search out of social and off-topic routes: %s", (message) => {
    expect(["PURCHASE_INTENT_DISCOVERY", "RECOMMENDATION_OR_OFFER"]).toContain(routeConversationMessage(message, { hasPurchaseIntent: false, hasOpenQuestion: false }).route);
  });

  it("preserves a daily-life need as a weak question input, never as an invented hard filter", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "v38-ergonomics", messageId: "1", message: "Bel fıtığım var, koltuğu rahat ve süspansiyonu yumuşak bir araç lazım.", expectedRevision: 0 });
    expect(output.state.purchaseIntent).toBe("EXPLICIT");
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "ergonomicComfort", strength: "WEAK_SIGNAL", decisionUse: "QUESTION_INPUT", authority: "USER_EXPLICIT" }));
    expect(output.state.ledger.some((item) => item.concept === "bodyStyle" || item.concept === "minimumSeats")).toBe(false);
  });

  it("keeps a confirmed non-catalog daily-life signal soft", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "v38-cargo", messageId: "1", message: "Bisikletimi sökmeden taşıyabileceğim bir araba arıyorum.", expectedRevision: 0 });
    output = await runV3Turn({ conversationId: "v38-cargo", messageId: "2", message: "Evet, bagaj çok önemli.", expectedRevision: 1, state: output.state });
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "cargoPracticality", strength: "CONFIRMED_STRONG", decisionUse: "SOFT_RANK" }));
    expect(output.state.ledger.some((item) => item.concept === "cargoPracticality" && item.decisionUse === "HARD_FILTER")).toBe(false);
  });

  it.each([
    ["Selam, orada kimse var mı?", /Evet, buradayım.*nasıl yardımcı/iu],
    ["Merhabalar, müsait misiniz?", /Merhaba.*Nasıl yardımcı/iu],
    ["Selam dostum, nasılsın?", /Merhaba.*Nasıl yardımcı/iu],
  ])("keeps ordinary availability greetings social: %s", async (message, expected) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: `greeting:${message}`, messageId: "1", message, expectedRevision: 0 });
    expect(output.state.lastRoute).toBe("SOCIAL_CONVERSATION");
    expect(output.message).toMatch(expected);
  });

  it.each([
    ["Kredim onaylandı, 1.200.000 TL bütçeyle bugün araba seçmeye geldim.", 1_200_000],
    ["1.100.000 TL bütçeyle bugün bir araç bulalım.", 1_100_000],
    ["Bütçem 1.8M.", 1_800_000],
  ])("parses Turkish budget notation without truncation: %s", async (message, expected) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: `budget:${message}`, messageId: "1", message, expectedRevision: 0 });
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "budgetMax", normalizedValue: expected }));
  });

  it("does not interpret a numeric budget range as a catalog model", async () => {
    const entities = await resolveV3CatalogEntities("600-700 bin TL arası şehir arabası arıyorum.");
    expect(entities.models).not.toContain("600");
  });

  it("resolves catalog model families without cross-brand contradictions", async () => {
    await expect(resolveV3CatalogEntities("Peugeot 5008 veya Skoda Kodiaq arıyorum")).resolves.toMatchObject({ brands: expect.arrayContaining(["Peugeot", "Škoda"]), models: expect.arrayContaining(["5008", "Kodiaq"]) });
    await expect(resolveV3CatalogEntities("BMW 3 Serisi arıyorum")).resolves.toMatchObject({ brands: ["BMW"], models: expect.arrayContaining(["320i Sedan"]) });
    await expect(resolveV3CatalogEntities("Dizel manuel Fiat Doblo arıyorum")).resolves.toMatchObject({ models: expect.arrayContaining(["Doblo", "Doblo Cargo"]) });
  });

  it("keeps persona signals decision-neutral and soft", async () => {
    const baseline = await evaluateV3Catalog([]);
    const preference = { id: "persona-design", sourceMessageId: "1", sourceTurn: 1, sourceSpan: { start: 0, end: 9, text: "karizmatik" }, concept: "distinctiveDesign", normalizedValue: "DISTINCTIVE_DESIGN", strength: "CONFIRMED_STRONG", status: "ACTIVE", decisionUse: "SOFT_RANK", confidence: 1, authority: "USER_CONFIRMED", confirmationRequired: false } satisfies PreferenceEvent;
    const withPersona = await evaluateV3Catalog([preference]);
    expect(withPersona.candidateIds).toEqual(baseline.candidateIds);
  });

  it("does not zero a relevant body-style pool when equipment evidence has no coverage in that pool", async () => {
    const preference = (concept: string, field: string, normalizedValue: string): PreferenceEvent => ({ id: concept, sourceMessageId: "1", sourceTurn: 1, sourceSpan: { start: 0, end: 1, text: "x" }, concept, field, normalizedValue, strength: "EXPLICIT_STRONG", status: "ACTIVE", decisionUse: "HARD_FILTER", confidence: 1, authority: "USER_EXPLICIT", confirmationRequired: false });
    const sedans = await evaluateV3Catalog([preference("bodyStyle", "bodyStyle", "SEDAN")]);
    const withUnsupportedAcc = await evaluateV3Catalog([preference("bodyStyle", "bodyStyle", "SEDAN"), preference("equipmentFeature", "equipmentFeature", "ADAPTIVE_CRUISE_CONTROL")]);
    expect(withUnsupportedAcc.candidateIds).toEqual(sedans.candidateIds);
  });

  it.each([
    ["Uygun fiyatlı ticari araç seçenekleri arıyorum.", "COMMERCIAL"],
    ["4x4 bir arazi aracı bakıyorum.", "MIXED_ROAD"],
    ["Benzinli manuel, ayağımı yerden kesecek bir araç lazım.", "URBAN_DAILY"],
    ["İki çocukla sığamıyoruz; MPV veya büyük SUV alacağız.", "FAMILY"],
  ])("projects an already-stated usage instead of asking it again: %s", async (message, usage) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: `usage:${message}`, messageId: "1", message, expectedRevision: 0 });
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "primaryUsage", normalizedValue: usage }));
    expect(output.state.lastQuestionKey).not.toBe("primaryUsage");
  });

  it.each([
    ["Akşam sahilde panoramik cam tavandan gökyüzünü izleyebileceğimiz romantik bir araba arıyorum.", "glassRoofPreference"],
    ["Dikkat çekici, farklı tasarımlı karizmatik bir araba istiyorum.", "distinctiveDesign"],
    ["Arka koltuk diz mesafesi çok geniş bir araç lazım.", "rearSeatSpace"],
    ["İçi uçak kokpiti gibi, ambiyans aydınlatmalı bir araç arıyorum.", "cockpitAmbience"],
  ])("preserves persona-like daily language as a weak signal: %s", async (message, concept) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: `signal:${message}`, messageId: "1", message, expectedRevision: 0 });
    expect(output.state.purchaseIntent).toBe("EXPLICIT");
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept, strength: "WEAK_SIGNAL", decisionUse: "QUESTION_INPUT" }));
  });

  it("answers pure automotive information without mutating preferences, then asks one low-pressure sales question", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "v38-info", messageId: "1", message: "Elektrikli araç bataryasının ömrü ne kadar?", expectedRevision: 0 });
    expect(output.state.lastRoute).toBe("AUTOMOTIVE_INFORMATION");
    expect(output.state.ledger).toHaveLength(0);
    expect(output.message).toMatch(/kapasitesini yıllar içinde.*yalnızca bilgi.*kendi kullanımın/iu);
    expect(output.state.lastQuestionKey).toBe("purchaseInterest");
  });
});
