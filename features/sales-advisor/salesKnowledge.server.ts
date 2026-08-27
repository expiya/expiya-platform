import type { PublicVariantFact } from "./types";

type KnowledgeEntry = {
  readonly exactVariantId: string;
  readonly facts: readonly PublicVariantFact[];
};

/**
 * Reviewed sales facts which are useful to the advisor but are deliberately
 * outside the Phase 1 decision schema. A non-TR or non-exact source can only
 * produce a visibly scoped fact; it can never become an exact ownership claim.
 */
const reviewedKnowledge: readonly KnowledgeEntry[] = [{
  exactVariantId: "08030664-0509-51a0-ac5e-283bde7843f3",
  facts: [
    {
      key: "emptyMass", label: "Boş kütle", value: "1.354 kg", disposition: "FAMILY_LEVEL",
      dailyMeaning: "Yedi koltuklu Eco-G 120 EDC için yayımlanan değerdir; Türkiye tescil belgesindeki exact değer donanıma göre farklılaşabilir.",
      scopeNote: "Dacia Hollanda · 7 koltuklu Eco-G 120 EDC · Türkiye exact varyant doğrulaması bekleniyor",
      source: { label: "Dacia Jogger 2026 resmî teknik ve fiyat listesi", url: "https://cdn.group.renault.com/dac/nl/brochures-en-prijslijsten/prijslijst/prijslijst-jogger.pdf.asset.pdf/19c1db8138.pdf", accessedAt: "2026-08-27" },
    },
    {
      key: "runningOrderMass", label: "Yürür vaziyette kütle", value: "1.484 kg", disposition: "FAMILY_LEVEL",
      scopeNote: "Dacia Hollanda · 7 koltuklu Eco-G 120 EDC · Türkiye exact varyant doğrulaması bekleniyor",
      source: { label: "Dacia Jogger 2026 resmî teknik ve fiyat listesi", url: "https://cdn.group.renault.com/dac/nl/brochures-en-prijslijsten/prijslijst/prijslijst-jogger.pdf.asset.pdf/19c1db8138.pdf", accessedAt: "2026-08-27" },
    },
    {
      key: "maximumPermissibleMass", label: "Azami yüklü kütle", value: "1.960 kg", disposition: "FAMILY_LEVEL",
      scopeNote: "Dacia Hollanda · 7 koltuklu Eco-G 120 EDC · Türkiye exact varyant doğrulaması bekleniyor",
      source: { label: "Dacia Jogger 2026 resmî teknik ve fiyat listesi", url: "https://cdn.group.renault.com/dac/nl/brochures-en-prijslijsten/prijslijst/prijslijst-jogger.pdf.asset.pdf/19c1db8138.pdf", accessedAt: "2026-08-27" },
    },
    {
      key: "officialCombinedRange", label: "Toplam sürüş menzili", value: "1.400 km’ye kadar", disposition: "FAMILY_LEVEL",
      dailyMeaning: "Benzin ve LPG depolarının birlikte sunduğu üretici beyanıdır; gerçek menzil yük, hava ve sürüşe göre değişir.",
      scopeNote: "Dacia Türkiye · Jogger Eco-G 120 motor ailesi",
      source: { label: "Dacia Türkiye Jogger motor seçenekleri", url: "https://www.dacia.com.tr/modeller/yeni-jogger/motorlar-performans.html", accessedAt: "2026-08-27" },
    },
    {
      key: "modularRoofBars", label: "Modüler tavan barları", value: "Mevcut", disposition: "FAMILY_LEVEL",
      dailyMeaning: "Tavan barları taşıma ihtiyacına göre enine konuma çevrilebilir; kullanılacak taşıyıcının araç ve yükle uyumluluğu ayrıca doğrulanmalıdır.",
      scopeNote: "Dacia Türkiye · Jogger model ailesi ve Extreme donanım kapsamı · sipariş öncesi exact araç teyidi gerekir",
      source: { label: "Dacia Türkiye Jogger model sayfası", url: "https://www.dacia.com.tr/modeller/yeni-jogger.html", accessedAt: "2026-08-27" },
    },
    {
      key: "dynamicRoofLoad", label: "Azami dinamik tavan yükü", value: "80 kg", disposition: "FAMILY_LEVEL",
      dailyMeaning: "Bu sınır bar, taşıyıcı ve yükün toplamı için değerlendirilmelidir; Türkiye ruhsatı ve kullanım kılavuzu önceliklidir.",
      scopeNote: "Dacia 2026 Jogger model ailesi · Hollanda pazar teknik listesi · Türkiye exact varyant doğrulaması bekleniyor",
      source: { label: "Dacia Jogger 2026 resmî teknik ve fiyat listesi", url: "https://cdn.group.renault.com/dac/nl/brochures-en-prijslijsten/prijslijst/prijslijst-jogger.pdf.asset.pdf/19c1db8138.pdf", accessedAt: "2026-08-27" },
    },
  ],
}];

export function getReviewedSalesFacts(exactVariantId: string): readonly PublicVariantFact[] {
  return reviewedKnowledge.find((entry) => entry.exactVariantId === exactVariantId)?.facts ?? [];
}

const joggerColors = [
  ["Beyaz", "#F2F1EC"], ["Mineral Gri", "#7A7C7D"], ["Kum Beji", "#B7A58C"], ["Sedir Yeşili", "#566155"],
  ["Terracotta Kahve", "#8A4F3D"], ["Duman Gri", "#44484A"], ["Siyah", "#151515"],
] as const;

export function getReviewedSalesColors(identity: { readonly brand: string; readonly model: string; readonly modelYear: number }): readonly PublicVariantFact[] {
  if (identity.brand !== "Dacia" || identity.model !== "Jogger" || identity.modelYear !== 2026) return [];
  return joggerColors.map(([value, swatchHex]) => ({
    key: `exteriorColor:${value.toLocaleLowerCase("tr-TR").replaceAll(" ", "-")}`,
    label: "Dış renk", value, disposition: "FAMILY_LEVEL",
    scopeNote: "Dacia Türkiye · 2026 Jogger model ailesi · seçilen exact varyant ve stok için sipariş öncesi teyit gerekir",
    source: { label: "Dacia Türkiye Jogger konfigüratörü", url: "https://www.dacia.com.tr/modeller/yeni-jogger/konfigurator-yeni.html", accessedAt: "2026-08-27" },
    visual: { swatchHex, approximation: true },
  }));
}

export function getReviewedSalesMedia(exactVariantId: string): readonly { url: string; alt: string; disposition: "REPRESENTATIVE"; label: string; attribution: string }[] {
  if (exactVariantId !== "08030664-0509-51a0-ac5e-283bde7843f3") return [];
  return [
    { url: "/cars/dacia-jogger-detail-front.jpg", alt: "Dacia Jogger dış tasarım detayı", disposition: "REPRESENTATIVE", label: "Temsilî dış tasarım", attribution: "Görsel kaynağı: Dacia Türkiye resmî web sitesi" },
    { url: "/cars/dacia-jogger-seven-seat.jpg", alt: "Dacia Jogger yedi koltuklu kabin düzeni", disposition: "REPRESENTATIVE", label: "Temsilî 7 koltuk düzeni", attribution: "Görsel kaynağı: Dacia Türkiye resmî web sitesi" },
    { url: "/cars/dacia-jogger-cargo.jpg", alt: "Dacia Jogger esnek bagaj alanı", disposition: "REPRESENTATIVE", label: "Temsilî bagaj düzeni", attribution: "Görsel kaynağı: Dacia Türkiye resmî web sitesi" },
    { url: "/cars/dacia-jogger-multimedia.png", alt: "Dacia Jogger multimedya ekranı", disposition: "REPRESENTATIVE", label: "Temsilî multimedya", attribution: "Görsel kaynağı: Dacia Türkiye resmî web sitesi" },
  ];
}
