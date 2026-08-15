import { createHash } from "node:crypto";

import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";
import type { PriceObservation, TurkeyVehicleVariant } from "@/types/productionVehicle";

const ACCESSED_AT = "2026-08-16T00:00:00.000Z";
const PRICE_URL = "https://www.hyundai.com/tr/tr/satis/fiyat-listesi.html";

const brochureSources = {
  i20: {
    url: "https://dmassets.hyundai.com/is/content/hyundaiautoever/i20-dijital-brosurpdf",
    version: "Hyundai i20 Türkiye broşürü, Temmuz 2026",
    hash: "f05136b7af94477fdb681767d0614ae2222e2923295eab0940982a2db4a700b7",
  },
  bayon: {
    url: "https://dmassets.hyundai.com/is/content/hyundaiautoever/bayon-digital-brosurpdf",
    version: "Hyundai BAYON Türkiye broşürü, Temmuz 2026",
    hash: "4e6ae482ce87b8551abe6f55a0faa76d19b96fab722d4cb2357886ed948769e3",
  },
  i30: {
    url: "https://dmassets.hyundai.com/is/content/hyundaiautoever/i30-digital-brosurpdf",
    version: "Hyundai i30 Türkiye broşürü, Mart 2026",
    hash: "ac31cfecee80fc0e7a2112ab7598a82ab5e9d5e441552d7f5e622ff6e079cfce",
  },
} as const;

type Family = keyof typeof brochureSources;

interface HyundaiStagedInput {
  readonly family: Family;
  readonly model: string;
  readonly bodyStyle: "Hatchback" | "SUV";
  readonly trim: string;
  readonly powertrainLabel: string;
  readonly transmission: "6-speed manual" | "7-speed dual-clutch automatic";
  readonly listPriceTry: number;
  readonly campaignPriceTry: number;
}

export function deterministicHyundaiUuid(value: string): string {
  const bytes = createHash("sha256").update(`expiya:hyundai-batch-01:${value}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function createHyundaiRecord(input: HyundaiStagedInput): PilotVehicleRecord {
  const brochure = brochureSources[input.family];
  const identityKey = `${input.model}|2026|${input.powertrainLabel}|${input.trim}`;
  const id = deterministicHyundaiUuid(`variant:${identityKey}`);
  const technicalProvenance = {
    sourceId: "hyundai-tr", sourceUrl: brochure.url, accessedAt: ACCESSED_AT,
    documentVersion: brochure.version, contentHash: `sha256:${brochure.hash}`,
    extractionMethod: "DOCUMENT_IMPORT" as const, confidence: "HIGH" as const,
    limitations: ["Official Turkey-market brochure facts", "Real-world consumption varies with use and conditions"],
  };
  const priceProvenance = {
    sourceId: "hyundai-tr", sourceUrl: PRICE_URL, accessedAt: ACCESSED_AT,
    documentVersion: "Hyundai Türkiye HppPriceListTR API observation, 2026-08-16",
    extractionMethod: "API" as const, confidence: "HIGH" as const,
    limitations: ["Observed distributor price; may change without notice", "Campaign price can depend on stock and dealer participation"],
  };
  const sourced = <T>(value: T) => ({ value, provenance: [technicalProvenance] as [typeof technicalProvenance], confidence: "HIGH" as const });

  const familyFacts = input.family === "i20" ? {
    engineDisplacementCc: 998, powerKw: 66, torqueNm: 172, consumption: 6.3,
    dimensions: { lengthMm: 4065, widthMm: 1775, heightMm: 1450, wheelbaseMm: 2580, luggageLitres: 352 },
    safety: ["ABS", "EBD", "BAS", "ESP", "TCS", "VSM", "HAC", "TPMS", "ESS", "MCB", "FRONT_AIRBAGS", "SIDE_CURTAIN_AIRBAGS", "REAR_CAMERA", "LFA", "LKA", "DAW", "HBA", "ISLA", "FCA"],
  } : input.family === "bayon" ? {
    engineDisplacementCc: 998, powerKw: 66, torqueNm: 172,
    consumption: input.transmission === "6-speed manual" ? 6.3 : 6.2,
    dimensions: { lengthMm: 4180, widthMm: 1775, heightMm: 1500, wheelbaseMm: 2580, luggageLitres: 411 },
    safety: ["ABS", "EBD", "BAS", "ESP", "VSM", "HAC", "TPMS", "ESS", "MCB", "FRONT_AIRBAGS", "SIDE_CURTAIN_AIRBAGS", "REAR_CAMERA"],
  } : {
    engineDisplacementCc: 1598, powerKw: 110.3, torqueNm: 250, consumption: 6.8,
    dimensions: { lengthMm: 4340, widthMm: 1795, heightMm: 1455, wheelbaseMm: 2650, luggageLitres: 395 },
    safety: ["ABS", "ESC", "TPMS", "HAC", "MCB", "FRONT_AIRBAGS", "SIDE_CURTAIN_AIRBAGS", "REAR_CAMERA", "LKA", "LFA", "DAW", "HBA", "LVDA", "ISLA", "FCA", "ICC"],
  };
  const conditionalSafety = [
    ...(input.trim.includes("GSR2C") ? ["ICC"] : []),
    ...(input.trim.includes("E-Call") ? ["ECALL"] : []),
  ];
  const safetyCodes = [...new Set([...familyFacts.safety, ...conditionalSafety])];
  const variant: TurkeyVehicleVariant = {
    id, market: "TR", lifecycleStatus: "ON_SALE", brand: sourced("Hyundai"), model: sourced(input.model),
    bodyStyle: sourced(input.bodyStyle), trim: sourced(`${input.powertrainLabel} ${input.trim}`), modelYear: sourced(2026),
    powertrain: {
      fuelType: sourced("GASOLINE"), engineDisplacementCc: sourced(familyFacts.engineDisplacementCc),
      powerKw: sourced(familyFacts.powerKw), torqueNm: sourced(familyFacts.torqueNm),
      transmission: sourced(input.transmission), drivenWheels: sourced("FWD"),
    },
    dimensions: Object.fromEntries(Object.entries(familyFacts.dimensions).map(([key, value]) => [key, sourced(value)])),
    efficiency: { protocol: sourced("WLTP"), combinedLitresPer100Km: sourced(familyFacts.consumption) },
    safetyFeatureCodes: safetyCodes.map(sourced), createdAt: ACCESSED_AT, updatedAt: ACCESSED_AT,
  } as TurkeyVehicleVariant;
  const price = (type: "LIST" | "CAMPAIGN", amountTry: number): PriceObservation => ({
    id: deterministicHyundaiUuid(`price:${identityKey}:${type}`), vehicleVariantId: id, market: "TR", condition: "NEW",
    amountTry, priceType: type, validFrom: ACCESSED_AT, sellerType: "DISTRIBUTOR",
    provenance: [priceProvenance], confidence: "HIGH",
  });
  const prices = [price("CAMPAIGN", input.campaignPriceTry), price("LIST", input.listPriceTry)];
  return {
    identity: { id, market: "TR", lifecycleStatus: "ON_SALE", brand: sourced("Hyundai"), model: sourced(input.model), bodyStyle: sourced(input.bodyStyle), trim: sourced(`${input.powertrainLabel} ${input.trim}`), modelYear: sourced(2026) },
    prices, technicalVariant: variant,
  };
}

const inputs: readonly HyundaiStagedInput[] = [
  ...[
    ["1.0 T-GDI 90PS MT", "Jump", "6-speed manual", 1487000, 1480000],
    ["1.0 T-GDI 90PS MT", "Jump (GSR2C & E-Call)", "6-speed manual", 1507000, 1500000],
    ["1.0 T-GDI 90PS DCT", "Jump", "7-speed dual-clutch automatic", 1654000, 1654000],
    ["1.0 T-GDI 90PS DCT", "Jump (GSR2C & E-Call)", "7-speed dual-clutch automatic", 1674000, 1674000],
    ["1.0 T-GDI 90PS DCT", "Style", "7-speed dual-clutch automatic", 1816000, 1686000],
    ["1.0 T-GDI 90PS DCT", "Style GSR2C", "7-speed dual-clutch automatic", 1831000, 1701000],
    ["1.0 T-GDI 90PS DCT", "Style (GSR2C & E-Call)", "7-speed dual-clutch automatic", 1831000, 1701000],
    ["1.0 T-GDI 90PS DCT", "Elite", "7-speed dual-clutch automatic", 1978000, 1805304],
    ["1.0 T-GDI 90PS DCT", "Elite GSR2C", "7-speed dual-clutch automatic", 1993000, 1819887],
    ["1.0 T-GDI 90PS DCT", "Elite (GSR2C & E-Call)", "7-speed dual-clutch automatic", 2003000, 1829610],
  ].map(([powertrainLabel, trim, transmission, listPriceTry, campaignPriceTry]) => ({ family: "i20" as const, model: "i20", bodyStyle: "Hatchback" as const, powertrainLabel, trim, transmission, listPriceTry, campaignPriceTry } as HyundaiStagedInput)),
  ...[
    ["1.0 T-GDI 90 PS DCT", "Jump", "7-speed dual-clutch automatic", 1647000, 1567000],
    ["1.0 T-GDI 90 PS MT", "Jump", "6-speed manual", 1587000, 1570000],
    ["1.0 T-GDI 90 PS DCT", "Jump (GSR2C & E-Call)", "7-speed dual-clutch automatic", 1667000, 1587000],
    ["1.0 T-GDI 90 PS DCT", "Style", "7-speed dual-clutch automatic", 1965000, 1770666],
    ["1.0 T-GDI 90 PS DCT", "Style GSR2C", "7-speed dual-clutch automatic", 1980000, 1785248],
    ["1.0 T-GDI 90 PS DCT", "Style (GSR2C & E-Call)", "7-speed dual-clutch automatic", 1980000, 1785248],
    ["1.0 T-GDI 90 PS DCT", "Elite", "7-speed dual-clutch automatic", 2103000, 1968000],
    ["1.0 T-GDI 90 PS DCT", "Elite GSR2C", "7-speed dual-clutch automatic", 2115000, 1980000],
    ["1.0 T-GDI 90 PS DCT", "Elite (GSR2C & E-Call)", "7-speed dual-clutch automatic", 2125000, 1990000],
  ].map(([powertrainLabel, trim, transmission, listPriceTry, campaignPriceTry]) => ({ family: "bayon" as const, model: "BAYON", bodyStyle: "SUV" as const, powertrainLabel, trim, transmission, listPriceTry, campaignPriceTry } as HyundaiStagedInput)),
  ...[
    ["Comfort", 1944000], ["Prime", 2250000],
  ].map(([trim, listPriceTry]) => ({ family: "i30" as const, model: "i30", bodyStyle: "Hatchback" as const, powertrainLabel: "1.6 T-GDI 150 PS DCT", trim, transmission: "7-speed dual-clutch automatic", listPriceTry, campaignPriceTry: listPriceTry } as HyundaiStagedInput)),
];

export const stagedHyundaiBatch01Records: readonly PilotVehicleRecord[] = inputs.map(createHyundaiRecord);
