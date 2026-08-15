import { createHash } from "node:crypto";

import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";
import type { PriceObservation, ProvenanceRecord, TurkeyVehicleVariant } from "@/types/productionVehicle";

const ACCESSED_AT = "2026-08-16T00:00:00.000Z";
const PRICE_EFFECTIVE_FROM = "2026-08-16T00:00:00.000Z";
const CONSUMPTION_URL = "https://cdn.group.renault.com/alp/tr/brochure/Alpine_consumption_TR_v2.pdf.asset.pdf/61796ee739.pdf";

export function deterministicAlpineUuid(value: string): string {
  const bytes = createHash("sha256").update(`expiya:alpine-batch-01:${value}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const candidates = [
  {
    model: "A290", trim: "GT Performance", url: "https://www.alpinecars.com.tr/elektrikli-modeler/a290/konfigurator.html", priceTry: 2_312_000,
    powerKw: 160, torqueNm: 300, rangeKm: 361, consumption: 16.6, batteryKwh: 52, drivenWheels: "FWD",
    dimensions: { lengthMm: 3997, widthMm: 1823, heightMm: 1512, wheelbaseMm: 2534, luggageLitres: 326, seats: 5, groundClearanceMm: 151 },
    bodyStyle: "Hatchback", safety: ["AEB", "LKA", "BLIND_SPOT_WARNING", "DRIVER_ATTENTION_WARNING", "ADAPTIVE_CRUISE_CONTROL", "REAR_CAMERA", "FRONT_REAR_PARK_SENSORS"],
  },
  {
    model: "A390", trim: "GT", url: "https://www.alpinecars.com.tr/elektrikli-modeler/a390/konfigurator.html", priceTry: 5_556_039,
    powerKw: 295, torqueNm: 661, rangeKm: 557, consumption: 18.7, batteryKwh: 89, maxDcChargeKw: 150, drivenWheels: "AWD",
    dimensions: { lengthMm: 4615, widthMm: 1885, heightMm: 1532, wheelbaseMm: 2708, luggageLitres: 532, seats: 5 },
    bodyStyle: "SUV", safety: ["AEB", "LKA", "BLIND_SPOT_WARNING", "DRIVER_ATTENTION_WARNING", "ADAPTIVE_CRUISE_CONTROL", "ECALL", "SURROUND_VIEW_CAMERA", "FRONT_REAR_PARK_SENSORS"],
  },
] as const;

function createRecord(input: (typeof candidates)[number]): PilotVehicleRecord {
  const identityKey = `${input.model}|2026|${input.trim}`;
  const id = deterministicAlpineUuid(`variant:${identityKey}`);
  const technical: ProvenanceRecord = { sourceId: "alpine-tr", sourceUrl: input.url, accessedAt: ACCESSED_AT, documentVersion: `Current Turkey configurator observed 2026-08-16`, extractionMethod: "DOCUMENT_IMPORT", confidence: "HIGH", limitations: ["Official Turkey-market public facts only", "Model year represents current 2026 Turkey catalog observation; configurator does not display an explicit MY label", "Manufacturer-reported battery capacity is not interpreted as gross or usable"] };
  const efficiency: ProvenanceRecord = { sourceId: "alpine-tr", sourceUrl: CONSUMPTION_URL, accessedAt: ACCESSED_AT, publishedAt: "2025-10-02T00:00:00.000Z", documentVersion: "Alpine_consumption_TR_v2", extractionMethod: "DOCUMENT_IMPORT", confidence: "HIGH", limitations: input.model === "A290" ? ["Official PDF lists GT Performance as 362 km; current exact configurator displays 361 km", "Current exact configurator value retained; conflict not silently merged"] : ["A390 is not included in the older consumption PDF; current exact configurator is authoritative"] };
  const priceSource: ProvenanceRecord = { sourceId: "alpine-tr", sourceUrl: input.url, accessedAt: ACCESSED_AT, publishedAt: PRICE_EFFECTIVE_FROM, documentVersion: "Current Turkey configurator price observation", extractionMethod: "DOCUMENT_IMPORT", confidence: "HIGH", limitations: ["Displayed configured/starting price may change without notice", "Price age is informational and does not invalidate recommendation filtering"] };
  const sourced = <T>(value: T, provenance: ProvenanceRecord = technical, confidence: "HIGH" | "MEDIUM" = "HIGH") => ({ value, provenance: [provenance] as [ProvenanceRecord], confidence });
  const identitySourced = <T>(value: T, confidence: "HIGH" | "MEDIUM" = "HIGH") => ({ value, provenance: [{ ...technical, limitations: [...technical.limitations] }], confidence });
  const range = input.model === "A290" ? { ...sourced(input.rangeKm, { ...efficiency, confidence: "MEDIUM" }, "MEDIUM"), conflictGroupId: "alpine-a290-gt-performance-wltp-range-2025-2026" } : sourced(input.rangeKm, technical);
  const dimensions = Object.fromEntries(Object.entries(input.dimensions).map(([key, value]) => [key, sourced(value)]));
  const variant: TurkeyVehicleVariant = {
    id, market: "TR", lifecycleStatus: "ON_SALE", brand: sourced("Alpine"), model: sourced(input.model), bodyStyle: sourced(input.bodyStyle), trim: sourced(input.trim), modelYear: sourced(2026, technical, "MEDIUM"),
    powertrain: { fuelType: sourced("BEV"), powerKw: sourced(input.powerKw), torqueNm: sourced(input.torqueNm), transmission: sourced("Single-speed automatic"), drivenWheels: sourced(input.drivenWheels) },
    dimensions: dimensions as TurkeyVehicleVariant["dimensions"],
    efficiency: { protocol: sourced("WLTP"), combinedKwhPer100Km: sourced(input.consumption), electricRangeKm: range, batteryCapacityKwh: sourced(input.batteryKwh), ...("maxDcChargeKw" in input ? { maxDcChargeKw: sourced(input.maxDcChargeKw) } : {}) },
    safetyFeatureCodes: input.safety.map((code) => sourced(code)), createdAt: ACCESSED_AT, updatedAt: ACCESSED_AT,
  };
  const price: PriceObservation = { id: deterministicAlpineUuid(`price:${identityKey}:LIST`), vehicleVariantId: id, market: "TR", condition: "NEW", amountTry: input.priceTry, priceType: "LIST", validFrom: PRICE_EFFECTIVE_FROM, sellerType: "DISTRIBUTOR", provenance: [priceSource], confidence: "HIGH" };
  return { identity: { id, market: "TR", lifecycleStatus: "ON_SALE", brand: identitySourced("Alpine"), model: identitySourced(input.model), bodyStyle: identitySourced(input.bodyStyle), trim: identitySourced(input.trim), modelYear: identitySourced(2026, "MEDIUM") }, prices: [price], technicalVariant: variant };
}

export const stagedAlpineBatch01Records: readonly PilotVehicleRecord[] = candidates.map(createRecord);
