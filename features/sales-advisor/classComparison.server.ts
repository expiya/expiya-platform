import type { CatalogFact, CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import type { PublicVariantFact } from "./types";

type NumericKey = "power" | "torque" | "engineDisplacement" | "seats" | "luggage" | "cargoVolume" | "payload" | "brakedTowing" | "length" | "width" | "height" | "wheelbase" | "range" | "consumption" | "electricConsumption" | "dcCharge" | "batteryCapacity" | "usableBattery";

const numericFact = (variant: CatalogVariantSnapshot, key: NumericKey): CatalogFact<number> | undefined => {
  const d = variant.decisionFacts;
  const values: Record<NumericKey, CatalogFact<number> | undefined> = {
    power: d.powertrain.powerKw, torque: d.powertrain.torqueNm, engineDisplacement: d.powertrain.engineDisplacementCc,
    seats: d.dimensions.seats, luggage: d.dimensions.luggageLitres, cargoVolume: d.dimensions.cargoVolumeLitres,
    payload: d.dimensions.payloadKg, brakedTowing: d.dimensions.brakedTowingKg, length: d.dimensions.lengthMm,
    width: d.dimensions.widthMm, height: d.dimensions.heightMm, wheelbase: d.dimensions.wheelbaseMm,
    range: d.efficiency.electricRangeKm, consumption: d.efficiency.combinedLitresPer100Km,
    electricConsumption: d.efficiency.combinedKwhPer100Km, dcCharge: d.efficiency.maxDcChargeKw,
    batteryCapacity: d.efficiency.batteryCapacityKwh, usableBattery: d.efficiency.batteryUsableKwh,
  };
  return values[key];
};

const reliable = <T,>(fact: CatalogFact<T> | undefined): fact is CatalogFact<T> => Boolean(fact?.confidence === "HIGH" && fact.provenance.length);
const fuelScoped = new Set<NumericKey>(["power", "torque", "engineDisplacement", "range", "consumption", "electricConsumption", "dcCharge", "batteryCapacity", "usableBattery"]);
const lowerIsMoreEfficient = new Set<NumericKey>(["consumption", "electricConsumption"]);
const directional = new Set<NumericKey>(["power", "torque", "range", "luggage", "cargoVolume", "payload", "brakedTowing", "dcCharge", "batteryCapacity", "usableBattery"]);

function numericComparison(variant: CatalogVariantSnapshot, variants: readonly CatalogVariantSnapshot[], key: NumericKey): PublicVariantFact["classComparison"] | undefined {
  const own = numericFact(variant, key);
  if (!reliable(own)) return undefined;
  const bodyStyle = variant.decisionFacts.bodyStyle.value;
  const fuelType = variant.decisionFacts.powertrain.fuelType.value;
  const peers = variants.filter((item) => item.market === "TR" && item.lifecycleStatus === "ON_SALE" && item.decisionFacts.bodyStyle.value === bodyStyle && (!fuelScoped.has(key) || item.decisionFacts.powertrain.fuelType.value === fuelType));
  const values = peers.flatMap((item) => { const value = numericFact(item, key); return reliable(value) ? [value.value] : []; }).sort((a, b) => a - b);
  if (values.length < 3) return undefined;
  const below = values.filter((value) => value < own.value).length;
  const equal = values.filter((value) => value === own.value).length;
  const percentile = (below + equal / 2) / values.length;
  const position = percentile >= 0.67 ? "üst" : percentile <= 0.33 ? "alt" : "orta";
  const basis = `${bodyStyle} ve ${fuelType} araçlar`;
  const direction = lowerIsMoreEfficient.has(key)
    ? position === "alt" ? "değer daha düşük tüketim tarafında" : position === "üst" ? "değer daha yüksek tüketim tarafında" : "değer orta tüketim bandında"
    : directional.has(key) ? `değer grubun ${position} bölümünde yer alıyor` : `ölçü grubun ${position} bölümünde yer alıyor; bu konum tek başına daha iyi veya daha kötü anlamına gelmiyor`;
  return { text: `Aynı gövde ve güç sistemi grubunda ${values.length} varyantın doğrulanmış verisiyle karşılaştırıldığında ${direction}.`, peerCount: peers.length, dataCount: values.length, basis };
}

function categoricalComparison(variant: CatalogVariantSnapshot, variants: readonly CatalogVariantSnapshot[], key: string): PublicVariantFact["classComparison"] | undefined {
  const value = key === "bodyStyle" ? variant.decisionFacts.bodyStyle.value : key === "fuelType" ? variant.decisionFacts.powertrain.fuelType.value : key === "transmission" ? variant.decisionFacts.powertrain.transmission.value : key === "drivenWheels" ? variant.decisionFacts.powertrain.drivenWheels?.value : undefined;
  if (!value) return undefined;
  const useClass = variant.decisionFacts.vehicleUseClass?.value ?? "PASSENGER";
  const peers = variants.filter((item) => item.market === "TR" && item.lifecycleStatus === "ON_SALE" && (item.decisionFacts.vehicleUseClass?.value ?? "PASSENGER") === useClass);
  const same = peers.filter((item) => (key === "bodyStyle" ? item.decisionFacts.bodyStyle.value : key === "fuelType" ? item.decisionFacts.powertrain.fuelType.value : key === "transmission" ? item.decisionFacts.powertrain.transmission.value : item.decisionFacts.powertrain.drivenWheels?.value) === value).length;
  if (peers.length < 3) return undefined;
  return { text: `Türkiye kataloğundaki aynı kullanım sınıfında ${peers.length} varyantın ${same} tanesi bu yapıdadır. Bu oran kalite sıralaması değil, seçimin katalog içindeki yaygınlığını gösterir.`, peerCount: peers.length, dataCount: peers.length, basis: `${useClass} kullanım sınıfı` };
}

export function createClassComparison(variant: CatalogVariantSnapshot, variants: readonly CatalogVariantSnapshot[], key: string): PublicVariantFact["classComparison"] | undefined {
  if (["bodyStyle", "fuelType", "transmission", "drivenWheels"].includes(key)) return categoricalComparison(variant, variants, key);
  return numericComparison(variant, variants, key as NumericKey);
}
