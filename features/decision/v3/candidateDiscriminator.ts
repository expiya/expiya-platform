import type { CatalogVariantSnapshot } from "../v2/catalog/types";
import type { PreferenceEvent } from "./types";
import { getV3PersonaTraits } from "./catalogAdapter.server";

export interface V3CandidateDiscriminatorPlan { readonly key: string; readonly text: string }

const personaOptions = [
  { trait: "COMFORT", label: "uzun yol konforu" }, { trait: "PRACTICALITY", label: "günlük pratiklik ve kullanışlılık" },
  { trait: "TECHNOLOGY", label: "teknoloji" }, { trait: "SUSTAINABILITY", label: "elektrikli ve sürdürülebilir karakter" },
  { trait: "DRIVING_ENGAGEMENT", label: "sürüş keyfi" }, { trait: "FAMILY", label: "aile pratikliği" }, { trait: "DESIGN", label: "tasarım karakteri" },
] as const;

export function planV3PersonaDiscriminator(variants: readonly CatalogVariantSnapshot[], askedKeys: readonly string[], ledger: readonly PreferenceEvent[]): V3CandidateDiscriminatorPlan | undefined {
  if (variants.length < 2) return undefined;
  const asked = new Set(askedKeys.flatMap((key) => key.startsWith("personaDiscriminator:") ? key.slice("personaDiscriminator:".length).split("|") : []));
  const activeConcepts = new Set(ledger.filter((item) => item.status === "ACTIVE").map((item) => item.concept));
  const conceptByTrait: Readonly<Record<string, string>> = { COMFORT: "candidateComfortPriority", PRACTICALITY: "candidatePracticalityPriority", TECHNOLOGY: "candidateTechnologyPriority", SUSTAINABILITY: "candidateSustainabilityPriority", DRIVING_ENGAGEMENT: "candidateDrivingPriority", FAMILY: "candidateFamilyPriority", DESIGN: "candidateDesignPriority" };
  const options = personaOptions.flatMap((option) => {
    const count = variants.filter((variant) => getV3PersonaTraits(variant.id).has(option.trait)).length;
    return asked.has(option.trait) || activeConcepts.has(conceptByTrait[option.trait]!) || count === 0 || count === variants.length ? [] : [{ ...option, split: Math.min(count, variants.length - count) }];
  }).sort((a, b) => b.split - a.split).slice(0, 3);
  if (!options.length) return undefined;
  const labels = options.map((item) => item.label);
  const personaRounds = askedKeys.filter((key) => key.startsWith("personaDiscriminator:")).length;
  const lead = personaRounds === 0
    ? "Kalan araçlar kullanım karakteri bakımından ayrışıyor."
    : "Kullanım karakterinde bir başka ayrım daha var.";
  return { key: `personaDiscriminator:${options.map((item) => item.trait).join("|")}`, text: `${lead} Kararında hangisi daha ağır bassın: ${labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} veya ${labels.at(-1)}`}; yoksa bu gruptakilerden hiçbiri belirleyici değil mi?` };
}

const technicalOptions = [
  { code: "COMPACT", label: "şehir içinde daha kısa ve kolay manevra edilen gövde", values: (v: CatalogVariantSnapshot) => v.decisionFacts.dimensions.lengthMm?.value },
  { code: "LUGGAGE", label: "uzun yol için daha büyük bagaj", values: (v: CatalogVariantSnapshot) => v.decisionFacts.dimensions.luggageLitres?.value },
  { code: "POWER", label: "daha yüksek doğrulanmış motor gücü", values: (v: CatalogVariantSnapshot) => v.decisionFacts.powertrain.powerKw.value },
  { code: "PRICE", label: "daha düşük doğrulanmış satın alma fiyatı", values: (v: CatalogVariantSnapshot) => v.activeNewPrice?.consumerVisibility === "PUBLIC" && v.activeNewPrice.realizationSafe ? v.activeNewPrice.amountTry : undefined },
  { code: "RANGE", label: "daha yüksek doğrulanmış elektrikli menzil", values: (v: CatalogVariantSnapshot) => v.decisionFacts.efficiency.electricRangeKm?.value },
  { code: "WIDTH", label: "dar yerlerde daha avantajlı gövde genişliği", values: (v: CatalogVariantSnapshot) => v.decisionFacts.dimensions.widthMm?.value },
  { code: "HEIGHT", label: "daha yüksek gövde", values: (v: CatalogVariantSnapshot) => v.decisionFacts.dimensions.heightMm?.value },
  { code: "WHEELBASE", label: "daha uzun aks mesafesi", values: (v: CatalogVariantSnapshot) => v.decisionFacts.dimensions.wheelbaseMm?.value },
  { code: "TORQUE", label: "daha yüksek tork", values: (v: CatalogVariantSnapshot) => v.decisionFacts.powertrain.torqueNm?.value },
  { code: "PAYLOAD", label: "daha yüksek taşıma kapasitesi", values: (v: CatalogVariantSnapshot) => v.decisionFacts.dimensions.payloadKg?.value },
  { code: "TOWING", label: "daha yüksek frenli römork çekme kapasitesi", values: (v: CatalogVariantSnapshot) => v.decisionFacts.dimensions.brakedTowingKg?.value },
  { code: "CONSUMPTION", label: "daha düşük enerji veya yakıt tüketimi", values: (v: CatalogVariantSnapshot) => v.decisionFacts.efficiency.combinedKwhPer100Km?.value ?? v.decisionFacts.efficiency.combinedLitresPer100Km?.value },
  { code: "BATTERY", label: "daha yüksek kullanılabilir batarya kapasitesi", values: (v: CatalogVariantSnapshot) => v.decisionFacts.efficiency.batteryUsableKwh?.value ?? v.decisionFacts.efficiency.batteryCapacityKwh?.value },
  { code: "CHARGING", label: "daha yüksek azami DC şarj gücü", values: (v: CatalogVariantSnapshot) => v.decisionFacts.efficiency.maxDcChargeKw?.value },
] as const;

const trNumber = (value: number, maximumFractionDigits = 1) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits }).format(value);

function technicalReference(code: string, values: readonly number[], total: number, variants: readonly CatalogVariantSnapshot[]): string {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const coverage = `${values.length}/${total} varyantta veri`;
  const range = (convert: (value: number) => number, unit: string, digits = 1) => `${trNumber(convert(minimum), digits)}–${trNumber(convert(maximum), digits)} ${unit}`;
  const valueRange = code === "PRICE"
    ? range((value) => value / 1_000_000, "milyon TL")
    : code === "RANGE" ? range((value) => value, "km", 0)
      : code === "COMPACT" ? range((value) => value / 1_000, "m")
        : ["WIDTH", "HEIGHT", "WHEELBASE"].includes(code) ? range((value) => value / 10, "cm", 0)
          : code === "LUGGAGE" ? range((value) => value, "litre", 0)
            : code === "POWER" || code === "CHARGING" ? range((value) => value, "kW", 0)
              : code === "TORQUE" ? range((value) => value, "Nm", 0)
                : code === "PAYLOAD" || code === "TOWING" ? range((value) => value, "kg", 0)
                  : code === "BATTERY" ? range((value) => value, "kWh")
                    : code === "CONSUMPTION"
                      ? range((value) => value, variants.some((variant) => variant.decisionFacts.efficiency.combinedKwhPer100Km) ? "kWh/100 km" : "L/100 km")
                      : range((value) => value, "");
  const title: Readonly<Record<string, string>> = {
    COMPACT: "Gövde uzunluğu", LUGGAGE: "Bagaj hacmi", POWER: "Motor gücü", PRICE: "Doğrulanmış satış fiyatı", RANGE: "Elektrikli menzil", WIDTH: "Gövde genişliği", HEIGHT: "Gövde yüksekliği", WHEELBASE: "Aks mesafesi", TORQUE: "Tork", PAYLOAD: "Taşıma kapasitesi", TOWING: "Frenli römork kapasitesi", CONSUMPTION: "Karma tüketim", BATTERY: "Batarya kapasitesi", CHARGING: "Azami DC şarj gücü",
  };
  return `${title[code] ?? code}: ${valueRange} (${coverage})`;
}

export function planV3TechnicalDiscriminator(variants: readonly CatalogVariantSnapshot[], askedKeys: readonly string[], ledger: readonly PreferenceEvent[]): V3CandidateDiscriminatorPlan | undefined {
  if (variants.length < 2) return undefined;
  const asked = new Set(askedKeys.flatMap((key) => key.startsWith("technicalDiscriminator:") ? key.slice("technicalDiscriminator:".length).split("|") : []));
  const activeConcepts = new Set(ledger.filter((item) => item.status === "ACTIVE").map((item) => item.concept));
  const conceptByCode: Readonly<Record<string, string>> = { COMPACT: "candidateCompactPriority", LUGGAGE: "candidateLuggagePriority", POWER: "candidatePowerPriority", PRICE: "candidatePricePriority", RANGE: "candidateRangePriority", WIDTH: "candidateWidthPriority", HEIGHT: "candidateHeightPriority", WHEELBASE: "candidateWheelbasePriority", TORQUE: "candidateTorquePriority", PAYLOAD: "candidatePayloadPriority", TOWING: "candidateTowingPriority", CONSUMPTION: "candidateConsumptionPriority", BATTERY: "candidateBatteryPriority", CHARGING: "candidateChargingPriority" };
  const options = technicalOptions.flatMap((option) => {
    if (asked.has(option.code) || activeConcepts.has(conceptByCode[option.code]!)) return [];
    if (option.code === "CONSUMPTION") {
      const hasElectricUnit = variants.some((variant) => variant.decisionFacts.efficiency.combinedKwhPer100Km);
      const hasFuelUnit = variants.some((variant) => variant.decisionFacts.efficiency.combinedLitresPer100Km);
      if (hasElectricUnit && hasFuelUnit) return [];
    }
    const values = variants.map(option.values).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return values.length >= 2 && new Set(values).size > 1 ? [{ ...option, valuesInPool: values }] : [];
  }).slice(0, 3);
  if (!options.length) return undefined;
  const labels = options.map((item) => item.label);
  const technicalRounds = askedKeys.filter((key) => key.startsWith("technicalDiscriminator:")).length;
  const lead = technicalRounds === 0
    ? "Şimdi seçenekleri ayıran teknik farklara bakalım. Doğrulama seviyesi tamamlanmamış katalog değerlerini kullanırsak bunu sonuçta ayrıca belirteceğim."
    : "Teknik tarafta geriye kalan farklı bir ölçüt var; doğrulama seviyesi tamamlanmamış değerler sonuçta ayrıca belirtilecek.";
  const references = options.map((item) => technicalReference(item.code, item.valuesInPool, variants.length, variants)).join(" · ");
  return { key: `technicalDiscriminator:${options.map((item) => item.code).join("|")}`, text: `${lead} Kalan seçeneklerde referans aralıkları şöyle: ${references}. “Daha yüksek” veya “daha düşük”, yalnız bu kalan seçeneklerin gösterilen aralığına göredir. Hangisini öne alalım: ${labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} veya ${labels.at(-1)}`}; yoksa bu gruptakilerden hiçbiri belirleyici değil mi?` };
}
