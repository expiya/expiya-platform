import type { CatalogVariantSnapshot } from "../v2/catalog/types";

const unique = (values: readonly string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "tr"));
const trNumber = (value: number) => value.toLocaleString("tr-TR");
const examplesAt = (variants: readonly CatalogVariantSnapshot[], select: (variant: CatalogVariantSnapshot) => number | undefined, target: number) =>
  unique(variants.filter((variant) => select(variant) === target).map((variant) => `${variant.brand} ${variant.model}`)).slice(0, 3).join(", ");
const scope = (count: number) => `Mevcut tercihlerine ve bütçe sınırına uyan ${trNumber(count)} sıfır araç varyantı içinde`;

const factExtreme = (
  variants: readonly CatalogVariantSnapshot[],
  select: (variant: CatalogVariantSnapshot) => number | undefined,
  mode: "MAX" | "MIN",
) => {
  const values = variants.map(select).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length ? (mode === "MAX" ? Math.max(...values) : Math.min(...values)) : undefined;
};

const fuelLabels: Readonly<Record<string, string>> = {
  GASOLINE: "benzinli", DIESEL: "dizel", LPG: "LPG", MHEV: "hafif hibrit", HEV: "tam hibrit", PHEV: "şarj edilebilir hibrit", BEV: "tam elektrikli", HYDROGEN: "hidrojen",
};

export function answerV3CatalogQuestion(message: string, variants: readonly CatalogVariantSnapshot[]): string | undefined {
  const text = message.toLocaleLowerCase("tr-TR");
  if (!variants.length) return undefined;
  if (!/\?|(?:kaç|hangi(?:si|leri)?|ne kadar|neler|nedir|var mı|bulunuyor mu)/iu.test(text)) return undefined;
  const scoped = scope(variants.length);

  if (/(?:en fazla|maksimum|en yüksek|kaç)\s*(?:kişi|kişilik|koltuk)|koltuk\s*(?:sayısı|kapasitesi).*(?:en fazla|maksimum|kaç)/iu.test(text)) {
    const value = factExtreme(variants, (variant) => variant.decisionFacts.dimensions.seats?.value, "MAX");
    if (value === undefined) return `${scoped} doğrulanmış koltuk kapasitesi bilgisi bulunmuyor.`;
    const examples = examplesAt(variants, (variant) => variant.decisionFacts.dimensions.seats?.value, value);
    return `${scoped} doğrulanmış en yüksek kapasite sürücü dahil ${value} kişi. Bu kapasiteye ulaşan örnekler: ${examples}.`;
  }
  if (/(?:hangi|kaç farklı).*?(?:kişi|kişilik|koltuk)|koltuk (?:seçenekleri|kapasiteleri)/iu.test(text)) {
    const values = unique(variants.flatMap((variant) => variant.decisionFacts.dimensions.seats ? [String(variant.decisionFacts.dimensions.seats.value)] : [])).map(Number).sort((a, b) => a - b);
    return values.length ? `${scoped} doğrulanmış koltuk kapasiteleri sürücü dahil ${values.join(", ")} kişi.` : undefined;
  }

  const metric: { readonly pattern: RegExp; readonly label: string; readonly unit: string; readonly select: (variant: CatalogVariantSnapshot) => number | undefined }[] = [
    { pattern: /(?:en büyük|en geniş|maksimum).*bagaj|bagaj.*(?:en büyük|en geniş|maksimum|kaç litre)/iu, label: "bagaj hacmi", unit: "litre", select: (v) => v.decisionFacts.dimensions.luggageLitres?.value },
    { pattern: /(?:en büyük|en yüksek|maksimum).*yük hacmi|yük hacmi.*(?:en büyük|en yüksek|maksimum|kaç litre)/iu, label: "yük hacmi", unit: "litre", select: (v) => v.decisionFacts.dimensions.cargoVolumeLitres?.value },
    { pattern: /(?:en yüksek|maksimum).*?(?:taşıma kapasitesi|istiap haddi|payload)|(?:taşıma kapasitesi|istiap haddi|payload).*?(?:en yüksek|maksimum|kaç kilo)/iu, label: "taşıma kapasitesi", unit: "kg", select: (v) => v.decisionFacts.dimensions.payloadKg?.value },
    { pattern: /(?:en yüksek|maksimum).*?(?:çekme kapasitesi|römork)|(?:çekme kapasitesi|römork).*?(?:en yüksek|maksimum|kaç kilo)/iu, label: "frenli çekme kapasitesi", unit: "kg", select: (v) => v.decisionFacts.dimensions.brakedTowingKg?.value },
    { pattern: /(?:en uzun|en yüksek|maksimum).*menzil|menzil.*(?:en uzun|en yüksek|maksimum|kaç km)/iu, label: "elektrikli menzil", unit: "km", select: (v) => v.decisionFacts.efficiency.electricRangeKm?.value },
    { pattern: /(?:en güçlü|en yüksek|maksimum).*?(?:güç|kw)|(?:güç|kw).*?(?:en yüksek|maksimum|kaç)/iu, label: "motor gücü", unit: "kW", select: (v) => v.decisionFacts.powertrain.powerKw.value },
  ];
  for (const item of metric) {
    if (!item.pattern.test(text)) continue;
    const value = factExtreme(variants, item.select, "MAX");
    if (value === undefined) return `${scoped} doğrulanmış ${item.label} bilgisi bulunmuyor.`;
    const examples = examplesAt(variants, item.select, value);
    return `${scoped} doğrulanmış en yüksek ${item.label} ${trNumber(value)} ${item.unit}. Bu değere ulaşan örnekler: ${examples}.`;
  }

  if (/(?:en ucuz|en düşük fiyat|minimum fiyat|fiyatı en düşük)|(?:en pahalı|en yüksek fiyat|maksimum fiyat)/iu.test(text)) {
    const publicPrices = variants.flatMap((variant) => {
      const price = variant.activeNewPrice;
      return price && price.consumerVisibility === "PUBLIC" && price.realizationSafe && ["LIST", "CAMPAIGN"].includes(price.priceType) ? [{ variant, amount: price.amountTry }] : [];
    });
    if (!publicPrices.length) return `${scoped} kullanıcıya gösterilebilen doğrulanmış güncel fiyat bulunmuyor.`;
    const wantsMaximum = /en pahalı|en yüksek fiyat|maksimum fiyat/iu.test(text);
    const amount = wantsMaximum ? Math.max(...publicPrices.map((item) => item.amount)) : Math.min(...publicPrices.map((item) => item.amount));
    const examples = unique(publicPrices.filter((item) => item.amount === amount).map((item) => `${item.variant.brand} ${item.variant.model}`)).slice(0, 3).join(", ");
    return `${scoped} kullanıcıya gösterilebilir doğrulanmış ${wantsMaximum ? "en yüksek" : "en düşük"} fiyat ${trNumber(amount)} TL; örnek araçlar: ${examples}. Fiyat ve stok satın alma öncesinde satıcıdan doğrulanmalıdır.`;
  }

  if (/(?:kaç|hangi)\s+(?:farklı\s+)?(?:marka|markalar)|marka seçenekleri/iu.test(text)) {
    const brands = unique(variants.map((variant) => variant.brand));
    return `${scoped} ${brands.length} marka var: ${brands.join(", ")}.`;
  }
  if (/(?:kaç|hangi)\s+(?:farklı\s+)?(?:model|modeller)|model seçenekleri/iu.test(text)) {
    const models = unique(variants.map((variant) => `${variant.brand} ${variant.model}`));
    const preview = models.slice(0, 12).join(", ");
    return `${scoped} ${models.length} farklı marka-model var. İlk örnekler: ${preview}${models.length > 12 ? ". İstersen marka, gövde veya kullanım türüyle listeyi daraltabilirim." : "."}`;
  }
  if (/(?:hangi|kaç farklı).*yakıt|yakıt (?:türleri|seçenekleri).*(?:var|neler)/iu.test(text)) {
    const fuels = unique(variants.map((variant) => fuelLabels[variant.decisionFacts.powertrain.fuelType.value] ?? variant.decisionFacts.powertrain.fuelType.value));
    return `${scoped} bulunan yakıt seçenekleri: ${fuels.join(", ")}.`;
  }
  if (/(?:hangi|kaç farklı).*gövde|gövde (?:tipleri|seçenekleri).*(?:var|neler)/iu.test(text)) {
    const bodies = unique(variants.map((variant) => variant.decisionFacts.bodyStyle.value));
    return `${scoped} bulunan gövde seçenekleri: ${bodies.join(", ")}.`;
  }
  if (/(?:hangi|kaç farklı).*şanzıman|şanzıman (?:türleri|seçenekleri).*(?:var|neler)|hangi vites/iu.test(text)) {
    const transmissions = unique(variants.map((variant) => variant.decisionFacts.powertrain.transmission.value));
    return `${scoped} bulunan şanzıman seçenekleri: ${transmissions.join(", ")}.`;
  }
  if (/(?:kaç|ne kadar)\s+(?:araç|varyant|seçenek)|(?:araç|varyant|seçenek)\s+sayısı/iu.test(text))
    return `Mevcut tercihlerine ve bütçe sınırına uyan ${trNumber(variants.length)} sıfır araç varyantı var.`;
  return undefined;
}
