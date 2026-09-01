export type ReferenceVehicleTrait =
  | "DESIGN"
  | "PERFORMANCE"
  | "DRIVING_ENGAGEMENT"
  | "LOW_SPORTS_CAR"
  | "COMFORT"
  | "REAR_SPACE"
  | "LUGGAGE"
  | "SEDAN_BALANCE";

export interface ReferenceVehicleDefinition {
  readonly id: "DODGE_VIPER" | "VOLKSWAGEN_PASSAT";
  readonly canonicalName: string;
  readonly aliases: readonly string[];
  readonly traits: readonly ReferenceVehicleTrait[];
}

const REFERENCES: readonly ReferenceVehicleDefinition[] = [
  {
    id: "DODGE_VIPER",
    canonicalName: "Dodge Viper",
    aliases: ["dodge viper", "doge viper", "dodge wiper", "doge wiper"],
    traits: ["DESIGN", "PERFORMANCE", "DRIVING_ENGAGEMENT", "LOW_SPORTS_CAR"],
  },
  {
    id: "VOLKSWAGEN_PASSAT",
    canonicalName: "Volkswagen Passat",
    aliases: ["volkswagen passat", "vw passat", "passat"],
    traits: ["COMFORT", "REAR_SPACE", "LUGGAGE", "SEDAN_BALANCE"],
  },
] as const;

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").replace(/[’']/gu, "").replace(/\s+/gu, " ").trim();

export function resolveReferenceVehicle(message: string): ReferenceVehicleDefinition | undefined {
  const normalized = normalize(message);
  return REFERENCES.find((reference) => reference.aliases.some((alias) => normalized.includes(alias)));
}

export function isReferenceSimilarityRequest(message: string, hasPriorReference: boolean): boolean {
  const similarity = /(?:benzer(?:i)?|gibi|muadil|alternatif|tarz(?:ı|ında)|havasında|karakterinde)/iu.test(message);
  const recommendation = /(?:öner|tavsiye|araç (?:arıyorum|istiyorum)|araba (?:arıyorum|istiyorum)|almak|satın|hangisi|benzer.{0,20}olsun|yine.{0,20}olsun)/iu.test(message);
  return recommendation && (similarity || (hasPriorReference && /(?:buna|ona|benzer)/iu.test(message)));
}

export function referenceVehicleQuestion(reference: ReferenceVehicleDefinition): string {
  if (reference.id === "DODGE_VIPER")
    return "Dodge Viper'ı referans araç olarak aldım; fakat tek başına model adı hangi özelliğini aradığını söylemiyor. Viper'da seni en çok çeken taraf hangisi: dikkat çekici spor otomobil tasarımı, güçlü hızlanma ve performans, sürücü odaklı sürüş karakteri veya alçak spor otomobil yapısı?";
  return "Eski Passat'ı birebir model zorunluluğu olarak değil, referans araç olarak aldım. Yeni Passat Variant'ı mı değerlendirelim; yoksa eski Passat'taki uzun yol konforu, geniş arka koltuk alanı, büyük bagaj veya dengeli sedan yapısından hangilerini koruyalım?";
}

export function referenceQuestionKey(reference: ReferenceVehicleDefinition): string {
  return `referenceVehicleTraits:${reference.id}`;
}
