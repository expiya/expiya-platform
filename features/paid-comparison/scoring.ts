import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import type { ApprovedDecisionNeed } from "@/features/sales-advisor/types";

type Dimension = { readonly concept: string; readonly label: string; readonly scores: readonly [number, number, number] };
const normalized = (value: unknown) => String(value ?? "").trim().toLocaleUpperCase("tr-TR").replace(/[İI]/gu, "I");
const transmissionClass = (value: string) => /OTOMATIK|AUTOMATIC|DCT|CVT|DSG|EDC|EAT/iu.test(normalized(value)) ? "AUTOMATIC" : /MANUEL|MANUAL/iu.test(normalized(value)) ? "MANUAL" : normalized(value);
const bodyClass = (value: string) => normalized(value).replace(/[- /]/gu, "_");
const equal = (actual: string, expected: unknown) => normalized(actual) === normalized(expected) ? 100 : 0;

function dimension(need: ApprovedDecisionNeed, variants: readonly [CatalogVariantSnapshot, CatalogVariantSnapshot, CatalogVariantSnapshot]): Dimension | undefined {
  if (need.value === undefined || Array.isArray(need.value)) return undefined;
  if (need.concept === "budgetMax" && typeof need.value === "number" && variants.every((item) => item.activeNewPrice)) {
    return { concept: need.concept, label: need.summary, scores: variants.map((item) => item.activeNewPrice!.amountTry <= Number(need.value) ? 100 : 0) as [number, number, number] };
  }
  if (need.concept === "budgetTarget" && typeof need.value === "number" && need.value > 0 && variants.every((item) => item.activeNewPrice)) {
    return { concept: need.concept, label: need.summary, scores: variants.map((item) => Math.round(Math.max(0, 100 - Math.abs(item.activeNewPrice!.amountTry - Number(need.value)) / Number(need.value) * 100))) as [number, number, number] };
  }
  if (need.concept === "fuelType" && typeof need.value === "string") return { concept: need.concept, label: need.summary, scores: variants.map((item) => equal(item.decisionFacts.powertrain.fuelType.value, need.value)) as [number, number, number] };
  if (need.concept === "bodyStyle" && typeof need.value === "string") return { concept: need.concept, label: need.summary, scores: variants.map((item) => bodyClass(item.decisionFacts.bodyStyle.value) === bodyClass(String(need.value)) ? 100 : 0) as [number, number, number] };
  if (need.concept === "transmission" && typeof need.value === "string") return { concept: need.concept, label: need.summary, scores: variants.map((item) => transmissionClass(item.decisionFacts.powertrain.transmission.value) === transmissionClass(String(need.value)) ? 100 : 0) as [number, number, number] };
  if (need.concept === "minimumSeats" && typeof need.value === "number" && variants.every((item) => item.decisionFacts.dimensions.seats)) return { concept: need.concept, label: need.summary, scores: variants.map((item) => item.decisionFacts.dimensions.seats!.value >= Number(need.value) ? 100 : 0) as [number, number, number] };
  return undefined;
}

export function scorePaidComparison(input: { readonly approvedNeeds: readonly ApprovedDecisionNeed[]; readonly variants: readonly [CatalogVariantSnapshot, CatalogVariantSnapshot, CatalogVariantSnapshot] }) {
  const dimensions = input.approvedNeeds.map((need) => dimension(need, input.variants)).filter((item): item is Dimension => Boolean(item));
  const evaluatedConcepts = new Set(dimensions.map((item) => item.concept));
  const scores = input.variants.map((variant, index) => ({
    exactVariantId: variant.id,
    score: dimensions.length ? Math.round(dimensions.reduce((total, item) => total + item.scores[index], 0) / dimensions.length) : null,
    evaluatedNeedCount: dimensions.length,
    totalApprovedNeedCount: input.approvedNeeds.length,
    breakdown: dimensions.map((item) => ({ concept: item.concept, label: item.label, score: item.scores[index] })),
  }));
  const numeric = scores.filter((item): item is typeof item & { score: number } => item.score !== null);
  const best = numeric.length ? Math.max(...numeric.map((item) => item.score)) : undefined;
  const leaders = best === undefined ? [] : numeric.filter((item) => item.score === best).map((item) => item.exactVariantId);
  const decisionLeads = leaders.includes(input.variants[0].id);
  const conclusion = best === undefined
    ? "Onaylanan ihtiyaçların hiçbiri mevcut ortak katalog alanlarıyla güvenilir biçimde puanlanamadı; sayısal bir kazanan üretilmedi."
    : decisionLeads && leaders.length === 1
      ? "Karar kartındaki araç, ölçülebilen onaylı ihtiyaçlarda tek başına en yüksek uyumu gösteriyor."
      : decisionLeads
        ? "Karar kartındaki araç, ölçülebilen onaylı ihtiyaçlarda en yüksek puanı alternatiflerden en az biriyle paylaşıyor."
        : "Ölçülebilen onaylı ihtiyaçlarda bir alternatif daha yüksek puan aldı; bu sonuç yalnız aşağıdaki puanlanan başlıklarla sınırlıdır.";
  const conditions: { exactVariantId: string; text: string }[] = [];
  const prices = input.variants.map((item) => item.activeNewPrice?.amountTry);
  if (prices.every((value): value is number => typeof value === "number")) conditions.push({ exactVariantId: input.variants[prices.indexOf(Math.min(...prices))].id, text: "Doğrulanmış liste fiyatını en düşük tutmak öncelikliyse öne çıkar." });
  const luggage = input.variants.map((item) => item.decisionFacts.dimensions.luggageLitres?.value);
  if (luggage.every((value): value is number => typeof value === "number")) conditions.push({ exactVariantId: input.variants[luggage.indexOf(Math.max(...luggage))].id, text: "Doğrulanmış bagaj hacmini büyütmek öncelikliyse öne çıkar." });
  return {
    methodologyVersion: "paid-comparison-scoring/v1" as const,
    weighting: "EQUAL_ACROSS_MEASURABLE_APPROVED_NEEDS" as const,
    scores,
    unscoredNeeds: input.approvedNeeds.filter((need) => !evaluatedConcepts.has(need.concept)).map((need) => ({ concept: need.concept, summary: need.summary, reason: "COMMON_VERIFIED_FACT_UNAVAILABLE_OR_UNSUPPORTED" as const })),
    leaders,
    conclusion,
    conditions,
  };
}
