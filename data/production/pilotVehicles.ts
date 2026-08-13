import type { PriceObservation } from "@/types/productionVehicle";
import type { ProductionVehicleIdentity } from "@/features/vehicle-data/validateProductionVehicle";

const hyundaiAugust2026 = {
  sourceId: "hyundai-tr",
  sourceUrl: "https://www.hyundai.com/tr/tr/satis/fiyat-listesi.html",
  accessedAt: "2026-08-13T00:00:00.000Z",
  publishedAt: "2026-08-05T00:00:00.000Z",
  documentVersion: "2026-08 campaign",
  extractionMethod: "MANUAL" as const,
  confidence: "HIGH" as const,
  limitations: ["Prices may change without notice", "Campaigns are stock-limited and participating-dealer dependent"],
};

const sourced = <T>(value: T) => ({
  value,
  provenance: [hyundaiAugust2026] as [typeof hyundaiAugust2026],
  confidence: "HIGH" as const,
});

export interface PilotVehicleRecord {
  readonly identity: ProductionVehicleIdentity;
  readonly prices: readonly PriceObservation[];
}

export const pilotVehicleRecords: readonly PilotVehicleRecord[] = [
  {
    identity: {
      id: "5d3538b1-c726-44f5-8160-41a64d33eb8e", market: "TR", lifecycleStatus: "ON_SALE",
      brand: sourced("Hyundai"), model: sourced("TUCSON"), bodyStyle: sourced("SUV"),
      trim: sourced("1.6 T-GDI Comfort 4X2 DCT"), modelYear: sourced(2026),
    },
    prices: [{
      id: "c0c9332d-6668-4718-9f08-5d64e4245735", vehicleVariantId: "5d3538b1-c726-44f5-8160-41a64d33eb8e",
      market: "TR", condition: "NEW", amountTry: 2_386_974, priceType: "CAMPAIGN",
      validFrom: "2026-08-05T00:00:00.000Z", validUntil: "2026-08-31T23:59:59.999Z",
      sellerType: "DISTRIBUTOR", provenance: [hyundaiAugust2026], confidence: "HIGH",
    }],
  },
  {
    identity: {
      id: "87e30119-f0d5-4c98-8324-cbd65156974b", market: "TR", lifecycleStatus: "ON_SALE",
      brand: sourced("Hyundai"), model: sourced("IONIQ 5"), bodyStyle: sourced("SUV"),
      trim: sourced("Dynamic Vision Roof 125 kW 4X2"), modelYear: sourced(2026),
    },
    prices: [{
      id: "f46deaae-c0b6-494c-90e5-fc7681f3f17a", vehicleVariantId: "87e30119-f0d5-4c98-8324-cbd65156974b",
      market: "TR", condition: "NEW", amountTry: 2_484_602, priceType: "CAMPAIGN",
      validFrom: "2026-08-05T00:00:00.000Z", validUntil: "2026-08-31T23:59:59.999Z",
      sellerType: "DISTRIBUTOR", provenance: [hyundaiAugust2026], confidence: "HIGH",
    }],
  },
  {
    identity: {
      id: "a3728e65-51b2-447f-a6c3-a1f64db8a310", market: "TR", lifecycleStatus: "ON_SALE",
      brand: sourced("Hyundai"), model: sourced("IONIQ 9"), bodyStyle: sourced("SUV"),
      trim: sourced("Progressive 160 kW 4X2"), modelYear: sourced(2026),
    },
    prices: [{
      id: "1e2a2a53-f62f-4138-be08-e84f75c6ec02", vehicleVariantId: "a3728e65-51b2-447f-a6c3-a1f64db8a310",
      market: "TR", condition: "NEW", amountTry: 5_810_000, priceType: "CAMPAIGN",
      validFrom: "2026-08-05T00:00:00.000Z", validUntil: "2026-08-31T23:59:59.999Z",
      sellerType: "DISTRIBUTOR", provenance: [hyundaiAugust2026], confidence: "HIGH",
    }],
  },
];
