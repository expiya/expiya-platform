import type { PriceObservation, ProvenanceRecord, TurkeyVehicleVariant } from "@/types/productionVehicle";
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

const technicalSource = (sourceId: string, sourceUrl: string, documentVersion: string): ProvenanceRecord => ({
  sourceId, sourceUrl, accessedAt: "2026-08-13T00:00:00.000Z",
  documentVersion, extractionMethod: "DOCUMENT_IMPORT", confidence: "HIGH",
  limitations: ["Manufacturer values; real-world results vary with conditions and driving style"],
});

const technical = <T>(value: T, provenance: ProvenanceRecord) => ({
  value, provenance: [provenance] as [ProvenanceRecord], confidence: "HIGH" as const,
});

const identityTechnical = <T>(value: T, provenance: ProvenanceRecord) => ({
  value,
  provenance: [{ ...provenance, limitations: [...provenance.limitations] }],
  confidence: "HIGH" as const,
});

const derivedTechnical = <T>(value: T, provenance: ProvenanceRecord, limitation: string) => ({
  value,
  provenance: [{ ...provenance, confidence: "MEDIUM" as const, limitations: [...provenance.limitations, limitation] }] as [ProvenanceRecord],
  confidence: "MEDIUM" as const,
});

export interface PilotVehicleRecord {
  readonly identity: ProductionVehicleIdentity;
  readonly prices: readonly PriceObservation[];
  readonly technicalVariant?: TurkeyVehicleVariant;
}

interface CorollaPilotInput {
  readonly id: string;
  readonly campaignPriceId: string;
  readonly listPriceId: string;
  readonly trim: string;
  readonly fuelType: "GASOLINE" | "HEV";
  readonly powerPs: number;
  readonly powerKw: number;
  readonly combinedLitresPer100Km: number;
  readonly campaignPriceTry: number;
  readonly listPriceTry: number;
}

function createCorollaPilotRecord(input: CorollaPilotInput): PilotVehicleRecord {
  const modelUrl = "https://www.toyota.com.tr/araba-modelleri/corolla-sedan";
  const identitySource = technicalSource("toyota-tr", modelUrl, `Corolla ${input.trim} live model page, accessed 2026-08-13`);
  const priceSource: ProvenanceRecord = {
    sourceId: "toyota-tr", sourceUrl: modelUrl, accessedAt: "2026-08-13T00:00:00.000Z",
    documentVersion: "Corolla campaign, 01–31 August 2026", extractionMethod: "MANUAL", confidence: "HIGH",
    limitations: ["Observed on the public model page on 2026-08-13", "Price is non-binding and stock/dealer dependent"],
  };

  return {
    identity: {
      id: input.id, market: "TR", lifecycleStatus: "ON_SALE",
      brand: identityTechnical("Toyota", identitySource), model: identityTechnical("Corolla", identitySource),
      bodyStyle: identityTechnical("Sedan", identitySource), trim: identityTechnical(input.trim, identitySource),
      modelYear: identityTechnical(2026, identitySource),
    },
    prices: [{
      id: input.campaignPriceId, vehicleVariantId: input.id, market: "TR", condition: "NEW",
      amountTry: input.campaignPriceTry, priceType: "CAMPAIGN", validFrom: "2026-08-01T00:00:00.000Z",
      validUntil: "2026-08-31T23:59:59.999Z", sellerType: "DISTRIBUTOR", provenance: [priceSource], confidence: "HIGH",
    }, {
      id: input.listPriceId, vehicleVariantId: input.id, market: "TR", condition: "NEW",
      amountTry: input.listPriceTry, priceType: "LIST", validFrom: "2026-08-01T00:00:00.000Z",
      sellerType: "DISTRIBUTOR", provenance: [priceSource], confidence: "HIGH",
    }],
    technicalVariant: {
      id: input.id, market: "TR", lifecycleStatus: "ON_SALE",
      brand: technical("Toyota", identitySource), model: technical("Corolla", identitySource),
      bodyStyle: technical("Sedan", identitySource), trim: technical(input.trim, identitySource),
      modelYear: technical(2026, identitySource),
      powertrain: {
        fuelType: technical(input.fuelType, identitySource),
        powerKw: derivedTechnical(input.powerKw, identitySource, `Converted from the published ${input.powerPs} PS using 1 PS = 0.73549875 kW`),
        transmission: technical(input.fuelType === "HEV" ? "e-CVT automatic" : "Multidrive S automatic", identitySource),
        drivenWheels: technical("FWD", identitySource),
      },
      dimensions: {},
      efficiency: {
        protocol: technical("WLTP", identitySource),
        combinedLitresPer100Km: technical(input.combinedLitresPer100Km, identitySource),
      },
      safetyFeatureCodes: [technical("TSS3", identitySource)],
      createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z",
    },
  };
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
    technicalVariant: (() => {
      const source = technicalSource("hyundai-tr",
        "https://www.hyundai.com/content/dam/hyundai/tr/tr/data/marketing/brochure/product/yeni-tucson-fl/Yeni-Tucson-Facelift-Brosur-New.pdf",
        "Yeni TUCSON Facelift Türkiye brochure, current download verified 2026-08-13",
      );
      return {
        id: "5d3538b1-c726-44f5-8160-41a64d33eb8e", market: "TR", lifecycleStatus: "ON_SALE",
        brand: technical("Hyundai", source), model: technical("TUCSON", source),
        bodyStyle: technical("SUV", source), trim: technical("1.6 T-GDI Comfort 4X2 DCT", source),
        modelYear: technical(2026, source),
        powertrain: {
          fuelType: technical("GASOLINE" as const, source), engineDisplacementCc: technical(1598, source),
          powerKw: derivedTechnical(117.7, source, "Converted from the published 160 PS using 1 PS = 0.73549875 kW"),
          torqueNm: technical(265, source), transmission: technical("7-speed dual-clutch automatic", source),
          drivenWheels: technical("FWD", source),
        },
        dimensions: {
          lengthMm: technical(4510, source), widthMm: technical(1865, source),
          heightMm: technical(1650, source), wheelbaseMm: technical(2680, source),
          luggageLitres: technical(620, source),
        },
        efficiency: {
          protocol: technical("WLTP" as const, source), combinedLitresPer100Km: technical(7.0, source),
        },
        safetyFeatureCodes: ["ABS", "ESC", "TPMS", "HAC", "DBC", "MCB", "FRONT_AIRBAGS", "SIDE_CURTAIN_AIRBAGS", "REAR_CAMERA"]
          .map((code) => technical(code, source)),
        createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z",
      } satisfies TurkeyVehicleVariant;
    })(),
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
    technicalVariant: (() => {
      const source = technicalSource("hyundai-tr",
        "https://www.hyundai.com/content/dam/hyundai/downloads/tr/tr/brosurler/ioniq5-digital-brosur.pdf",
        "IONIQ 5 Türkiye digital brochure, accessed 2026-08-13",
      );
      return {
        id: "87e30119-f0d5-4c98-8324-cbd65156974b", market: "TR", lifecycleStatus: "ON_SALE",
        brand: technical("Hyundai", source), model: technical("IONIQ 5", source),
        bodyStyle: technical("SUV", source), trim: technical("Dynamic Vision Roof 125 kW 4X2", source),
        modelYear: technical(2026, source),
        powertrain: {
          fuelType: technical("BEV" as const, source), powerKw: technical(125, source),
          torqueNm: technical(350, source), transmission: technical("Single-speed reduction gear", source),
          drivenWheels: technical("RWD", source),
        },
        dimensions: {},
        efficiency: {
          protocol: technical("WLTP" as const, source), batteryCapacityKwh: technical(63, source),
          electricRangeKm: technical(440, source),
        },
        safetyFeatureCodes: ["AEB", "LKA", "LFA", "BCA", "RCCA", "SCC", "TPMS", "ECALL"]
          .map((code) => technical(code, source)),
        createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z",
      } satisfies TurkeyVehicleVariant;
    })(),
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
    technicalVariant: (() => {
      const source = technicalSource("hyundai-tr",
        "https://www.hyundai.com/content/dam/hyundai/downloads/tr/tr/brosurler/ioniq9-digital-brosur.pdf",
        "IONIQ 9 Türkiye digital brochure, accessed 2026-08-13",
      );
      return {
        id: "a3728e65-51b2-447f-a6c3-a1f64db8a310", market: "TR", lifecycleStatus: "ON_SALE",
        brand: technical("Hyundai", source), model: technical("IONIQ 9", source),
        bodyStyle: technical("SUV", source), trim: technical("Progressive 160 kW 4X2", source),
        modelYear: technical(2026, source),
        powertrain: {
          fuelType: technical("BEV" as const, source), powerKw: technical(160, source),
          torqueNm: technical(350, source), transmission: technical("Single-speed reduction gear", source),
          drivenWheels: technical("RWD", source),
        },
        dimensions: {
          lengthMm: technical(5060, source), widthMm: technical(1980, source),
          heightMm: technical(1790, source), wheelbaseMm: technical(3130, source),
          luggageLitres: technical(338, source),
        },
        efficiency: {
          protocol: technical("WLTP" as const, source), combinedKwhPer100Km: technical(19.9, source),
          electricRangeKm: technical(620, source), batteryCapacityKwh: technical(110.3, source),
          maxDcChargeKw: technical(350, source),
        },
        safetyFeatureCodes: ["ABS", "ESC", "TPMS", "MCB", "SVM", "SEA", "SCC", "LKA", "LFA", "FCA", "BCA", "RCCA", "ECALL"]
          .map((code) => technical(code, source)),
        createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z",
      } satisfies TurkeyVehicleVariant;
    })(),
  },
  {
    identity: (() => {
      const source = technicalSource(
        "toyota-tr",
        "https://www.toyota.com.tr/araba-modelleri/yaris/olustur",
        "Yaris Flame Hybrid live configurator, accessed 2026-08-13",
      );
      return {
        id: "c8d535d0-6c04-4dcb-8cf6-2bad5bd037e8", market: "TR", lifecycleStatus: "ON_SALE",
        brand: identityTechnical("Toyota", source), model: identityTechnical("Yaris", source),
        bodyStyle: identityTechnical("Hatchback", source), trim: identityTechnical("Flame Hybrid 1.5 116 HP e-CVT", source),
        modelYear: identityTechnical(2026, source),
      } satisfies ProductionVehicleIdentity;
    })(),
    prices: (() => {
      const source: ProvenanceRecord = {
        sourceId: "toyota-tr", sourceUrl: "https://www.toyota.com.tr/araba-modelleri/yaris/olustur",
        accessedAt: "2026-08-13T00:00:00.000Z", documentVersion: "Yaris Hybrid campaign, 01–31 August 2026",
        extractionMethod: "MANUAL", confidence: "HIGH",
        limitations: ["Observed on the public model page on 2026-08-13", "Price is non-binding and stock/dealer dependent"],
      };
      return [{
        id: "a177947a-eacd-4a71-8fcf-4ae96d42aa16", vehicleVariantId: "c8d535d0-6c04-4dcb-8cf6-2bad5bd037e8",
        market: "TR" as const, condition: "NEW" as const, amountTry: 1_995_000, priceType: "CAMPAIGN" as const,
        validFrom: "2026-08-01T00:00:00.000Z", validUntil: "2026-08-31T23:59:59.999Z",
        sellerType: "DISTRIBUTOR" as const, provenance: [source] as [ProvenanceRecord], confidence: "HIGH" as const,
      }, {
        id: "06cf2a96-64f0-49ad-81a2-e37316c17bb9", vehicleVariantId: "c8d535d0-6c04-4dcb-8cf6-2bad5bd037e8",
        market: "TR" as const, condition: "NEW" as const, amountTry: 2_245_000, priceType: "LIST" as const,
        validFrom: "2026-08-01T00:00:00.000Z", sellerType: "DISTRIBUTOR" as const,
        provenance: [source] as [ProvenanceRecord], confidence: "HIGH" as const,
      }];
    })(),
    technicalVariant: (() => {
      const source = technicalSource(
        "toyota-tr",
        "https://turkiye.toyota.com.tr/middle/Toyota_Yaris_Teknik_%C3%96zellikler_Fiyatl%C4%B1_%2801.06.2026%29.pdf",
        "Yaris Hybrid Türkiye technical and equipment PDF, June 2026",
      );
      return {
        id: "c8d535d0-6c04-4dcb-8cf6-2bad5bd037e8", market: "TR", lifecycleStatus: "ON_SALE",
        brand: technical("Toyota", source), model: technical("Yaris", source),
        bodyStyle: technical("Hatchback", source), trim: technical("Flame Hybrid 1.5 116 HP e-CVT", source),
        modelYear: technical(2026, source),
        powertrain: {
          fuelType: technical("HEV" as const, source), engineDisplacementCc: technical(1490, source),
          powerKw: technical(85, source),
          transmission: technical("e-CVT automatic", source), drivenWheels: technical("FWD", source),
        },
        dimensions: {
          lengthMm: technical(3940, source), widthMm: technical(1745, source),
          heightMm: technical(1500, source), wheelbaseMm: technical(2560, source),
          luggageLitres: technical(286, source),
        },
        efficiency: {
          protocol: technical("WLTP" as const, source),
          combinedLitresPer100Km: {
            value: 3.9,
            provenance: [source, {
              ...source,
              sourceUrl: "https://www.toyota.com.tr/araba-modelleri/yaris/olustur",
              documentVersion: "Yaris Flame Hybrid live configurator, accessed 2026-08-13",
              confidence: "MEDIUM",
              limitations: ["Live configurator displayed 3.8 l/100 km; retained as an unresolved conflicting observation"],
            }],
            confidence: "MEDIUM",
            conflictGroupId: "toyota-yaris-flame-2026-wltp-combined",
          },
        },
        safetyFeatureCodes: ["TSS3", "PCS", "ESA", "ACC", "LTA", "ABS", "VSC", "TPWS", "HAC", "ECALL", "ISOFIX"]
          .map((code) => technical(code, source)),
        createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z",
      } satisfies TurkeyVehicleVariant;
    })(),
  },
  {
    identity: (() => {
      const source = technicalSource(
        "toyota-tr",
        "https://www.toyota.com.tr/araba-modelleri/yaris",
        "Yaris Passion X-Pack Hybrid live model page, accessed 2026-08-13",
      );
      return {
        id: "4c22cb31-e980-4dc8-8525-c47363783d96", market: "TR", lifecycleStatus: "ON_SALE",
        brand: identityTechnical("Toyota", source), model: identityTechnical("Yaris", source),
        bodyStyle: identityTechnical("Hatchback", source), trim: identityTechnical("Passion X-Pack Hybrid 1.5 130 HP e-CVT", source),
        modelYear: identityTechnical(2026, source),
      } satisfies ProductionVehicleIdentity;
    })(),
    prices: (() => {
      const source: ProvenanceRecord = {
        sourceId: "toyota-tr", sourceUrl: "https://www.toyota.com.tr/araba-modelleri/yaris",
        accessedAt: "2026-08-13T00:00:00.000Z", documentVersion: "Yaris Hybrid campaign, 01–31 August 2026",
        extractionMethod: "MANUAL", confidence: "HIGH",
        limitations: ["Observed on the public model page on 2026-08-13", "Price is non-binding and stock/dealer dependent"],
      };
      return [{
        id: "e0c84d42-3be8-4fa5-a95c-35992c6836fc", vehicleVariantId: "4c22cb31-e980-4dc8-8525-c47363783d96",
        market: "TR" as const, condition: "NEW" as const, amountTry: 2_365_000, priceType: "CAMPAIGN" as const,
        validFrom: "2026-08-01T00:00:00.000Z", validUntil: "2026-08-31T23:59:59.999Z",
        sellerType: "DISTRIBUTOR" as const, provenance: [source] as [ProvenanceRecord], confidence: "HIGH" as const,
      }, {
        id: "a19d954e-d2b2-44a7-8dd4-c34ecbb91eed", vehicleVariantId: "4c22cb31-e980-4dc8-8525-c47363783d96",
        market: "TR" as const, condition: "NEW" as const, amountTry: 2_640_000, priceType: "LIST" as const,
        validFrom: "2026-08-01T00:00:00.000Z", sellerType: "DISTRIBUTOR" as const,
        provenance: [source] as [ProvenanceRecord], confidence: "HIGH" as const,
      }];
    })(),
    technicalVariant: (() => {
      const source = technicalSource(
        "toyota-tr",
        "https://turkiye.toyota.com.tr/middle/Toyota_Yaris_Teknik_%C3%96zellikler_Fiyatl%C4%B1_%2801.06.2026%29.pdf",
        "Yaris Hybrid Türkiye technical and equipment PDF, June 2026",
      );
      return {
        id: "4c22cb31-e980-4dc8-8525-c47363783d96", market: "TR", lifecycleStatus: "ON_SALE",
        brand: technical("Toyota", source), model: technical("Yaris", source),
        bodyStyle: technical("Hatchback", source), trim: technical("Passion X-Pack Hybrid 1.5 130 HP e-CVT", source),
        modelYear: technical(2026, source),
        powertrain: {
          fuelType: technical("HEV" as const, source), engineDisplacementCc: technical(1490, source),
          powerKw: technical(96, source), transmission: technical("e-CVT automatic", source),
          drivenWheels: technical("FWD", source),
        },
        dimensions: {
          lengthMm: technical(3940, source), widthMm: technical(1745, source),
          heightMm: technical(1500, source), wheelbaseMm: technical(2560, source),
          luggageLitres: technical(286, source),
        },
        efficiency: {
          protocol: technical("WLTP" as const, source), combinedLitresPer100Km: technical(3.9, source),
        },
        safetyFeatureCodes: ["TSS3", "PCS", "ESA", "ACC", "LTA", "ABS", "VSC", "TPWS", "HAC", "ECALL", "ISOFIX"]
          .map((code) => technical(code, source)),
        createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z",
      } satisfies TurkeyVehicleVariant;
    })(),
  },
  createCorollaPilotRecord({
    id: "8af2278c-4168-4a1b-a915-6b72b9cd6f48",
    campaignPriceId: "43f01ddd-7eb8-4816-bfb2-93dc87798743",
    listPriceId: "59a9b19c-2596-4457-95b6-798957264c06",
    trim: "Vision Plus 1.5 125 HP Multidrive S",
    fuelType: "GASOLINE", powerPs: 125, powerKw: 91.9,
    combinedLitresPer100Km: 6.3, campaignPriceTry: 1_850_000, listPriceTry: 2_284_000,
  }),
  createCorollaPilotRecord({
    id: "db2d6503-f10f-41a4-ad11-b2ca71e59d32",
    campaignPriceId: "d857cf51-61fe-49b0-9861-eaefbaff6848",
    listPriceId: "4c591bed-15bc-4bac-bf85-dcbecc25e63b",
    trim: "Flame X-Pack Hybrid 1.8 140 HP e-CVT",
    fuelType: "HEV", powerPs: 140, powerKw: 103,
    combinedLitresPer100Km: 4.7, campaignPriceTry: 2_500_000, listPriceTry: 3_228_000,
  }),
];
