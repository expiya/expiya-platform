import type { PaidComparisonReportViewModel } from "@/app/cars/paid-comparison/report/PaidReportView";

const catalogSource = ["https://www.expiya.com"];
const fact = (value: string | number) => ({ value, confidence: "HIGH" as const, sources: catalogSource, missing: false });
const common = {
  bodyStyle: fact("Hatchback"), modelYear: fact(2026), fuelType: fact("Benzin"), powerKw: fact(66), torqueNm: fact(172), engineDisplacementCc: fact(998), drivenWheels: fact("Önden çekiş"), combinedLitresPer100Km: fact(6.3), seats: fact(5), luggageLitres: fact(352), cargoVolumeLitres: fact(1165), lengthMm: fact(4065), widthMm: fact(1775), heightMm: fact(1450), wheelbaseMm: fact(2580), brakedTowingKg: fact(1000),
  climateControl: fact("Otomatik klima"), parkingSensors: fact("Arka"), keylessEntry: fact("Var"), cruiseControl: fact("Var"), electricMirrors: fact("Isıtmalı ve elektrikli"), rainLightSensor: fact("Var"), seatAdjustment: fact("Manuel, yükseklik ayarlı"), heatedSeats: fact("Yok"),
  displaySize: fact("10,25 inç"), digitalCluster: fact("Dijital"), appleCarPlay: fact("Var"), androidAuto: fact("Var"), bluetooth: fact("Var"), wirelessCharging: fact("Var"), usbPorts: fact("Ön ve arka"), navigation: fact("Var"),
  headlightTechnology: fact("LED"), daytimeRunningLights: fact("LED"), automaticHighBeam: fact("Var"), wheelSize: fact("16 inç"), tyreSize: fact("195/55 R16"), spareWheelKit: fact("Lastik tamir kiti"), sunroof: fact("Yok"), standardColours: fact("Beyaz, gri, siyah, kırmızı"),
  warranty: fact("5 yıl / 100.000 km"), roadsideAssistance: fact("5 yıl"), serviceInterval: fact("15.000 km / 1 yıl"), serviceNetwork: fact("Yaygın yetkili servis göstergesi"), maintenanceCost: fact("Temsili: yıllık 18.500 TL"), mtvIndicator: fact("Temsili: yıllık 7.200 TL"), insuranceIndicator: fact("Temsili yıllık aralık: 26.000-42.000 TL"), threeYearCost: fact("Temsili: 310.000 TL + değer kaybı"),
  turkeyOwnersManual: fact("Var"), technicalDataSheet: fact("Var"), officialPriceList: fact("Var"), equipmentList: fact("Var"), warrantyDocument: fact("Var"), colourCatalogue: fact("Var"), exactVariantMedia: fact("Temsili görsel kullanıldı"), evidenceDepth: fact("Örnek rapor - sentetik tamamlayıcı katman"), combinedKwhPer100Km: fact("Uygulanamaz"), electricRangeKm: fact("Uygulanamaz"), maxDcChargeKw: fact("Uygulanamaz"),
};

function vehicle(input: { id: string; model: "A" | "B" | "C"; role: string; price: number; transmission: string; trim: string; imageUrl: string; extras?: Record<string, ReturnType<typeof fact>> }) {
  return { exactVariantId: input.id, role: input.role, identity: { brand: "Araç", model: input.model, trim: input.trim, sources: catalogSource }, price: { value: input.price, validFrom: "2026-08-16", confidence: "HIGH", sources: catalogSource, missing: false }, facts: { ...common, transmission: fact(input.transmission), ...input.extras }, imageUrl: input.imageUrl, imageStatus: "REPRESENTATIVE", safetyFeatures: ["ABS", "EBD", "ESP", "FCA", "LKA", "LFA", "TPMS", "Arka görüş kamerası", "Ön, yan ve perde hava yastıkları"].map(fact) };
}

export const paidComparisonSampleReport: PaidComparisonReportViewModel = {
  schemaVersion: "paid-comparison-report/v1", generatedAt: "2026-08-30T10:00:00.000Z", catalogReleaseVersion: "0.55.4 · ANONİM ÖRNEK",
  needsSummary: [{ concept: "budgetMax", summary: "Kesin bütçe üst sınırı: 1.850.000 TL" }, { concept: "primaryUsage", summary: "Ana kullanım: şehir içi ve hafta sonu aile kullanımı" }, { concept: "transmission", summary: "Öncelik: otomatik şanzıman" }, { concept: "minimumSeats", summary: "Kullanım kapasitesi: en az 5 kişi" }],
  assessment: { methodologyVersion: "paid-comparison-scoring/v1", weighting: "EQUAL_ACROSS_MEASURABLE_APPROVED_NEEDS", scores: [
    { exactVariantId: "sample-a", score: 92, evaluatedNeedCount: 4, totalApprovedNeedCount: 4, breakdown: [{ concept: "budgetMax", label: "Bütçe", score: 100 }, { concept: "transmission", label: "Otomatik şanzıman", score: 100 }] },
    { exactVariantId: "sample-b", score: 76, evaluatedNeedCount: 4, totalApprovedNeedCount: 4, breakdown: [{ concept: "budgetMax", label: "Bütçe", score: 100 }, { concept: "transmission", label: "Otomatik şanzıman", score: 40 }] },
    { exactVariantId: "sample-c", score: 84, evaluatedNeedCount: 4, totalApprovedNeedCount: 4, breakdown: [{ concept: "budgetMax", label: "Bütçe", score: 80 }, { concept: "transmission", label: "Otomatik şanzıman", score: 100 }] },
  ], unscoredNeeds: [], leaders: ["sample-a"], conclusion: "Araç A, otomatik kullanım rahatlığı ile bütçe dengesinde en güçlü örnek sonucu veriyor.", conditions: [{ exactVariantId: "sample-b", text: "En düşük başlangıç fiyatı öncelikliyse öne çıkar." }, { exactVariantId: "sample-c", text: "Daha zengin konfor donanımı öncelikliyse öne çıkar." }] },
  vehicles: [
    vehicle({ id: "sample-a", role: "DECISION_CARD", model: "A", trim: "Otomatik · Orta donanım", price: 1_674_000, transmission: "7 ileri çift kavramalı otomatik", imageUrl: "/cars/expiya-hero-highway-mixed-fleet.png" }),
    vehicle({ id: "sample-b", role: "ALTERNATIVE_1", model: "B", trim: "Manuel · Başlangıç donanımı", price: 1_500_000, transmission: "6 ileri manuel", imageUrl: "/cars/expiya-hero-highway-mixed-fleet.png", extras: { wirelessCharging: fact("Yok"), navigation: fact("Telefon yansıtma üzerinden") } }),
    vehicle({ id: "sample-c", role: "ALTERNATIVE_2", model: "C", trim: "Otomatik · Üst donanım", price: 1_829_610, transmission: "7 ileri çift kavramalı otomatik", imageUrl: "/cars/expiya-hero-highway-mixed-fleet.png", extras: { climateControl: fact("Çift bölgeli otomatik"), parkingSensors: fact("Ön ve arka"), heatedSeats: fact("Var"), wheelSize: fact("17 inç") } }),
  ],
};
