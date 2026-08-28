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

  it("answers a superlative electric purchase request from exact catalog facts", async () => {
    const catalog = await evaluateV3Catalog([]);
    const electric = catalog.variants.filter((variant) => variant.decisionFacts.powertrain.fuelType.value === "BEV" && variant.decisionFacts.efficiency.electricRangeKm);
    const maximum = Math.max(...electric.map((variant) => variant.decisionFacts.efficiency.electricRangeKm!.value));
    const leader = electric.find((variant) => variant.decisionFacts.efficiency.electricRangeKm!.value === maximum)!;
    const answer = answerV3CatalogQuestion("En yüksek menzile sahip elektrikli aracı satın almak istiyorum", catalog.variants);
    expect(answer).toContain(`${maximum.toLocaleString("tr-TR")} km`);
    expect(answer).toContain(`${leader.brand} ${leader.model} ${leader.trim}`);
    expect(answer).toMatch(/gerçek menzil/iu);
  });

  it("uses only reviewed color facts and explains incomplete coverage", async () => {
    const catalog = await evaluateV3Catalog([]);
    const known = answerV3CatalogQuestion("Siyah renk araç seçeneklerini görmek istiyorum", catalog.variants);
    const unknown = answerV3CatalogQuestion("Kırmızı araç seçeneklerini görmek istiyorum", catalog.variants);
    expect(known).toMatch(/Dacia Jogger/iu);
    expect(known).toMatch(/exact varyant ve stok rengi/iu);
    expect(unknown).toMatch(/doğrulanmış kırmızı.*yok/iu);
    expect(unknown).toMatch(/Renk verisi şu anda/iu);
  });

  it("can query governed equipment and owner-approved persona layers", async () => {
    const catalog = await evaluateV3Catalog([]);
    expect(answerV3CatalogQuestion("Geri görüş kamerası olan araçları listele", catalog.variants)).toMatch(/doğrulan/iu);
    expect(answerV3CatalogQuestion("Karakterli ve dikkat çekici araçları göster", catalog.variants)).toMatch(/persona katman/iu);
  });
});
