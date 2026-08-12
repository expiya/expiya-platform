import type { RecommendedCar } from "@/types/recommendation";

export interface RecommendationInterpretation {
  readonly verdict: string;
  readonly strengths: readonly string[];
  readonly tradeoffs: readonly string[];
  readonly experienceAnalysis?: {
    readonly summary: string;
    readonly recurringConcerns: readonly string[];
    readonly testDriveChecks: readonly string[];
    readonly evidenceNote: string;
  };
}

const concernChecks: Readonly<Record<string, string>> = {
  "Güç aktarımı": "Kalkışta, düşük hızda ve vites geçişlerinde sarsıntı veya gecikme olup olmadığını deneyin.",
  "Servis frenleri": "Farklı hızlarda fren hissini, pedal titreşimini ve aracın düz hatta kalıp kalmadığını kontrol edin.",
  "Hava yastıkları": "Şasi numarasıyla açık geri çağırma veya servis kampanyası bulunup bulunmadığını sorgulayın.",
  "Elektrik sistemi": "Ekranları, kameraları, sensörleri ve tüm elektrikli donanımları soğuk ilk çalıştırmadan itibaren deneyin.",
  Direksiyon: "Düşük ve yüksek hızda direksiyon hissini; boşluk, ses ve beklenmedik sertleşme açısından kontrol edin.",
  "Ön çarpışma önleme": "Sürücü destek sistemlerinin uyarılarını ve varsa kalibrasyon geçmişini yetkili servisten doğrulayın.",
  "Hız kontrolü": "Hız sabitleme ve sürücü destek işlevlerini güvenli koşullarda deneyin; yazılım güncelleme geçmişini sorun.",
};

function fuelStrength(fuel: string): string {
  if (fuel === "Electric") return "Elektrikli güç sistemi şehir içi kullanımda sessiz ve akıcı bir sürüş sunabilir.";
  if (fuel === "Hybrid") return "Hibrit sistem, sık dur-kalk yapılan kullanımda tüketim avantajı sağlayabilir.";
  if (fuel === "Diesel") return "Dizel motor, düzenli uzun yol ve yüksek kilometre kullanımında avantajlı olabilir.";
  return "Benzinli motor, karma kullanım ve görece basit kullanım alışkanlıkları için tanıdık bir seçenek.";
}

export function interpretRecommendation(
  recommendation: RecommendedCar,
): RecommendationInterpretation {
  const { car, decision, consumerExperience } = recommendation;
  const strengths: string[] = [fuelStrength(car.fuel)];
  const tradeoffs: string[] = [];

  if (car.year >= 2022) strengths.push(`${car.year} model olması yaş kaynaklı belirsizliği görece azaltıyor.`);
  if (car.km < 30_000) strengths.push(`${car.km.toLocaleString("tr-TR")} km, katalogdaki düşük kilometreli seçeneklerden biri olduğunu gösteriyor.`);
  if (car.price < 1_300_000) strengths.push("Katalog içindeki daha erişilebilir fiyat grubunda yer alıyor.");
  if (car.transmission === "Automatic") strengths.push("Otomatik şanzıman yoğun trafik ve şehir içi kullanımda rahatlık sağlayabilir.");

  if (car.year < 2000) tradeoffs.push("Klasik araç yaşı nedeniyle parça, usta erişimi, güvenlik ve günlük kullanım beklentileri ayrıca değerlendirilmelidir.");
  else if (car.year <= 2018) tradeoffs.push("Model yılı nedeniyle bakım geçmişi ve yaşlanan parçalar yeni araçlara göre daha kritik.");
  if (car.km > 120_000) tradeoffs.push(`${car.km.toLocaleString("tr-TR")} km nedeniyle ekspertiz ve belgeli bakım geçmişi kararın merkezinde olmalı.`);
  if (car.price > 1_700_000) tradeoffs.push("Yüksek satın alma bedelinin sigorta, vergi ve değer kaybıyla birlikte düşünülmesi gerekir.");
  if (car.transmission === "Manual") tradeoffs.push("Manuel şanzıman yoğun şehir trafiğinde konfor beklentisine uymayabilir.");
  if (car.fuel === "Electric") tradeoffs.push("Şarj erişimi, evde şarj imkânı ve uzun yol düzeni netleşmeden elektrikli araç kararı tamamlanmamalı.");
  if (tradeoffs.length === 0) tradeoffs.push("Bu katalog verilerinde belirgin bir kırmızı bayrak yok; yine de ekspertiz, bakım geçmişi ve gerçek teklif doğrulanmalı.");

  const verdict = decision.score >= 80
    ? "Katalog verilerine göre güçlü bir aday; son karar kullanımınıza uygunluk ve araç özelindeki kontrollerle verilmelidir."
    : "Bazı güçlü yanları var ancak ödünleri daha belirgin; alternatiflerle karşılaştırmadan karar vermeyin.";

  return {
    verdict,
    strengths,
    tradeoffs,
    experienceAnalysis: consumerExperience
      ? {
          summary: `${consumerExperience.complaintCount} resmî şikâyette tekrar eden konular, bu modelin kesin olarak sorunlu olduğunu göstermez; hangi noktaları özellikle kontrol etmeniz gerektiğini gösteren bir risk sinyalidir.`,
          recurringConcerns: consumerExperience.recurringRiskThemes,
          testDriveChecks: consumerExperience.recurringRiskThemes.map(
            (theme) => concernChecks[theme] ?? `${theme} başlığını ekspertiz ve servis geçmişinde özellikle sorgulayın.`,
          ),
          evidenceNote: `Bu kaynak yalnızca olumsuz bildirimleri içeriyor; olumlu kullanıcı görüşü oranı üretilemez. ${consumerExperience.limitation}`,
        }
      : undefined,
  };
}
