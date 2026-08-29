import type { PaidComparisonReportViewModel } from "@/app/cars/paid-comparison/report/PaidReportView";

const source = ["https://www.expiya.com"];
const fact = (value: string | number | null) => ({ value, confidence: value === null ? null : "HIGH" as const, sources: value === null ? [] : source, missing: value === null });
const vehicle = (input: { id: string; role: string; model: string; trim: string; price: number; fuel: string; power: number; torque: number | null; luggage: number; consumption: number }) => ({
  exactVariantId: input.id, role: input.role,
  identity: { brand: "Örnek", model: input.model, trim: input.trim, sources: source },
  price: { value: input.price, validFrom: "2026-08-01", confidence: "HIGH", sources: source, missing: false },
  facts: { bodyStyle: fact("SUV"), modelYear: fact(2026), fuelType: fact(input.fuel), powerKw: fact(input.power), torqueNm: fact(input.torque), transmission: fact("Otomatik"), luggageLitres: fact(input.luggage), combinedLitresPer100Km: fact(input.consumption), combinedKwhPer100Km: fact(null), electricRangeKm: fact(null), maxDcChargeKw: fact(null) },
});

export const paidComparisonSampleReport: PaidComparisonReportViewModel = {
  schemaVersion: "paid-comparison-report/v1", generatedAt: "2026-08-29T10:00:00.000Z", catalogReleaseVersion: "ÖRNEK-ŞABLON",
  needsSummary: [{ concept: "budgetMax", summary: "Kesin bütçe üst sınırı: 2.000.000 TL" }, { concept: "primaryUsage", summary: "Ana kullanım: şehir içi ve hafta sonu aile kullanımı" }, { concept: "minimumSeats", summary: "Kullanım kapasitesi: en az 5 kişi" }],
  assessment: {
    methodologyVersion: "paid-comparison-scoring/v1", weighting: "EQUAL_ACROSS_MEASURABLE_APPROVED_NEEDS",
    scores: [
      { exactVariantId: "sample-decision", score: 100, evaluatedNeedCount: 2, totalApprovedNeedCount: 3, breakdown: [{ concept: "budgetMax", label: "Kesin bütçe üst sınırı", score: 100 }, { concept: "minimumSeats", label: "En az 5 kişi", score: 100 }] },
      { exactVariantId: "sample-one", score: 100, evaluatedNeedCount: 2, totalApprovedNeedCount: 3, breakdown: [{ concept: "budgetMax", label: "Kesin bütçe üst sınırı", score: 100 }, { concept: "minimumSeats", label: "En az 5 kişi", score: 100 }] },
      { exactVariantId: "sample-two", score: 50, evaluatedNeedCount: 2, totalApprovedNeedCount: 3, breakdown: [{ concept: "budgetMax", label: "Kesin bütçe üst sınırı", score: 0 }, { concept: "minimumSeats", label: "En az 5 kişi", score: 100 }] },
    ],
    unscoredNeeds: [{ concept: "primaryUsage", summary: "Ana kullanım: şehir içi ve hafta sonu aile kullanımı", reason: "COMMON_VERIFIED_FACT_UNAVAILABLE_OR_UNSUPPORTED" }],
    leaders: ["sample-decision", "sample-one"], conclusion: "Karar kartındaki araç, ölçülebilen onaylı ihtiyaçlarda en yüksek puanı bir alternatifle paylaşıyor.",
    conditions: [{ exactVariantId: "sample-one", text: "Doğrulanmış liste fiyatını en düşük tutmak öncelikliyse öne çıkar." }, { exactVariantId: "sample-two", text: "Doğrulanmış bagaj hacmini büyütmek öncelikliyse öne çıkar." }],
  },
  vehicles: [
    vehicle({ id: "sample-decision", role: "DECISION_CARD", model: "Atlas", trim: "Comfort", price: 1_950_000, fuel: "HEV", power: 110, torque: 250, luggage: 450, consumption: 5.2 }),
    vehicle({ id: "sample-one", role: "ALTERNATIVE_1", model: "Nova", trim: "Premium", price: 1_890_000, fuel: "GASOLINE", power: 115, torque: 240, luggage: 420, consumption: 6.4 }),
    vehicle({ id: "sample-two", role: "ALTERNATIVE_2", model: "Terra", trim: "Plus", price: 2_050_000, fuel: "DIESEL", power: 105, torque: null, luggage: 510, consumption: 5.8 }),
  ],
};
