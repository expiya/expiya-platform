import { createHash } from "node:crypto";

import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";
import type { PriceObservation, ProductionFuelType, ProvenanceRecord, TurkeyVehicleVariant } from "@/types/productionVehicle";

const ACCESSED_AT = "2026-08-16T00:00:00.000Z";
const PRICE_EFFECTIVE_FROM = "2026-08-03T00:00:00.000Z";
const PRICE_URL = "https://www.alfaromeo.com.tr/alfa-romeo-fiyat-listesi";

interface AlfaRomeoCandidate {
  readonly model: "Junior" | "Tonale";
  readonly trim: string;
  readonly modelUrl: string;
  readonly emissionsUrl: string;
  readonly priceTry: number;
  readonly fuelType: ProductionFuelType;
  readonly engineDisplacementCc?: number;
  readonly sourcePowerPs?: number;
  readonly powerKw: number;
  readonly torqueNm: number;
  readonly transmission: string;
  readonly dimensions: { readonly lengthMm: number; readonly widthMm: number; readonly heightMm?: number; readonly wheelbaseMm?: number; readonly luggageLitres: number; readonly seats?: number };
  readonly combinedLitresPer100Km?: number;
  readonly combinedKwhPer100Km?: number;
  readonly electricRangeKm?: number;
  readonly batteryCapacityKwh?: number;
  readonly batteryUsableKwh?: number;
  readonly maxDcChargeKw?: number;
  readonly safety: readonly string[];
}

export function deterministicAlfaRomeoUuid(value: string): string {
  const bytes = createHash("sha256").update(`expiya:alfa-romeo-batch-01:${value}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const juniorSafety = ["ABS", "ESC", "TPMS", "FRONT_SIDE_CURTAIN_AIRBAGS", "AEB", "PEDESTRIAN_DETECTION", "LKA", "ISA", "TRAFFIC_SIGN_RECOGNITION", "DRIVER_ATTENTION_WARNING", "ADAPTIVE_CRUISE_CONTROL", "BLIND_SPOT_WARNING", "LEVEL_2_DRIVER_ASSIST", "REAR_CAMERA", "FRONT_REAR_SIDE_PARK_SENSORS"] as const;
const tonaleSafety = ["AEB", "PEDESTRIAN_CYCLIST_DETECTION", "ISA", "TRAFFIC_SIGN_RECOGNITION", "DRIVER_ATTENTION_WARNING", "ADAPTIVE_CRUISE_CONTROL", "ACTIVE_DRIVING_ASSIST", "BLIND_SPOT_WARNING", "REAR_CROSS_TRAFFIC_WARNING", "SURROUND_VIEW_CAMERA", "FRONT_REAR_SIDE_PARK_SENSORS", "PARK_ASSIST"] as const;

const candidates: readonly AlfaRomeoCandidate[] = [
  {
    model: "Junior", trim: "Elettrica 115 kW Speciale+", modelUrl: "https://www.alfaromeo.com.tr/arac-modelleri/junior-elettrica",
    emissionsUrl: "https://www.alfaromeo.com.tr/content/dam/alfa/tr/yakit-ekonomisi-ve-co2-emisyonu/2026/haziran/junior-elettrica-speciale-emisyon-foyu.pdf",
    priceTry: 2_474_300, fuelType: "BEV", powerKw: 115, torqueNm: 260, transmission: "Single-speed automatic", dimensions: { lengthMm: 4173, widthMm: 1781, heightMm: 1532, wheelbaseMm: 2562, luggageLitres: 400, seats: 5 },
    combinedKwhPer100Km: 15.2, electricRangeKm: 407, batteryCapacityKwh: 54, batteryUsableKwh: 51, maxDcChargeKw: 100, safety: juniorSafety,
  },
  {
    model: "Junior", trim: "Ibrida 145 PS Speciale+ eDCT6", modelUrl: "https://www.alfaromeo.com.tr/arac-modelleri/junior-ibrida",
    emissionsUrl: "https://www.alfaromeo.com.tr/content/dam/alfa/tr/yakit-ekonomisi-ve-co2-emisyonu/2026/haziran/junior-ibrida-speciale-emisyon-foyu.pdf",
    priceTry: 2_668_200, fuelType: "MHEV", engineDisplacementCc: 1199, sourcePowerPs: 145, powerKw: 106.6, torqueNm: 230,
    transmission: "6-speed eDCT dual-clutch automatic", dimensions: { lengthMm: 4173, widthMm: 1781, heightMm: 1539, wheelbaseMm: 2557, luggageLitres: 415, seats: 5 }, combinedLitresPer100Km: 4.9, safety: juniorSafety,
  },
  {
    model: "Tonale", trim: "1.5 Hybrid 175 PS Speciale TCT7", modelUrl: "https://www.alfaromeo.com.tr/arac-modelleri/yeni-tonale",
    emissionsUrl: "https://www.alfaromeo.com.tr/content/dam/alfa/tr/yakit-ekonomisi-ve-co2-emisyonu/2026/haziran/tonale-speciale-emisyon-foyu.pdf",
    priceTry: 3_773_800, fuelType: "MHEV", engineDisplacementCc: 1469, sourcePowerPs: 175, powerKw: 128.7, torqueNm: 240,
    transmission: "7-speed TCT dual-clutch automatic", dimensions: { lengthMm: 4522, widthMm: 1937, heightMm: 1601, wheelbaseMm: 2636, luggageLitres: 500, seats: 5 }, combinedLitresPer100Km: 5.8, safety: tonaleSafety,
  },
  {
    model: "Tonale", trim: "1.6 Diesel 130 PS Ti TCT6", modelUrl: "https://www.alfaromeo.com.tr/arac-modelleri/yeni-tonale",
    emissionsUrl: "https://www.alfaromeo.com.tr/content/dam/alfa/tr/yakit-ekonomisi-ve-co2-emisyonu/2026/haziran/tonale-ti-emisyon-foyu.pdf",
    priceTry: 3_455_400, fuelType: "DIESEL", engineDisplacementCc: 1598, sourcePowerPs: 130, powerKw: 95.6, torqueNm: 320,
    transmission: "6-speed TCT dual-clutch automatic", dimensions: { lengthMm: 4522, widthMm: 1937, heightMm: 1601, wheelbaseMm: 2636, luggageLitres: 500, seats: 5 }, combinedLitresPer100Km: 5.4, safety: tonaleSafety,
  },
];

function createRecord(input: AlfaRomeoCandidate): PilotVehicleRecord {
  const identityKey = `${input.model}|2026|${input.trim}`;
  const id = deterministicAlfaRomeoUuid(`variant:${identityKey}`);
  const technical: ProvenanceRecord = {
    sourceId: "alfa-romeo-tr", sourceUrl: input.modelUrl, accessedAt: ACCESSED_AT,
    documentVersion: `${input.model} Turkey model page and official 2026 technical brochure, accessed 2026-08-16`,
    extractionMethod: "DOCUMENT_IMPORT", confidence: "HIGH",
    limitations: ["Official Turkey-market public facts only", "Real-world efficiency varies", "PDF binary download was blocked by publisher CDN; facts were cross-checked against the official model page and indexed official document"],
  };
  const emissions: ProvenanceRecord = {
    sourceId: "alfa-romeo-tr", sourceUrl: input.emissionsUrl, accessedAt: ACCESSED_AT,
    documentVersion: "Configuration-specific WLTP fuel economy and emissions label, June 2026",
    extractionMethod: "DOCUMENT_IMPORT", confidence: "HIGH", limitations: ["Official configuration-specific label", "Real-world efficiency varies"],
  };
  const priceSource: ProvenanceRecord = {
    sourceId: "alfa-romeo-tr", sourceUrl: PRICE_URL, accessedAt: ACCESSED_AT, publishedAt: PRICE_EFFECTIVE_FROM,
    documentVersion: "Alfa Romeo / Tofaş MY2026 price circular effective 2026-08-03",
    extractionMethod: "API", confidence: "HIGH", limitations: ["Dated distributor list-price observation; may change without notice", "Price age is informational and does not invalidate recommendation filtering"],
  };
  const sourced = <T>(value: T, provenance: ProvenanceRecord = technical, confidence: "HIGH" | "MEDIUM" = "HIGH") => ({ value, provenance: [provenance] as [ProvenanceRecord], confidence });
  const identitySourced = <T>(value: T) => ({ value, provenance: [{ ...technical, limitations: [...technical.limitations] }], confidence: "HIGH" as const });
  const power = input.sourcePowerPs
    ? sourced(input.powerKw, { ...technical, confidence: "MEDIUM", limitations: [...technical.limitations, `System power converted from ${input.sourcePowerPs} PS using 1 PS = 0.73549875 kW; rounded to one decimal`] }, "MEDIUM")
    : sourced(input.powerKw);
  const dimensions = Object.fromEntries(Object.entries(input.dimensions).filter(([, value]) => value !== undefined).map(([key, value]) => [key, sourced(value)]));
  const variant: TurkeyVehicleVariant = {
    id, market: "TR", lifecycleStatus: "ON_SALE", brand: sourced("Alfa Romeo"), model: sourced(input.model), bodyStyle: sourced("SUV"), trim: sourced(input.trim), modelYear: sourced(2026),
    powertrain: { fuelType: sourced(input.fuelType), ...(input.engineDisplacementCc ? { engineDisplacementCc: sourced(input.engineDisplacementCc, emissions) } : {}), powerKw: power, torqueNm: sourced(input.torqueNm), transmission: sourced(input.transmission), drivenWheels: sourced("FWD") },
    dimensions: dimensions as TurkeyVehicleVariant["dimensions"],
    efficiency: {
      protocol: sourced("WLTP", emissions),
      ...(input.combinedLitresPer100Km ? { combinedLitresPer100Km: sourced(input.combinedLitresPer100Km, emissions) } : {}),
      ...(input.combinedKwhPer100Km ? { combinedKwhPer100Km: sourced(input.combinedKwhPer100Km, emissions) } : {}),
      ...(input.electricRangeKm ? { electricRangeKm: sourced(input.electricRangeKm, emissions) } : {}),
      ...(input.batteryCapacityKwh ? { batteryCapacityKwh: sourced(input.batteryCapacityKwh) } : {}),
      ...(input.batteryUsableKwh ? { batteryUsableKwh: sourced(input.batteryUsableKwh) } : {}),
      ...(input.maxDcChargeKw ? { maxDcChargeKw: sourced(input.maxDcChargeKw) } : {}),
    },
    safetyFeatureCodes: input.safety.map((code) => sourced(code)), createdAt: ACCESSED_AT, updatedAt: ACCESSED_AT,
  };
  const price: PriceObservation = {
    id: deterministicAlfaRomeoUuid(`price:${identityKey}:LIST`), vehicleVariantId: id, market: "TR", condition: "NEW",
    amountTry: input.priceTry, priceType: "LIST", validFrom: PRICE_EFFECTIVE_FROM, sellerType: "DISTRIBUTOR", provenance: [priceSource], confidence: "HIGH",
  };
  const identity = { id, market: "TR" as const, lifecycleStatus: "ON_SALE" as const, brand: identitySourced("Alfa Romeo"), model: identitySourced(input.model), bodyStyle: identitySourced("SUV"), trim: identitySourced(input.trim), modelYear: identitySourced(2026) };
  return { identity, prices: [price], technicalVariant: variant };
}

export const stagedAlfaRomeoBatch01Records: readonly PilotVehicleRecord[] = candidates.map(createRecord);
