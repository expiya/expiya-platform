import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";
import type { PriceObservation, ProductionFuelType, TurkeyVehicleVariant } from "@/types/productionVehicle";

const accessedAt = "2026-08-14T20:00:00.000Z";

interface StagedVariantInput {
  readonly id: string;
  readonly priceId: string;
  readonly sourceId: string;
  readonly priceSourceUrl: string;
  readonly technicalSourceUrl: string;
  readonly documentVersion: string;
  readonly brand: string;
  readonly model: string;
  readonly bodyStyle: string;
  readonly trim: string;
  readonly priceTry: number;
  readonly fuelType: ProductionFuelType;
  readonly engineDisplacementCc?: number;
  readonly powerKw: number;
  readonly torqueNm?: number;
  readonly transmission: string;
  readonly drivenWheels: string;
  readonly dimensions?: TurkeyVehicleVariant["dimensions"];
  readonly combinedLitresPer100Km?: number;
  readonly safetyFeatureCodes: readonly string[];
}

function createStagedVariant(input: StagedVariantInput): PilotVehicleRecord {
  const technicalProvenance = {
    sourceId: input.sourceId,
    sourceUrl: input.technicalSourceUrl,
    accessedAt,
    documentVersion: input.documentVersion,
    extractionMethod: "MANUAL" as const,
    confidence: "HIGH" as const,
    limitations: ["Public Turkey-market facts captured manually", "Prices are non-binding and may change without notice"],
  };
  const priceProvenance = {
    ...technicalProvenance,
    sourceUrl: input.priceSourceUrl,
    documentVersion: `${input.documentVersion}; price observation`,
  };
  const sourced = <T>(value: T) => ({ value, provenance: [technicalProvenance] as [typeof technicalProvenance], confidence: "HIGH" as const });
  const price: PriceObservation = {
    id: input.priceId,
    vehicleVariantId: input.id,
    market: "TR",
    condition: "NEW",
    amountTry: input.priceTry,
    priceType: "LIST",
    validFrom: "2026-08-14T00:00:00.000Z",
    sellerType: "DISTRIBUTOR",
    provenance: [priceProvenance],
    confidence: "HIGH",
  };
  const variant: TurkeyVehicleVariant = {
    id: input.id,
    market: "TR",
    lifecycleStatus: "ON_SALE",
    brand: sourced(input.brand),
    model: sourced(input.model),
    bodyStyle: sourced(input.bodyStyle),
    trim: sourced(input.trim),
    modelYear: sourced(2026),
    powertrain: {
      fuelType: sourced(input.fuelType),
      ...(input.engineDisplacementCc === undefined ? {} : { engineDisplacementCc: sourced(input.engineDisplacementCc) }),
      powerKw: sourced(input.powerKw),
      ...(input.torqueNm === undefined ? {} : { torqueNm: sourced(input.torqueNm) }),
      transmission: sourced(input.transmission),
      drivenWheels: sourced(input.drivenWheels),
    },
    dimensions: input.dimensions ?? {},
    efficiency: input.combinedLitresPer100Km === undefined ? {} : {
      protocol: sourced("WLTP"),
      combinedLitresPer100Km: sourced(input.combinedLitresPer100Km),
    },
    safetyFeatureCodes: input.safetyFeatureCodes.map(sourced),
    createdAt: accessedAt,
    updatedAt: accessedAt,
  };
  return {
    identity: {
      id: input.id,
      market: "TR",
      lifecycleStatus: "ON_SALE",
      brand: sourced(input.brand),
      model: sourced(input.model),
      bodyStyle: sourced(input.bodyStyle),
      trim: sourced(input.trim),
      modelYear: sourced(2026),
    },
    prices: [price],
    technicalVariant: variant,
  };
}

export const stagedCatalogBatch01Records: readonly PilotVehicleRecord[] = [
  createStagedVariant({
    id: "e3248126-f374-44ff-9dbe-5378ab308a02",
    priceId: "3b8ca86d-91ea-4bcd-ad93-41d679bc3b05",
    sourceId: "toyota-tr",
    priceSourceUrl: "https://turkiye.toyota.com.tr/middle/fiyat-listesi/?v=1.0.24",
    technicalSourceUrl: "https://www.toyota.com.tr/araba-modelleri/yaris-cross",
    documentVersion: "Toyota Türkiye price list effective 2026-08-01 and Yaris Cross MY26 specification",
    brand: "Toyota", model: "Yaris Cross", bodyStyle: "SUV", trim: "Hybrid Dream 1.5 130 HP e-CVT",
    priceTry: 2_704_000, fuelType: "HEV", engineDisplacementCc: 1490, powerKw: 96,
    torqueNm: 120, transmission: "e-CVT automatic", drivenWheels: "FWD",
    dimensions: {}, combinedLitresPer100Km: 4.6,
    safetyFeatureCodes: ["TSS3", "PCS", "ACC", "LTA", "ABS", "VSC", "TPWS", "HAC", "ECALL", "ISOFIX"],
  }),
  createStagedVariant({
    id: "01a559dd-917f-4f49-a4cf-84fe78e9de40",
    priceId: "7fa7adeb-c397-41f4-bc60-64f5e154f544",
    sourceId: "opel-tr",
    priceSourceUrl: "https://fiyatlisteleri.opel.com.tr/tum-araclar",
    technicalSourceUrl: "https://www.opel.com.tr/araclar/corsa/genel-bakis.html",
    documentVersion: "Opel Türkiye live MY26 price and equipment list, reviewed 2026-08-14",
    brand: "Opel", model: "Corsa", bodyStyle: "Hatchback", trim: "Hybrid 1.2 145 (136 HP) GS",
    priceTry: 2_119_000, fuelType: "MHEV", powerKw: 100,
    transmission: "6-speed e-DCT automatic", drivenWheels: "FWD",
    safetyFeatureCodes: ["AEB", "LKA", "DRIVER_ATTENTION_WARNING", "TRAFFIC_SIGN_RECOGNITION", "ISOFIX"],
  }),
  createStagedVariant({
    id: "06d935f4-6d33-4bc7-9e89-375b8db885df",
    priceId: "e2ff9c0b-fab2-4d96-a36f-c47f6649591b",
    sourceId: "bmw-tr",
    priceSourceUrl: "https://borusanoto.bmw.com.tr/fiyat-listesi/bmw-m-serisi",
    technicalSourceUrl: "https://www.bmw.com.tr/tr/all-models/3-series/sedan/bmw-3-serisi-sedan.html",
    documentVersion: "BMW Türkiye current 2026 retail maximum price list, reviewed 2026-08-14",
    brand: "BMW", model: "320i Sedan", bodyStyle: "Sedan", trim: "M Sport",
    priceTry: 6_119_800, fuelType: "GASOLINE", engineDisplacementCc: 1597, powerKw: 125,
    torqueNm: 250, transmission: "Automatic", drivenWheels: "RWD", combinedLitresPer100Km: 7.6,
    safetyFeatureCodes: ["ABS", "DSC", "FRONT_AIRBAGS", "SIDE_CURTAIN_AIRBAGS", "ISOFIX"],
  }),
];
