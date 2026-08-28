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
  return { key: `personaDiscriminator:${options.map((item) => item.trait).join("|")}`, text: `Kalan araçlar karakter olarak ayrışıyor. Kararında hangisi daha ağır bassın: ${labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} veya ${labels.at(-1)}`}; yoksa bu gruptakilerden hiçbiri belirleyici değil mi?` };
}

const technicalOptions = [
  { code: "COMPACT", label: "şehir içinde daha kısa ve kolay manevra edilen gövde", values: (v: CatalogVariantSnapshot) => v.decisionFacts.dimensions.lengthMm?.value },
  { code: "LUGGAGE", label: "uzun yol için daha büyük bagaj", values: (v: CatalogVariantSnapshot) => v.decisionFacts.dimensions.luggageLitres?.value },
  { code: "POWER", label: "daha yüksek doğrulanmış motor gücü", values: (v: CatalogVariantSnapshot) => v.decisionFacts.powertrain.powerKw.value },
  { code: "PRICE", label: "daha düşük doğrulanmış satın alma fiyatı", values: (v: CatalogVariantSnapshot) => v.activeNewPrice?.consumerVisibility === "PUBLIC" && v.activeNewPrice.realizationSafe ? v.activeNewPrice.amountTry : undefined },
  { code: "RANGE", label: "daha yüksek doğrulanmış elektrikli menzil", values: (v: CatalogVariantSnapshot) => v.decisionFacts.efficiency.electricRangeKm?.value },
] as const;

export function planV3TechnicalDiscriminator(variants: readonly CatalogVariantSnapshot[], askedKeys: readonly string[], ledger: readonly PreferenceEvent[]): V3CandidateDiscriminatorPlan | undefined {
  if (variants.length < 2) return undefined;
  const asked = new Set(askedKeys.flatMap((key) => key.startsWith("technicalDiscriminator:") ? key.slice("technicalDiscriminator:".length).split("|") : []));
  const activeConcepts = new Set(ledger.filter((item) => item.status === "ACTIVE").map((item) => item.concept));
  const conceptByCode: Readonly<Record<string, string>> = { COMPACT: "candidateCompactPriority", LUGGAGE: "candidateLuggagePriority", POWER: "candidatePowerPriority", PRICE: "candidatePricePriority", RANGE: "candidateRangePriority" };
  const options = technicalOptions.filter((option) => {
    if (asked.has(option.code) || activeConcepts.has(conceptByCode[option.code]!)) return false;
    const values = variants.map(option.values).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return values.length >= 2 && new Set(values).size > 1;
  }).slice(0, 3);
  if (!options.length) return undefined;
  const labels = options.map((item) => item.label);
  return { key: `technicalDiscriminator:${options.map((item) => item.code).join("|")}`, text: `Kalan seçenekleri doğrulanmış teknik veriler ayırıyor. Hangisini öne alalım: ${labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} veya ${labels.at(-1)}`}; yoksa bu gruptakilerden hiçbiri belirleyici değil mi?` };
}
