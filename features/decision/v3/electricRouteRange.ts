export interface ElectricRouteRangeRequirement {
  readonly origin: string;
  readonly destination: string;
  readonly oneWayRoadKm: number;
  readonly plannedDistanceKm: number;
  readonly minimumCatalogRangeKm: number;
  readonly roundTrip: boolean;
}

const normalize = (value: string) => value
  .toLocaleLowerCase("tr-TR")
  .normalize("NFKD")
  .replace(/\p{M}+/gu, "")
  .replace(/ı/gu, "i");

// Bounded, versioned road-distance facts. These are not live navigation results.
// Values are deliberately rounded and the resulting catalog-range threshold adds
// a 20% operating reserve for weather, speed, load and climate-control variance.
const corridors = [
  { cities: ["istanbul", "bursa"] as const, oneWayRoadKm: 155 },
] as const;

export function deriveElectricRouteRangeRequirement(text: string): ElectricRouteRangeRequirement | undefined {
  const normalized = normalize(text);
  if (!/(?:elektrik|menzil|sarj)/u.test(normalized)) return undefined;
  const corridor = corridors.find(({ cities }) => cities.every((city) => normalized.includes(city)));
  if (!corridor) return undefined;
  const roundTrip = /(?:gidis\s*gelis|gidip\s*gel|gidis.*donus|tek\s*sarj)/u.test(normalized);
  if (!roundTrip) return undefined;
  const plannedDistanceKm = corridor.oneWayRoadKm * 2;
  return {
    origin: "İstanbul",
    destination: "Bursa",
    oneWayRoadKm: corridor.oneWayRoadKm,
    plannedDistanceKm,
    minimumCatalogRangeKm: Math.ceil((plannedDistanceKm * 1.2) / 10) * 10,
    roundTrip: true,
  };
}

export function electricRouteRangeAcknowledgement(requirement: ElectricRouteRangeRequirement): string {
  return `${requirement.origin}–${requirement.destination} gidiş dönüşünü yaklaşık ${requirement.plannedDistanceKm} km kabul edip hava, hız, yük ve iklimlendirme etkileri için pay bıraktım. Tek şarj hedefin için en az ${requirement.minimumCatalogRangeKm} km katalog menzilini seçim şartı olarak uyguluyorum.`;
}
