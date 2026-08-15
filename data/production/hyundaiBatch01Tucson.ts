import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";
import { deterministicHyundaiUuid } from "@/data/production/hyundaiBatch01";
import type { PriceObservation, ProductionFuelType, TurkeyVehicleVariant } from "@/types/productionVehicle";

const ACCESSED_AT = "2026-08-16T00:00:00.000Z";
const PRICE_URL = "https://www.hyundai.com/tr/tr/satis/fiyat-listesi.html";
const BROCHURE_URL = "https://dmassets.hyundai.com/is/content/hyundaiautoever/tucson-digital-brosurpdf";
const BROCHURE_HASH = "cb7130e4a11ea2578f4f4b1d355c408320da4c12ea8ac4ea9ae7566968d073d9";

export const CORRECTED_TUCSON_VARIANT_ID = "5d3538b1-c726-44f5-8160-41a64d33eb8e";
export const TUCSON_FACT_SUPERSESSION_REASON = "Current April 2026 Turkey brochure and current price API identify the same Comfort configuration as 180 PS; its former 160 PS assertion is superseded while the stable vehicle identity is retained.";

interface TucsonInput {
  readonly model: "TUCSON" | "TUCSON Hibrit"; readonly modelYear: 2025 | 2026;
  readonly powertrainLabel: string; readonly trim: string; readonly listPriceTry: number; readonly campaignPriceTry: number;
  readonly fuelType: ProductionFuelType; readonly powerKw: number; readonly torqueNm: number; readonly transmission: string;
  readonly drivenWheels: "FWD" | "AWD"; readonly combinedLitresPer100Km: number; readonly lengthMm: number; readonly luggageLitres: number;
}

const candidates: readonly TucsonInput[] = [
  { model: "TUCSON", modelYear: 2026, powertrainLabel: "1.6 T-GDI 180 PS 4x2 DCT", trim: "Comfort", listPriceTry: 2577000, campaignPriceTry: 2386974, fuelType: "GASOLINE", powerKw: 132.4, torqueNm: 265, transmission: "7-speed dual-clutch automatic", drivenWheels: "FWD", combinedLitresPer100Km: 7.6, lengthMm: 4525, luggageLitres: 620 },
  { model: "TUCSON", modelYear: 2026, powertrainLabel: "1.6 T-GDI 180 PS 4x2 DCT", trim: "Prime", listPriceTry: 2771000, campaignPriceTry: 2679000, fuelType: "GASOLINE", powerKw: 132.4, torqueNm: 265, transmission: "7-speed dual-clutch automatic", drivenWheels: "FWD", combinedLitresPer100Km: 7.6, lengthMm: 4525, luggageLitres: 620 },
  { model: "TUCSON", modelYear: 2026, powertrainLabel: "1.6 T-GDI 180 PS 4x2 DCT", trim: "Elite", listPriceTry: 3378000, campaignPriceTry: 3248000, fuelType: "GASOLINE", powerKw: 132.4, torqueNm: 265, transmission: "7-speed dual-clutch automatic", drivenWheels: "FWD", combinedLitresPer100Km: 7.6, lengthMm: 4525, luggageLitres: 620 },
  { model: "TUCSON", modelYear: 2026, powertrainLabel: "1.6 T-GDI 180 PS 4x4 DCT", trim: "Elite Plus", listPriceTry: 3715000, campaignPriceTry: 3585000, fuelType: "GASOLINE", powerKw: 132.4, torqueNm: 265, transmission: "7-speed dual-clutch automatic", drivenWheels: "AWD", combinedLitresPer100Km: 7.9, lengthMm: 4525, luggageLitres: 620 },
  { model: "TUCSON", modelYear: 2026, powertrainLabel: "1.6 CRDi 136 PS 4x4 DCT", trim: "Comfort Sunroof", listPriceTry: 2679000, campaignPriceTry: 2679000, fuelType: "DIESEL", powerKw: 100, torqueNm: 320, transmission: "7-speed dual-clutch automatic", drivenWheels: "AWD", combinedLitresPer100Km: 6.3, lengthMm: 4525, luggageLitres: 598 },
  { model: "TUCSON Hibrit", modelYear: 2025, powertrainLabel: "1.6 T-GDI 215 PS HEV 4x2 AT", trim: "Elite", listPriceTry: 3720000, campaignPriceTry: 3720000, fuelType: "HEV", powerKw: 158, torqueNm: 367, transmission: "6-speed automatic", drivenWheels: "FWD", combinedLitresPer100Km: 6.0, lengthMm: 4510, luggageLitres: 616 },
];

const safety = ["ABS", "EBD", "ESC", "TPMS", "HAC", "DBC", "MCB", "FRONT_AIRBAGS", "SIDE_CURTAIN_AIRBAGS", "REAR_CAMERA", "LKA", "LFA", "DAW", "HBA", "LVDA", "ISLA", "FCA", "ECALL"] as const;

function createRecord(input: TucsonInput): PilotVehicleRecord {
  const key = `${input.model}|${input.modelYear}|${input.powertrainLabel}|${input.trim}`;
  const id = input.model === "TUCSON" && input.modelYear === 2026 && input.trim === "Comfort"
    ? CORRECTED_TUCSON_VARIANT_ID : deterministicHyundaiUuid(`variant:${key}`);
  const technical = { sourceId: "hyundai-tr", sourceUrl: BROCHURE_URL, accessedAt: ACCESSED_AT, documentVersion: "Hyundai TUCSON Türkiye broşürü, Nisan 2026", contentHash: `sha256:${BROCHURE_HASH}`, extractionMethod: "DOCUMENT_IMPORT" as const, confidence: "HIGH" as const, limitations: ["Official Turkey-market brochure facts", "180 PS and 136 PS values converted deterministically to kW", ...(input.modelYear === 2025 ? ["MY2025 hybrid identity is independently present in the current official price API"] : [])] };
  const priceSource = { sourceId: "hyundai-tr", sourceUrl: PRICE_URL, accessedAt: ACCESSED_AT, documentVersion: "Hyundai Türkiye HppPriceListTR API observation, 2026-08-16", extractionMethod: "API" as const, confidence: "HIGH" as const, limitations: ["Observed distributor price; may change without notice", "Campaign price can depend on stock and dealer participation"] };
  const sourced = <T>(value: T) => ({ value, provenance: [technical] as [typeof technical], confidence: "HIGH" as const });
  const trim = `${input.powertrainLabel} ${input.trim}`;
  const variant: TurkeyVehicleVariant = { id, market: "TR", lifecycleStatus: "ON_SALE", brand: sourced("Hyundai"), model: sourced(input.model), bodyStyle: sourced("SUV"), trim: sourced(trim), modelYear: sourced(input.modelYear), powertrain: { fuelType: sourced(input.fuelType), engineDisplacementCc: sourced(1598), powerKw: sourced(input.powerKw), torqueNm: sourced(input.torqueNm), transmission: sourced(input.transmission), drivenWheels: sourced(input.drivenWheels) }, dimensions: { lengthMm: sourced(input.lengthMm), widthMm: sourced(1865), heightMm: sourced(1650), wheelbaseMm: sourced(2680), luggageLitres: sourced(input.luggageLitres) }, efficiency: { protocol: sourced("WLTP"), combinedLitresPer100Km: sourced(input.combinedLitresPer100Km) }, safetyFeatureCodes: safety.map(sourced), createdAt: ACCESSED_AT, updatedAt: ACCESSED_AT };
  const price = (priceType: "LIST" | "CAMPAIGN", amountTry: number): PriceObservation => ({ id: deterministicHyundaiUuid(`price:${key}:${priceType}`), vehicleVariantId: id, market: "TR", condition: "NEW", amountTry, priceType, validFrom: id === CORRECTED_TUCSON_VARIANT_ID ? "2026-08-05T00:00:00.000Z" : ACCESSED_AT, sellerType: "DISTRIBUTOR", provenance: [priceSource], confidence: "HIGH" });
  const prices = [price("CAMPAIGN", input.campaignPriceTry), price("LIST", input.listPriceTry)];
  return { identity: { id, market: "TR", lifecycleStatus: "ON_SALE", brand: sourced("Hyundai"), model: sourced(input.model), bodyStyle: sourced("SUV"), trim: sourced(trim), modelYear: sourced(input.modelYear) }, prices, technicalVariant: variant };
}

export const stagedHyundaiBatch01TucsonRecords: readonly PilotVehicleRecord[] = candidates.map(createRecord);
