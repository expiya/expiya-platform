import type { BodyType, Car } from "@/types/car";

export type VehicleUseRequirement =
  | "CARGO"
  | "PASSENGER_TRANSPORT"
  | "TOWING"
  | "OFF_ROAD"
  | "FAMILY"
  | "COMPACT_CITY"
  | "CLASSIC"
  | "PERFORMANCE";

const hardBodyTypes: Readonly<Partial<Record<VehicleUseRequirement, readonly BodyType[]>>> = {
  CARGO: ["Pickup", "Van"],
  PASSENGER_TRANSPORT: ["Van"],
  TOWING: ["Pickup", "SUV"],
  OFF_ROAD: ["SUV", "Pickup"],
  FAMILY: ["Sedan", "Hatchback", "SUV", "Van"],
  COMPACT_CITY: ["Hatchback"],
  CLASSIC: ["Sedan", "Coupe", "SUV"],
  PERFORMANCE: ["Coupe", "Sedan"],
};

const patterns: readonly [VehicleUseRequirement, RegExp][] = [
  ["CARGO", /(?:yük|eşya|malzeme|koli|ürün|alet|ekipman|sevkiyat|nakliye)\s*(?:taşı|taşımak|taşıma|taşıyacağ|götür)|(?:taşı|taşımak|taşıma|taşıyacağ)\w*\s*(?:yük|eşya|malzeme|koli|ürün|alet|ekipman)|\b(?:cargo|haul|hauling|delivery|deliveries)\b/iu],
  ["PASSENGER_TRANSPORT", /(?:yolcu|personel|servis|müşteri)\s*(?:taşı|taşımak|taşıma|taşıyacağ)|(?:personel|okul|müşteri)\s+servis|(?:kalabalık|çok kişilik)\s*(?:grup|yolculuk)|\b(?:passenger transport|shuttle)\b/iu],
  ["TOWING", /(?:römork|karavan|tekne)\s*(?:çek|çekmek|çekeceğ)|\b(?:tow|towing|trailer)\b/iu],
  ["OFF_ROAD", /\b(?:off-road|offroad|4x4)\b|(?:arazi|köy yol|bozuk yol|dağ yol)/iu],
  ["FAMILY", /(?:aile|çocuk|bebek|çocuk koltuğu)|\b(?:family|children|child seat|baby)\b/iu],
  ["COMPACT_CITY", /(?:park\w*\s*(?:zor|dar|kolay)|(?:çok\s+)?küçük(?:\s+şehir)?\s+(?:arabası|araba|araç)|kompakt(?:\s+şehir)?\s+(?:arabası|araba|araç)|şehir\s+(?:otomobili|arabası|aracı)|dar sokak)|\b(?:easy parking|compact (?:city )?car|small (?:city )?car|tight parking)\b/iu],
  ["CLASSIC", /\b(?:klasik|classic|nostaljik|vintage)\b/iu],
  ["PERFORMANCE", /(?:spor araba|performans|pist|roadster)|\b(?:sports car|performance car|track car)\b/iu],
];

const specializedOffRoadIds = new Set(["9", "10", "11", "12", "19"]);

export function resolveVehicleUseRequirements(text: string): readonly VehicleUseRequirement[] {
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([requirement]) => requirement);
}

export function carSatisfiesUseRequirements(
  car: Car,
  requirements: readonly VehicleUseRequirement[],
): boolean {
  return requirements.every((requirement) => {
    if (requirement === "CLASSIC") return car.year <= 1999;
    if (requirement === "OFF_ROAD") return specializedOffRoadIds.has(car.id);
    return hardBodyTypes[requirement]?.includes(car.bodyType) ?? true;
  });
}

export function describeUseRequirement(requirement: VehicleUseRequirement): string {
  const descriptions: Record<VehicleUseRequirement, string> = {
    CARGO: "Yük taşıma amacına uygun gövde tipi",
    PASSENGER_TRANSPORT: "Düzenli yolcu taşıma amacına uygun gövde tipi",
    TOWING: "Çekme ihtiyacına uygun araç sınıfı",
    OFF_ROAD: "Arazi kullanımına uygun araç sınıfı",
    FAMILY: "Aile kullanımına uygun gövde tipi",
    COMPACT_CITY: "Dar alan ve park ihtiyacına uygun kompakt gövde",
    CLASSIC: "Klasik araç isteğiyle uyumlu model yılı",
    PERFORMANCE: "Performans odaklı kullanıma uygun araç sınıfı",
  };
  return descriptions[requirement];
}
