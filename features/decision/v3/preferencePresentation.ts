import type { PreferenceEvent } from "./types";

const PUBLIC_VALUES: Readonly<Record<string, string>> = Object.freeze({
  URBAN_DAILY: "şehir içi günlük kullanım", FAMILY: "aile kullanımı", LONG_DISTANCE: "uzun yol", COMMERCIAL: "ticari kullanım", CORPORATE_TRAVEL: "kurumsal seyahat", PASSENGER_TRANSPORT: "yolcu taşımacılığı", MIXED_ROAD: "karma yol kullanımı",
  HATCHBACK: "kompakt hatchback", SUV: "SUV", SEDAN: "sedan", PICKUP: "pick-up", VAN: "van / panelvan", FLEXIBLE: "gövde tipi esnek",
  BEV: "tam elektrikli", HEV: "hibrit", PHEV: "şarj edilebilir hibrit", MHEV: "hafif hibrit", GASOLINE: "benzinli", DIESEL: "dizel", LPG: "LPG",
  NOT_IMPORTANT: "bu başlık karar için önemli değil", MINIMAL: "başka bir donanım zorunlu değil", ADVISOR_GUIDANCE: "yakıt türü filtrelenmeden danışman değerlendirmesi", AUTOMATIC: "otomatik", MANUAL: "manuel",
  REAR_VIEW_CAMERA: "geri görüş kamerası", SURROUND_VIEW_CAMERA_360: "360° çevre görüş kamerası", PARKING_SENSORS: "park sensörleri", REAR_PARKING_SENSORS: "arka park sensörleri", AUTOMATIC_PARK_ASSIST: "otomatik park desteği", ADAPTIVE_CRUISE_CONTROL: "adaptif hız sabitleyici", BLIND_SPOT_MONITOR: "kör nokta izleme", TRAFFIC_SIGN_RECOGNITION: "trafik işareti tanıma", ISOFIX_REAR_OUTER: "arka dış koltuklarda ISOFIX", KEYLESS_START: "anahtarsız çalıştırma",
  PRACTICALITY: "aile ve yükleme pratikliği", COMFORT: "uzun yol konforu", VALUE: "fiyat ve kullanım gideri dengesi", PERFORMANCE: "performans", ERGONOMIC_COMFORT: "ergonomi ve konfor", CARGO_PRACTICALITY: "bagaj ve yükleme pratikliği", TOWING: "çekme uygunluğu", CABIN_COMFORT: "kabin ve uzun yol konforu", DRIVER_CONFIDENCE: "görüş kolaylığı ve sürücü destekleri", DRIVING_ENJOYMENT: "sürüş keyfi", SAFETY_CONFIDENCE: "doğrulanabilir güvenlik ve sürücü destekleri", COCKPIT_AMBIENCE: "dijital kokpit ve ambiyans", DISTINCTIVE_DESIGN: "dikkat çekici ve karakterli tasarım", FUEL_ECONOMY: "düşük enerji veya yakıt tüketimi", REAR_SEAT_SPACE: "arka koltuk alanı", ROOF_LOAD: "tavan taşıma uyumluluğu", PREMIUM_AUDIO: "gelişmiş ses sistemi", E_SEGMENT: "E-segment", SHARED_DRIVER_EASE: "ortak kullanım kolaylığı", TOTAL_COST: "toplam sahip olma maliyeti",
  HEATED_FRONT_SEATS: "ısıtmalı ön koltuklar", HEATED_REAR_SEATS: "ısıtmalı arka koltuklar", PANORAMIC_GLASS_ROOF: "panoramik cam tavan", POWER_SLIDING_SIDE_DOOR: "elektrikli sürgülü yan kapı",
});

const PUBLIC_LABELS: Readonly<Record<string, string>> = Object.freeze({
  primaryUsage: "Ana kullanım", bodyStyle: "Gövde tercihi", bodyNotImportant: "Gövde yaklaşımı", fuelType: "Yakıt tercihi", transmission: "Şanzıman tercihi", minimumSeats: "Kullanım kapasitesi", equipmentNotImportant: "Ek donanım şartı", budgetMax: "Kesin bütçe üst sınırı", budgetTarget: "Hedef bütçe", budgetNotImportant: "Bütçe yaklaşımı", budgetUnspecified: "Bütçe yaklaşımı", brandPreference: "Marka tercihi", modelPreference: "Model tercihi", equipmentFeature: "Donanım ihtiyacı", distinctiveDesign: "Tasarım önceliği", advisorGuidance: "Seçim yaklaşımı", fuelDelegated: "Yakıt seçimi", totalCostPriority: "Maliyet önceliği", operatingCostPriority: "Kullanım maliyeti önceliği", cargoPracticality: "Bagaj ve yükleme önceliği", ergonomicComfort: "Ergonomi ve konfor önceliği", rearSeatSpace: "Arka koltuk alanı önceliği", firstTimeDriverContext: "İlk araç kullanım bağlamı", familyPracticality: "Aile pratikliği önceliği", longDistanceComfort: "Uzun yol konforu önceliği", valueEconomy: "Değer dengesi önceliği", performance: "Performans önceliği", towingNeed: "Çekme ihtiyacı", cabinComfort: "Kabin konforu önceliği", driverConfidence: "Sürücü güveni önceliği", drivingEnjoyment: "Sürüş keyfi önceliği", safetyConfidence: "Güvenlik ve sürücü desteği önceliği", glassRoofPreference: "Cam tavan tercihi", cockpitAmbience: "Kokpit ve ambiyans önceliği", fuelEconomy: "Tüketim önceliği", highRideHeight: "Yüksek sürüş tercihi", roofLoadLifestyle: "Tavan taşıma ihtiyacı", premiumAudio: "Ses sistemi tercihi", marketSegment: "Araç segmenti", sharedDriverEase: "Ortak kullanım kolaylığı",
});

const internalCode = /^[A-Z][A-Z0-9_]+$/u;
export const publicPreferenceValue = (value: string | number | readonly string[]): string => {
  if (typeof value === "number") return value.toLocaleString("tr-TR");
  if (typeof value === "string") return PUBLIC_VALUES[value] ?? (internalCode.test(value) ? "onaylandı" : value);
  return value.map((item) => publicPreferenceValue(item)).join(", ");
};

export function publicPreferenceSummary(event: PreferenceEvent): string {
  if (event.concept === "minimumSeats" && typeof event.normalizedValue === "number") return `Kullanım kapasitesi: en az ${event.normalizedValue} kişi`;
  return `${PUBLIC_LABELS[event.concept] ?? "Onaylı tercih"}: ${publicPreferenceValue(event.normalizedValue)}`;
}

export const humanizePreferenceText = (text: string): string => Object.entries(PUBLIC_VALUES).reduce((result, [code, label]) => result.replaceAll(code, label), text).replace(/\b[A-Z][A-Z0-9_]{2,}\b/gu, "onaylı tercih");
