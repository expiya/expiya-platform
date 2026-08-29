import { afterEach, describe, expect, it } from "vitest";
import { evaluateV3Catalog, resolveV3CatalogEntities } from "./catalogAdapter.server";
import { runV3Turn } from "./engine.server";
import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

describe("V3 catalog entity and candidate-aware question planning", () => {
  it("resolves brand and model names from the active catalog instead of a hand-written model list", async () => {
    const signals = await resolveV3CatalogEntities("Benzinli bir Volkswagen Golf almayı planlıyorum.");
    expect(signals.brands).toContain("Volkswagen");
    expect(signals.models).toContain("Golf");
  });

  it("filters Golf variants and does not ask usage after an exact model choice", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "golf-model", messageId: "1", message: "Benzinli, otomatik vites bir Volkswagen Golf almayı planlıyorum.", expectedRevision: 0 });
    expect(activeDecisionPreferences(output.state.ledger)).toEqual(expect.arrayContaining([
      expect.objectContaining({ concept: "brandPreference", normalizedValue: "Volkswagen" }),
      expect.objectContaining({ concept: "modelPreference", normalizedValue: "Golf" }),
    ]));
    expect(output.message).not.toMatch(/nerede ve ne için|günlük ihtiyaç/iu);
    expect(output.message).toMatch(/tek seçimi hazırladım.*Göstermemi ister misin/iu);
    expect(output.offerAwaitingConsent).toBe(true);
    const catalog = await evaluateV3Catalog(output.state.ledger);
    expect(catalog.variants.length).toBeGreaterThan(0);
    expect(catalog.variants).toHaveLength(1);
    expect(catalog.variants.length).toBeLessThan(catalog.initialCount);
    expect(catalog.variants.every((item) => item.brand === "Volkswagen" && item.model === "Golf")).toBe(true);
  });

  it("does not turn the first catalog-ordered variant into a decision when an exact model still has distinguishable versions", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "sportage-versions", messageId: "1", message: "Kia Sportage almak istiyorum", expectedRevision: 0 });
    const catalog = await evaluateV3Catalog(output.state.ledger);
    expect(catalog.variants).toHaveLength(6);
    expect(output.offerAwaitingConsent).not.toBe(true);
    expect(output.state.lastQuestionKey).toMatch(/^technicalDiscriminator:/u);
    expect(output.message).toMatch(/referans aralıkları|teknik farklara/iu);
    expect(output.message).toMatch(/110–132 kW/iu);
  });

  it("treats a previous Passat as a reference instead of an unavailable exact sedan constraint", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({
      conversationId: "passat-reference",
      messageId: "1",
      message: "Yeni bir araç almak istiyorum ama ne alacağımı bilmiyorum.",
      expectedRevision: 0,
    });
    output = await runV3Turn({
      conversationId: "passat-reference",
      messageId: "2",
      message: "Eski arabam Passat'tı. Yine benzer bir şey olsun.",
      expectedRevision: output.state.revision,
      state: output.state,
    });
    expect(latestActiveLedgerEvent(output.state.ledger, "modelPreference")).toMatchObject({ normalizedValue: "Passat", decisionUse: "SOFT_RANK" });
    expect(output.message).toMatch(/referans araç[\s\S]*Yeni Passat Variant/iu);
    expect(output.message).not.toMatch(/uygun araç kalmıyor|gövde tipini esnet/iu);
    expect(output.state.lastQuestionKey).toBe("referenceVehiclePriorities");
    expect((await evaluateV3Catalog(output.state.ledger)).variants.length).toBeGreaterThan(0);

    output = await runV3Turn({
      conversationId: "passat-reference",
      messageId: "3",
      message: "Passat artık üretilmiyor sanırım. Benzer bir araç istiyorum.",
      expectedRevision: output.state.revision,
      state: output.state,
    });
    expect(output.message).toMatch(/tamamen üretimden kalkmış değil[\s\S]*sedan gövde artık sunulmuyor[\s\S]*2 Passat Variant/iu);
    expect(output.message).toMatch(/uzun yol konforu[\s\S]*geniş arka koltuk[\s\S]*büyük bagaj[\s\S]*sedan/iu);
  });

  it.each([
    "Bütçem hazır; 360 derece kameralı bir Volvo XC40 arıyorum.",
    "Bütçemi ayarladım, koltuk ısıtmalı bir Peugeot 3008 alacağım.",
    "4x4 bir Dacia Duster arıyorum, bütçem net.",
  ])("does not mistake equipment, model or drivetrain numbers for money: %s", async (message) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: message, messageId: "1", message, expectedRevision: 0 });
    expect(latestActiveLedgerEvent(output.state.ledger, "budgetMax")).toBeUndefined();
  });

  it("accepts compact million notation without confusing it with a model number", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "compact-budget", messageId: "1", message: "2.5M TL bütçeyle alınacak en iyi 3 arabayı söyle.", expectedRevision: 0 });
    expect(latestActiveLedgerEvent(output.state.ledger, "budgetMax")?.normalizedValue).toBe(2_500_000);
  });
});
