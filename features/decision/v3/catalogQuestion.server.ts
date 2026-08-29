import type { CatalogVariantSnapshot } from "../v2/catalog/types";
import { getReviewedSalesColors } from "@/features/sales-advisor/salesKnowledge.server";
import { getEquipmentFeatureDefinition, resolveEquipmentRequirement } from "@/features/vehicle-data/equipmentEvidenceResolver";
import type { EquipmentFeatureCode } from "@/types/equipmentEvidence";
import type { VehiclePersonaTrait } from "@/types/vehiclePersona";
import { getV3PersonaTraits, v35EquipmentMatchAuthority } from "./catalogAdapter.server";

const unique = (values: readonly string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "tr"));
const trNumber = (value: number) => value.toLocaleString("tr-TR");
const examplesAt = (variants: readonly CatalogVariantSnapshot[], select: (variant: CatalogVariantSnapshot) => number | undefined, target: number) =>
  unique(variants.filter((variant) => select(variant) === target).map((variant) => `${variant.brand} ${variant.model}`)).slice(0, 3).join(", ");
const scope = (count: number) => `Mevcut tercihlerine ve bütçe sınırına uyan ${trNumber(count)} sıfır araç varyantı içinde`;
const title = (variant: CatalogVariantSnapshot) => `${variant.brand} ${variant.model} ${variant.trim}`;
const preview = (variants: readonly CatalogVariantSnapshot[], limit = 5) => unique(variants.map(title)).slice(0, limit).join(", ");
const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/\p{M}+/gu, "").replace(/ı/gu, "i").replace(/[^a-z0-9]+/gu, " ").trim();

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

export interface V3ExtremeSelection {
  readonly concept: string;
  readonly label: string;
  readonly unit: string;
  readonly value: number;
  readonly leaders: readonly CatalogVariantSnapshot[];
}

export function resolveV3ExtremeSelection(
  message: string,
  variants: readonly CatalogVariantSnapshot[],
): V3ExtremeSelection | undefined {
  if (!/(?:göster|öner|seç|hangisi|hangi araç|istiyorum)/iu.test(message)) return undefined;
  const definitions: readonly {
    readonly pattern: RegExp;
    readonly concept: string;
    readonly label: string;
    readonly unit: string;
    readonly mode: "MAX" | "MIN";
    readonly select: (variant: CatalogVariantSnapshot) => number | undefined;
    readonly scope?: (variant: CatalogVariantSnapshot) => boolean;
  }[] = [
    { pattern: /(?:en fazla|en yüksek|maksimum).{0,32}(?:kişi|kişilik|koltuk)/iu, concept: "candidateSeatsPriority", label: "yolcu kapasitesi", unit: "kişi", mode: "MAX", select: (v) => v.decisionFacts.dimensions.seats?.value },
    { pattern: /(?:en yüksek|en uzun|maksimum).{0,32}menzil/iu, concept: "candidateRangePriority", label: "elektrikli menzil", unit: "km", mode: "MAX", select: (v) => v.decisionFacts.efficiency.electricRangeKm?.value, scope: (v) => v.decisionFacts.powertrain.fuelType.value === "BEV" },
    { pattern: /(?:en yüksek|maksimum).{0,32}(?:taşıma kapasite(?:si|li)|yük kapasite(?:si|li)|tonaj|istiap)/iu, concept: "candidatePayloadPriority", label: "taşıma kapasitesi", unit: "kg", mode: "MAX", select: (v) => v.decisionFacts.dimensions.payloadKg?.value },
    { pattern: /(?:en yüksek|maksimum).{0,32}(?:çekme kapasitesi|römork)/iu, concept: "candidateTowingPriority", label: "frenli çekme kapasitesi", unit: "kg", mode: "MAX", select: (v) => v.decisionFacts.dimensions.brakedTowingKg?.value },
    { pattern: /(?:en yüksek|en güçlü|maksimum).{0,32}(?:motor gücü|güç|kw)/iu, concept: "candidatePowerPriority", label: "motor gücü", unit: "kW", mode: "MAX", select: (v) => v.decisionFacts.powertrain.powerKw.value },
    { pattern: /(?:en yüksek|maksimum).{0,32}tork/iu, concept: "candidateTorquePriority", label: "tork", unit: "Nm", mode: "MAX", select: (v) => v.decisionFacts.powertrain.torqueNm?.value },
    { pattern: /(?:en yüksek|en büyük|maksimum).{0,32}bagaj/iu, concept: "candidateLuggagePriority", label: "bagaj hacmi", unit: "litre", mode: "MAX", select: (v) => v.decisionFacts.dimensions.luggageLitres?.value },
    { pattern: /(?:en düşük|en ucuz|minimum).{0,32}(?:fiyat|satın alma)/iu, concept: "candidatePricePriority", label: "doğrulanmış satış fiyatı", unit: "TL", mode: "MIN", select: (v) => v.activeNewPrice?.consumerVisibility === "PUBLIC" && v.activeNewPrice.realizationSafe ? v.activeNewPrice.amountTry : undefined },
  ];
  const definition = definitions.find((item) => item.pattern.test(message));
  if (!definition) return undefined;
  const scoped = definition.scope ? variants.filter(definition.scope) : variants;
  const value = factExtreme(scoped, definition.select, definition.mode);
  if (value === undefined) return undefined;
  const leaders = scoped.filter((variant) => definition.select(variant) === value);
  return { concept: definition.concept, label: definition.label, unit: definition.unit, value, leaders };
}

export function answerV3CatalogQuestion(message: string, variants: readonly CatalogVariantSnapshot[]): string | undefined {
  const text = message.toLocaleLowerCase("tr-TR");
  if (!variants.length) return undefined;
  const catalogLookup = /\?|(?:kaç|hangi(?:si|leri)?|ne kadar|neler|nedir|var mı|bulunuyor mu|listele|göster|seçenekleri görmek|seçeneklerini görmek|arasından)/iu.test(text)
    || /(?:en yüksek|en düşük|en uzun|en güçlü|en geniş|maksimum|minimum).*sahip.*(?:satın almak|seçmek|istiyorum)/iu.test(text);
  if (!catalogLookup) return undefined;
  const scoped = scope(variants.length);

  const requestedColor = ["kırmızı", "beyaz", "siyah", "gri", "mavi", "yeşil", "bej", "kahverengi", "sarı", "turuncu"].find((color) => normalize(text).includes(normalize(color)));
  if (requestedColor && /renk|ara[çc]|otomobil|varyant|seçenek/iu.test(text)) {
    const withKnownColors = variants.map((variant) => ({ variant, colors: getReviewedSalesColors({ brand: variant.brand, model: variant.model, modelYear: variant.decisionFacts.modelYear.value }) })).filter((item) => item.colors.length > 0);
    const matches = withKnownColors.filter((item) => item.colors.some((color) => normalize(String(color.value)).includes(normalize(requestedColor)))).map((item) => item.variant);
    if (!matches.length) return `${scoped} doğrulanmış ${requestedColor} dış renk seçeneği bulunan bir araç kaydı yok. Renk verisi şu anda ${trNumber(withKnownColors.length)} varyant için doğrulanmış durumda; kaydı bulunmayan araçlar hakkında renk iddiasında bulunmuyorum.`;
    return `${scoped} doğrulanmış ${requestedColor} renk seçeneği bulunan ${unique(matches.map(title)).length} varyant var: ${preview(matches)}. Renk kaydı model ailesi düzeyinde olabilir; exact varyant ve stok rengi sipariş öncesinde doğrulanmalıdır.`;
  }

  const governedEquipmentPhrases: readonly { pattern: RegExp; featureCode: EquipmentFeatureCode }[] = [
    { pattern: /geri görüş kamerası/iu, featureCode: "REAR_VIEW_CAMERA" },
    { pattern: /(?:360|çevre)\s*(?:derece\s*)?kamera/iu, featureCode: "SURROUND_VIEW_CAMERA_360" },
    { pattern: /park sensör/iu, featureCode: "REAR_PARKING_SENSORS" },
    { pattern: /otomatik park/iu, featureCode: "AUTOMATIC_PARK_ASSIST" },
    { pattern: /adaptif hız sabitle/iu, featureCode: "ADAPTIVE_CRUISE_CONTROL" },
    { pattern: /kör nokta/iu, featureCode: "BLIND_SPOT_MONITOR" },
    { pattern: /isofix/iu, featureCode: "ISOFIX_REAR_OUTER" },
    { pattern: /anahtarsız çalıştır/iu, featureCode: "KEYLESS_START" },
  ];
  const resolvedEquipment = resolveEquipmentRequirement(message).find((item) => item.polarity === "AFFIRMED");
  const equipmentMatch = resolvedEquipment ?? governedEquipmentPhrases.find((item) => item.pattern.test(message));
  if (equipmentMatch?.featureCode && /(?:olan|bulunan|hangi|listele|göster|seçenek|istiyorum)/iu.test(text)) {
    const featureCode = equipmentMatch.featureCode;
    const matches = variants.filter((variant) => v35EquipmentMatchAuthority(variant, featureCode) === "VERIFIED");
    const label = getEquipmentFeatureDefinition(featureCode)?.labelTr ?? String(featureCode);
    if (!matches.length) return `${scoped} ${label.toLocaleLowerCase("tr-TR")} donanımı exact varyant düzeyinde doğrulanmış bir seçenek bulunmuyor. Doğrulanmamış veya opsiyonel kayıtları varmış gibi listelemiyorum.`;
    return `${scoped} ${label.toLocaleLowerCase("tr-TR")} donanımı doğrulanmış ${unique(matches.map(title)).length} varyant var: ${preview(matches)}${matches.length > 5 ? ". Listeyi başka bir özellikle daraltabilirim." : "."}`;
  }

  const personaPatterns: readonly { pattern: RegExp; trait: VehiclePersonaTrait; label: string }[] = [
    { pattern: /(?:dikkat çekici|karakterli|özgün|tasarım odaklı)/iu, trait: "DESIGN", label: "tasarım karakteri güçlü" },
    { pattern: /(?:sürüş keyfi|sürüş odaklı|dinamik sürüş)/iu, trait: "DRIVING_ENGAGEMENT", label: "sürüş odaklı" },
    { pattern: /(?:konforlu|konfor odaklı)/iu, trait: "COMFORT", label: "konfor odaklı" },
    { pattern: /(?:pratik|kullanışlı)/iu, trait: "PRACTICALITY", label: "pratiklik odaklı" },
    { pattern: /(?:teknolojik|teknoloji odaklı)/iu, trait: "TECHNOLOGY", label: "teknoloji odaklı" },
    { pattern: /(?:prestijli|premium karakter)/iu, trait: "PRESTIGE", label: "prestij odaklı" },
    { pattern: /(?:macera|outdoor|arazi karakterli)/iu, trait: "ADVENTURE", label: "macera odaklı" },
  ];
  const persona = personaPatterns.find((item) => item.pattern.test(text));
  if (persona && /(?:hangi|listele|göster|seçenek|ara[çc]|otomobil|istiyorum)/iu.test(text)) {
    const matches = variants.filter((variant) => getV3PersonaTraits(variant.id).has(persona.trait));
    if (!matches.length) return `${scoped} sahibi tarafından onaylanmış persona katmanında ${persona.label} bir seçenek bulunmuyor.`;
    return `${scoped} onaylı persona katmanında ${persona.label} ${unique(matches.map(title)).length} varyant var: ${preview(matches)}. Bu etiket yalnız yumuşak tercih sinyalidir; teknik özellik veya kalite garantisi değildir.`;
  }

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
    const metricVariants = item.label === "elektrikli menzil" && /elektrikli|elektrik/iu.test(text)
      ? variants.filter((variant) => variant.decisionFacts.powertrain.fuelType.value === "BEV")
      : variants;
    const value = factExtreme(metricVariants, item.select, "MAX");
    if (value === undefined) return `${scoped} doğrulanmış ${item.label} bilgisi bulunmuyor.`;
    const leaders = metricVariants.filter((variant) => item.select(variant) === value);
    return `${scoped} doğrulanmış en yüksek ${item.label} ${trNumber(value)} ${item.unit}. Bu değere ulaşan exact seçenekler: ${preview(leaders)}.${item.label === "elektrikli menzil" ? " Bu resmî test değeridir; gerçek menzil hava, hız, yük ve iklimlendirmeye göre değişebilir." : ""}`;
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
