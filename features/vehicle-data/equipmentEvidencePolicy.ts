import type { EquipmentCohortPolicyId, EquipmentDecisionUse, EquipmentFeatureCode, EquipmentFeatureDefinition, EquipmentIntentAlias } from "@/types/equipmentEvidence";
import { EQUIPMENT_FEATURE_CODES } from "@/types/equipmentEvidence";

const hardEligible = new Set<EquipmentFeatureCode>([
  "ISOFIX_REAR_OUTER", "REAR_VIEW_CAMERA", "SURROUND_VIEW_CAMERA_360", "FRONT_PARKING_SENSORS",
  "REAR_PARKING_SENSORS", "POWER_TAILGATE", "LOW_RANGE_TRANSFER_CASE", "LOCKING_REAR_DIFFERENTIAL", "LOCKING_CENTER_DIFFERENTIAL",
]);
const afterConfirmation = new Set<EquipmentFeatureCode>([
  "AUTONOMOUS_EMERGENCY_BRAKING", "FORWARD_COLLISION_WARNING", "LANE_DEPARTURE_WARNING", "LANE_KEEP_ASSIST",
  "LANE_CENTERING_ASSIST", "ADAPTIVE_CRUISE_CONTROL", "BLIND_SPOT_MONITOR", "REAR_CROSS_TRAFFIC_ALERT",
  "TRAFFIC_SIGN_RECOGNITION", "DRIVER_ATTENTION_MONITOR", "HIGH_BEAM_ASSIST", "AUTOMATIC_PARK_ASSIST",
  "HEATED_FRONT_SEATS", "HEATED_REAR_SEATS", "VENTILATED_FRONT_SEATS", "POWER_DRIVER_SEAT",
  "POWER_FRONT_PASSENGER_SEAT", "DRIVER_SEAT_MEMORY", "DUAL_ZONE_CLIMATE_CONTROL", "THREE_ZONE_CLIMATE_CONTROL",
  "FOUR_ZONE_CLIMATE_CONTROL", "APPLE_CARPLAY", "WIRELESS_APPLE_CARPLAY", "ANDROID_AUTO", "WIRELESS_ANDROID_AUTO",
  "KEYLESS_ENTRY", "ADAPTIVE_HEADLIGHTS", "MATRIX_LED_HEADLIGHTS", "TERRAIN_DRIVE_MODES", "CRAWL_CONTROL",
]);
const category = (code: EquipmentFeatureCode): EquipmentFeatureDefinition["category"] => {
  const index = EQUIPMENT_FEATURE_CODES.indexOf(code);
  if (index < 11) return "ADAS"; if (index < 16) return "PARKING"; if (index < 21) return "OCCUPANT_SAFETY";
  if (index < 31) return "CABIN_COMFORT"; if (index < 36) return "ACCESS"; if (index < 41) return "CONNECTIVITY";
  if (index < 45) return "LIGHTING"; return "OFF_ROAD";
};
const decisionUse = (code: EquipmentFeatureCode): EquipmentDecisionUse => hardEligible.has(code) ? "HARD_FILTER_ELIGIBLE"
  : afterConfirmation.has(code) ? "HARD_FILTER_AFTER_CONFIRMATION" : "SOFT_PREFERENCE";
const trLabels: Record<EquipmentFeatureCode, string> = {
  AUTONOMOUS_EMERGENCY_BRAKING:"Otonom acil fren",FORWARD_COLLISION_WARNING:"Ön çarpışma uyarısı",LANE_DEPARTURE_WARNING:"Şerit terk uyarısı",LANE_KEEP_ASSIST:"Şeritte tutma desteği",LANE_CENTERING_ASSIST:"Şerit ortalama desteği",ADAPTIVE_CRUISE_CONTROL:"Adaptif hız sabitleyici",BLIND_SPOT_MONITOR:"Kör nokta izleme",REAR_CROSS_TRAFFIC_ALERT:"Arka çapraz trafik uyarısı",TRAFFIC_SIGN_RECOGNITION:"Trafik işareti tanıma",DRIVER_ATTENTION_MONITOR:"Sürücü dikkat takip sistemi",HIGH_BEAM_ASSIST:"Uzun far asistanı",
  REAR_VIEW_CAMERA:"Geri görüş kamerası",SURROUND_VIEW_CAMERA_360:"360 derece çevre görüş kamerası",FRONT_PARKING_SENSORS:"Ön park sensörleri",REAR_PARKING_SENSORS:"Arka park sensörleri",AUTOMATIC_PARK_ASSIST:"Otomatik park desteği",
  ISOFIX_REAR_OUTER:"Arka dış koltuklarda ISOFIX",ISOFIX_FRONT_PASSENGER:"Ön yolcu koltuğunda ISOFIX",FRONT_SIDE_CURTAIN_AIRBAG_COVERAGE:"Ön, yan ve perde hava yastığı kapsamı",CENTER_AIRBAG:"Orta hava yastığı",REAR_SEAT_OCCUPANT_ALERT:"Arka koltuk yolcu uyarısı",
  HEATED_FRONT_SEATS:"Isıtmalı ön koltuklar",HEATED_REAR_SEATS:"Isıtmalı arka koltuklar",VENTILATED_FRONT_SEATS:"Havalandırmalı ön koltuklar",POWER_DRIVER_SEAT:"Elektrikli sürücü koltuğu",POWER_FRONT_PASSENGER_SEAT:"Elektrikli ön yolcu koltuğu",DRIVER_SEAT_MEMORY:"Hafızalı sürücü koltuğu",HEATED_STEERING_WHEEL:"Isıtmalı direksiyon",DUAL_ZONE_CLIMATE_CONTROL:"Çift bölgeli otomatik klima",THREE_ZONE_CLIMATE_CONTROL:"Üç bölgeli otomatik klima",FOUR_ZONE_CLIMATE_CONTROL:"Dört bölgeli otomatik klima",
  KEYLESS_ENTRY:"Anahtarsız giriş",KEYLESS_START:"Anahtarsız çalıştırma",POWER_TAILGATE:"Elektrikli bagaj kapağı",HANDS_FREE_TAILGATE:"Temassız açılan bagaj kapağı",PANORAMIC_GLASS_ROOF:"Panoramik cam tavan",
  APPLE_CARPLAY:"Apple CarPlay",WIRELESS_APPLE_CARPLAY:"Kablosuz Apple CarPlay",ANDROID_AUTO:"Android Auto",WIRELESS_ANDROID_AUTO:"Kablosuz Android Auto",WIRELESS_PHONE_CHARGING:"Kablosuz telefon şarjı",
  LED_HEADLIGHTS:"LED ön farlar",ADAPTIVE_HEADLIGHTS:"Adaptif ön farlar",MATRIX_LED_HEADLIGHTS:"Matrix LED ön farlar",AUTOMATIC_HIGH_BEAM:"Otomatik uzun far",
  HILL_DESCENT_CONTROL:"Yokuş iniş desteği",TERRAIN_DRIVE_MODES:"Arazi sürüş modları",LOW_RANGE_TRANSFER_CASE:"Düşük oranlı arazi şanzımanı",LOCKING_REAR_DIFFERENTIAL:"Kilitlenebilir arka diferansiyel",LOCKING_CENTER_DIFFERENTIAL:"Kilitlenebilir merkez diferansiyeli",CRAWL_CONTROL:"Düşük hızlı arazi ilerleme kontrolü",
};
const cohort = (code: EquipmentFeatureCode): EquipmentCohortPolicyId => code === "POWER_TAILGATE" || code === "HANDS_FREE_TAILGATE" ? "TAILGATE_BODY_V1"
  : category(code) === "OFF_ROAD" ? "OFF_ROAD_ARCHITECTURE_V1" : ["OCCUPANT_SAFETY","CABIN_COMFORT"].includes(category(code)) ? "PASSENGER_CABIN_V1" : "ALL_ACTIVE_VARIANTS_V1";

export const EQUIPMENT_FEATURE_DEFINITIONS: readonly EquipmentFeatureDefinition[] = EQUIPMENT_FEATURE_CODES.map((featureCode) => ({
  featureCode, category: category(featureCode), defaultDecisionUse: decisionUse(featureCode), labelTr: trLabels[featureCode], cohortPolicyId: cohort(featureCode),
}));

export const EQUIPMENT_INTENT_ALIASES: readonly EquipmentIntentAlias[] = [
  { aliasId: "blind-spot", featureCode: "BLIND_SPOT_MONITOR", normalizedPhrases: ["kör nokta", "yanımdaki aracı uyarsın"], ambiguityClass: "DIRECT", defaultDecisionUse: "SOFT_PREFERENCE" },
  { aliasId: "aeb", featureCode: "AUTONOMOUS_EMERGENCY_BRAKING", normalizedPhrases: ["kendi fren yapsın", "çarpışmada frenlesin"], ambiguityClass: "DIRECT", defaultDecisionUse: "SOFT_PREFERENCE" },
  { aliasId: "lane-keep", featureCode: "LANE_KEEP_ASSIST", normalizedPhrases: ["şeritte tutsun"], ambiguityClass: "DIRECT", defaultDecisionUse: "SOFT_PREFERENCE" },
  { aliasId: "lane-center", featureCode: "LANE_CENTERING_ASSIST", normalizedPhrases: ["şeridin ortasında gitsin"], ambiguityClass: "DIRECT", defaultDecisionUse: "SOFT_PREFERENCE" },
  { aliasId: "auto-park", featureCode: "AUTOMATIC_PARK_ASSIST", normalizedPhrases: ["kendi kendine park etsin"], ambiguityClass: "DIRECT", defaultDecisionUse: "SOFT_PREFERENCE" },
  { aliasId: "surround-camera", featureCode: "SURROUND_VIEW_CAMERA_360", normalizedPhrases: ["tepeden kamera", "kuş bakışı kamera"], ambiguityClass: "DIRECT", defaultDecisionUse: "SOFT_PREFERENCE" },
  { aliasId: "ventilated-seat", featureCode: "VENTILATED_FRONT_SEATS", normalizedPhrases: ["koltuk serinletsin"], ambiguityClass: "DIRECT", defaultDecisionUse: "SOFT_PREFERENCE" },
  { aliasId: "wireless-phone-connect", normalizedPhrases: ["telefonu kablosuz bağlayayım"], ambiguityClass: "NEEDS_CONFIRMATION", defaultDecisionUse: "EXPLANATION_ONLY" },
  { aliasId: "adaptive-light", featureCode: "ADAPTIVE_HEADLIGHTS", normalizedPhrases: ["farlar virajı takip etsin"], ambiguityClass: "DIRECT", defaultDecisionUse: "SOFT_PREFERENCE" },
  { aliasId: "crawl", featureCode: "CRAWL_CONTROL", normalizedPhrases: ["arazide ağır ağır kendi ilerlesin"], ambiguityClass: "NEEDS_CONFIRMATION", defaultDecisionUse: "SOFT_PREFERENCE" },
  { aliasId: "generic-safe", normalizedPhrases: ["güvenli olsun"], ambiguityClass: "GENERIC_NOT_BINDABLE", defaultDecisionUse: "EXPLANATION_ONLY" },
  { aliasId: "generic-equipped", normalizedPhrases: ["donanımlı olsun", "full paket olsun", "teknolojisi iyi olsun"], ambiguityClass: "GENERIC_NOT_BINDABLE", defaultDecisionUse: "EXPLANATION_ONLY" },
];

export function getEquipmentDecisionUse(featureCode: EquipmentFeatureCode): EquipmentDecisionUse {
  return EQUIPMENT_FEATURE_DEFINITIONS.find((definition) => definition.featureCode === featureCode)!.defaultDecisionUse;
}
