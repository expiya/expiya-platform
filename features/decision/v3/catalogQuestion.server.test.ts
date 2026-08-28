import { describe, expect, it } from "vitest";
import { evaluateV3Catalog } from "./catalogAdapter.server";
import { answerV3CatalogQuestion } from "./catalogQuestion.server";

describe("V3 catalog questions", () => {
  it("answers maximum passenger capacity from the active filtered catalog", async () => {
    const catalog = await evaluateV3Catalog([]);
    const answer = answerV3CatalogQuestion("En fazla kaç kişilik araç var?", catalog.variants);
    const maximum = Math.max(...catalog.variants.flatMap((variant) => variant.decisionFacts.dimensions.seats ? [variant.decisionFacts.dimensions.seats.value] : []));
    expect(answer).toContain(`sürücü dahil ${maximum} kişi`);
    expect(answer).toMatch(/örnek/iu);
  });

  it.each([
    "En büyük bagaj kaç litre?",
    "En yüksek taşıma kapasitesi kaç kilo?",
    "En uzun elektrikli menzil kaç km?",
    "En güçlü araç kaç kW?",
    "Hangi markalar var?",
    "Kaç farklı model var?",
    "Hangi yakıt türleri var?",
    "Hangi gövde tipleri var?",
    "Hangi şanzıman seçenekleri var?",
    "Kaç araç seçeneği kaldı?",
  ])("answers a bounded catalog fact question: %s", async (question) => {
    const catalog = await evaluateV3Catalog([]);
    expect(answerV3CatalogQuestion(question, catalog.variants)).toBeTruthy();
  });

  it("does not expose internal estimate amounts", async () => {
    const catalog = await evaluateV3Catalog([]);
    const answer = answerV3CatalogQuestion("En ucuz araç hangisi?", catalog.variants);
    expect(answer).toBeTruthy();
    const internalAmounts = catalog.variants.flatMap((variant) => variant.activeNewPrice?.consumerVisibility === "INTERNAL_ONLY" ? [variant.activeNewPrice.amountTry.toLocaleString("tr-TR")] : []);
    for (const amount of internalAmounts) expect(answer).not.toContain(amount);
  });
});
