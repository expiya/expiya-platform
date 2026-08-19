import { EQUIPMENT_FEATURE_CODES, type EquipmentFeatureCode } from "@/types/equipmentEvidence";

export const EQUIPMENT_INTENT_VOCABULARY_VERSION = "tr-TR-equipment-intent-v1.0.0" as const;

const aliases: Record<EquipmentFeatureCode, readonly string[]> = {
  AUTONOMOUS_EMERGENCY_BRAKING: ["otonom acil fren", "acil fren desteği", "aeb"],
  FORWARD_COLLISION_WARNING: ["ön çarpışma uyarısı", "çarpışma uyarısı"],
  LANE_DEPARTURE_WARNING: ["şerit terk uyarısı", "şeritten çıkma uyarısı"],
  LANE_KEEP_ASSIST: ["şeritte tutma", "şeritte tutmayı", "şerit tutma asistanı", "lane keep assist", "lka"],
  LANE_CENTERING_ASSIST: ["şerit ortalama", "şerit merkezleme", "lane centering"],
  ADAPTIVE_CRUISE_CONTROL: ["adaptif hız sabitleyici", "adaptif hız sabitleyiciyi", "adaptif hız sabitleme", "adaptif cruise", "acc"],
  BLIND_SPOT_MONITOR: ["kör nokta uyarısı", "kör nokta izleme", "kör nokta"],
  REAR_CROSS_TRAFFIC_ALERT: ["arka çapraz trafik uyarısı", "geri çıkış trafik uyarısı"],
  TRAFFIC_SIGN_RECOGNITION: ["trafik işareti tanıma", "tabela tanıma"],
  DRIVER_ATTENTION_MONITOR: ["sürücü dikkat takibi", "yorgunluk uyarısı", "dikkat asistanı"],
  HIGH_BEAM_ASSIST: ["uzun far asistanı", "uzun far desteği"],
  REAR_VIEW_CAMERA: ["geri görüş kamerası", "geri kamera", "arka kamera"],
  SURROUND_VIEW_CAMERA_360: ["360 kamera", "360 kameradan", "360 derece kamera", "çevre görüş kamerası", "kuş bakışı kamera"],
  FRONT_PARKING_SENSORS: ["ön park sensörü", "ön park sensörleri"],
  REAR_PARKING_SENSORS: ["arka park sensörü", "arka park sensörleri"],
  AUTOMATIC_PARK_ASSIST: ["otomatik park", "park asistanı"],
  ISOFIX_REAR_OUTER: ["arka isofix", "arka koltuk isofix", "isofix"],
  ISOFIX_FRONT_PASSENGER: ["ön yolcu isofix", "ön isofix"],
  FRONT_SIDE_CURTAIN_AIRBAG_COVERAGE: ["ön yan perde hava yastıkları", "yan ve perde hava yastığı"],
  CENTER_AIRBAG: ["orta hava yastığı", "merkez hava yastığı"],
  REAR_SEAT_OCCUPANT_ALERT: ["arka koltuk yolcu uyarısı", "arka koltuk hatırlatıcı"],
  HEATED_FRONT_SEATS: ["ön koltuk ısıtma", "ısıtmalı ön koltuk", "koltuk ısıtma", "ısıtmalı koltuk"],
  HEATED_REAR_SEATS: ["arka koltuk ısıtma", "ısıtmalı arka koltuk"],
  VENTILATED_FRONT_SEATS: ["ön koltuk havalandırma", "havalandırmalı ön koltuk", "soğutmalı koltuk", "koltuk soğutma"],
  POWER_DRIVER_SEAT: ["elektrikli sürücü koltuğu", "motorlu sürücü koltuğu"],
  POWER_FRONT_PASSENGER_SEAT: ["elektrikli ön yolcu koltuğu", "motorlu yolcu koltuğu"],
  DRIVER_SEAT_MEMORY: ["sürücü koltuğu hafızası", "hafızalı sürücü koltuğu", "koltuk hafızası"],
  HEATED_STEERING_WHEEL: ["direksiyon ısıtma", "ısıtmalı direksiyon"],
  DUAL_ZONE_CLIMATE_CONTROL: ["çift bölgeli klima", "iki bölgeli klima"],
  THREE_ZONE_CLIMATE_CONTROL: ["üç bölgeli klima", "3 bölgeli klima"],
  FOUR_ZONE_CLIMATE_CONTROL: ["dört bölgeli klima", "4 bölgeli klima"],
  KEYLESS_ENTRY: ["anahtarsız giriş", "keyless entry"],
  KEYLESS_START: ["anahtarsız çalıştırma", "anahtarsız marş", "keyless start"],
  POWER_TAILGATE: ["elektrikli bagaj", "elektrikli bagaj kapağı"],
  HANDS_FREE_TAILGATE: ["eller serbest bagaj", "ayak sensörlü bagaj"],
  PANORAMIC_GLASS_ROOF: ["panoramik cam tavan", "panoramik tavan", "cam tavan"],
  APPLE_CARPLAY: ["apple carplay", "carplay"],
  WIRELESS_APPLE_CARPLAY: ["kablosuz apple carplay", "kablosuz carplay", "wireless carplay"],
  ANDROID_AUTO: ["android auto"],
  WIRELESS_ANDROID_AUTO: ["kablosuz android auto", "wireless android auto"],
  WIRELESS_PHONE_CHARGING: ["kablosuz telefon şarjı", "kablosuz şarj", "wireless şarj"],
  LED_HEADLIGHTS: ["led far", "led ön far"],
  ADAPTIVE_HEADLIGHTS: ["adaptif far", "viraj farı"],
  MATRIX_LED_HEADLIGHTS: ["matrix led far", "matris led far", "matrix far"],
  AUTOMATIC_HIGH_BEAM: ["otomatik uzun far", "otomatik uzun kısa far"],
  HILL_DESCENT_CONTROL: ["yokuş iniş desteği", "iniş kontrolü", "hill descent"],
  TERRAIN_DRIVE_MODES: ["arazi modu", "arazi sürüş modları", "terrain mode"],
  LOW_RANGE_TRANSFER_CASE: ["ağır devir", "düşük oranlı transfer", "low range"],
  LOCKING_REAR_DIFFERENTIAL: ["arka diferansiyel kilidi", "arka diff kilidi"],
  LOCKING_CENTER_DIFFERENTIAL: ["merkez diferansiyel kilidi", "orta diferansiyel kilidi"],
  CRAWL_CONTROL: ["crawl control", "sürünme kontrolü"],
};

export const EQUIPMENT_TURKISH_ALIASES: Readonly<Record<EquipmentFeatureCode, readonly string[]>> = Object.freeze(
  Object.fromEntries(EQUIPMENT_FEATURE_CODES.map((code) => [code, Object.freeze([...aliases[code]])])) as Record<EquipmentFeatureCode, readonly string[]>,
);

export const AMBIGUOUS_EQUIPMENT_PHRASES = Object.freeze(["güvenli olsun", "güvenli araba", "konforlu olsun", "teknolojisi iyi olsun", "dolu paket olsun", "her şey olsun", "kameralı olsun", "kamera olsun", "kamera", "park sensörü", "şerit takip"]);
export const UNKNOWN_AUTOMOTIVE_TERMS = Object.freeze(["hayalet ekran", "normal hız sabitleyici", "cruise control", "dijital kokpit", "head up display", "hud"]);

if (Object.keys(EQUIPMENT_TURKISH_ALIASES).length !== 51 || EQUIPMENT_FEATURE_CODES.some((code) => !EQUIPMENT_TURKISH_ALIASES[code]?.length)) {
  throw new Error("EQUIPMENT_INTENT_VOCABULARY_INCOMPLETE");
}
