import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";
import { deterministicHyundaiUuid } from "@/data/production/hyundaiBatch01";
import type { PriceObservation, ProductionFuelType, TurkeyVehicleVariant } from "@/types/productionVehicle";

const ACCESSED_AT = "2026-08-16T00:00:00.000Z";
const PRICE_URL = "https://www.hyundai.com/tr/tr/satis/fiyat-listesi.html";

interface Candidate {
  readonly model: string; readonly modelYear: number; readonly bodyStyle: "Hatchback" | "SUV" | "Sedan" | "MPV";
  readonly powertrainLabel: string; readonly trim: string; readonly listPriceTry: number; readonly campaignPriceTry: number;
  readonly brochureUrl: string; readonly brochureVersion: string; readonly brochureHash: string;
  readonly fuelType: ProductionFuelType; readonly engineDisplacementCc?: number; readonly powerKw: number; readonly torqueNm: number;
  readonly transmission: string; readonly drivenWheels: "FWD" | "RWD" | "AWD";
  readonly dimensions: { readonly lengthMm: number; readonly widthMm: number; readonly heightMm: number; readonly wheelbaseMm: number; readonly luggageLitres: number; readonly seats?: number };
  readonly combinedLitresPer100Km?: number; readonly combinedKwhPer100Km?: number; readonly electricRangeKm?: number; readonly batteryCapacityKwh?: number;
  readonly safety: readonly string[];
}

const sources = {
  kona: ["https://dmassets.hyundai.com/is/content/hyundaiautoever/kona-digital-brosurpdf", "Hyundai KONA Türkiye broşürü, Mart 2026", "6ef3299d7ada0421e6373210062afee23a7fa967e8449636478fde0643dd21c2"],
  konaEv: ["https://dmassets.hyundai.com/is/content/hyundaiautoever/kona-ev-digital-brosur", "Hyundai KONA Elektrik Türkiye broşürü, Ağustos 2025", "5ec1e3479df41f9818a90e981107219d729e44c2bb00b9559d4a70b00457c5bd"],
  inster: ["https://dmassets.hyundai.com/is/content/hyundaiautoever/inster-brosurpdf", "Hyundai INSTER Türkiye broşürü, Aralık 2025", "79449479f4117f509f7a9d0144dc30d36ed1340b11fd5d2b09813313f5aa4883"],
  ioniq5: ["https://dmassets.hyundai.com/is/content/hyundaiautoever/ioniq5-digital-brosur", "Hyundai IONIQ 5 Türkiye broşürü, Haziran 2025", "0d66ef2601b68091b54ccc437bc4214de465d5485c091124fb003d2f2b7903e5"],
  ioniq5n: ["https://dmassets.hyundai.com/is/content/hyundaiautoever/ioniq5n-dijital-brosurpdf", "Hyundai IONIQ 5 N Türkiye broşürü, Aralık 2025", "210819a9277af8b52e71afe6a61bf8c5cd4c721a6e282d9b0054e5199d415f15"],
  ioniq6: ["https://dmassets.hyundai.com/is/content/hyundaiautoever/ioniq-6-digital-brosurpdf", "Hyundai IONIQ 6 Türkiye broşürü, Temmuz 2026", "3684a3b411b4abbbd8936b7feb613b821c3670a1c9b6f65b5ddaa5f639b31fac"],
  ioniq9: ["https://dmassets.hyundai.com/is/content/hyundaiautoever/ioniq9-digital-brosur", "Hyundai IONIQ 9 Türkiye broşürü, Kasım 2025", "58a8ce1a510249735b13451ff34c8e7af5f1955ea0fbdc079cdd151f3ad6baa7"],
  santaFe: ["https://dmassets.hyundai.com/is/content/hyundaiautoever/santa-fe-digital-brosurpdf", "Hyundai SANTA FE Türkiye broşürü, Temmuz 2026", "3b7a36fb25ec568c57d73d4b32c4fa5c90e34fc63a99defe39d2c4bb5bec74be"],
  staria: ["https://dmassets.hyundai.com/is/content/hyundaiautoever/staria-digital-brosur", "Hyundai STARIA Hibrit Türkiye teknik broşürü, observed 2026-08-16", "040c1337c81a6af7302141af60c8e2580722e6de3b98c96b8447b57c48953aa7"],
} as const;

const commonSafety = ["ABS", "EBD", "BAS", "ESC", "TPMS", "HAC", "MCB", "FRONT_AIRBAGS", "SIDE_CURTAIN_AIRBAGS", "REAR_CAMERA"] as const;
const adasSafety = [...commonSafety, "LKA", "LFA", "DAW", "HBA", "LVDA", "ISLA", "FCA", "ECALL"] as const;

function source(key: keyof typeof sources) {
  const [brochureUrl, brochureVersion, brochureHash] = sources[key];
  return { brochureUrl, brochureVersion, brochureHash };
}

const candidates: readonly Candidate[] = [
  { ...source("kona"), model: "KONA", modelYear: 2026, bodyStyle: "SUV", powertrainLabel: "1.6 T-GDI 180 PS DCT", trim: "Prime", listPriceTry: 2384050, campaignPriceTry: 2303050, fuelType: "GASOLINE", engineDisplacementCc: 1598, powerKw: 132.4, torqueNm: 265, transmission: "7-speed dual-clutch automatic", drivenWheels: "FWD", dimensions: { lengthMm: 4350, widthMm: 1825, heightMm: 1585, wheelbaseMm: 2660, luggageLitres: 466 }, combinedLitresPer100Km: 6.4, safety: adasSafety },
  ...([2025, 2026] as const).map((modelYear) => ({ ...source("konaEv"), model: "KONA Elektrik", modelYear, bodyStyle: "SUV" as const, powertrainLabel: "99 kW", trim: modelYear === 2025 ? "Advance" : "Advance (GSR-2-C)", listPriceTry: modelYear === 2025 ? 2377500 : 2417500, campaignPriceTry: modelYear === 2025 ? 2237500 : 2277500, fuelType: "BEV" as const, powerKw: 99, torqueNm: 255, transmission: "Single-speed reduction gear", drivenWheels: "FWD" as const, dimensions: { lengthMm: 4355, widthMm: 1825, heightMm: 1580, wheelbaseMm: 2660, luggageLitres: 466 }, combinedKwhPer100Km: 14.6, electricRangeKm: 380, batteryCapacityKwh: 48.6, safety: adasSafety })),
  ...([
    ["71,1 kW", "Dynamic", 1550000, 1400000, 71.1, 327, 14.3, 42, 3825, 280],
    ["84,5 kW", "Advance", 1790000, 1640000, 84.5, 360, 15.1, 49, 3825, 238],
    ["84,5 kW", "Cross Advance", 1840000, 1690000, 84.5, 360, 15.1, 49, 3845, 238],
  ] as const).map(([powertrainLabel, trim, listPriceTry, campaignPriceTry, powerKw, electricRangeKm, combinedKwhPer100Km, batteryCapacityKwh, lengthMm, luggageLitres]) => ({ ...source("inster"), model: "INSTER", modelYear: 2025, bodyStyle: "Hatchback" as const, powertrainLabel, trim, listPriceTry, campaignPriceTry, fuelType: "BEV" as const, powerKw, torqueNm: 147, transmission: "Single-speed reduction gear", drivenWheels: "FWD" as const, dimensions: { lengthMm, widthMm: 1610, heightMm: 1610, wheelbaseMm: 2580, luggageLitres, seats: 4 }, combinedKwhPer100Km, electricRangeKm, batteryCapacityKwh, safety: adasSafety })),
  ...([
    ["125 kW", "Dynamic Visionroof", 3150000, 2484602, 125, 440, 15.6, 63],
    ["160 kW", "Advance", 3490000, 3490000, 160, 570, 16.0, 84],
  ] as const).map(([powertrainLabel, trim, listPriceTry, campaignPriceTry, powerKw, electricRangeKm, combinedKwhPer100Km, batteryCapacityKwh]) => ({ ...source("ioniq5"), model: "IONIQ 5", modelYear: 2026, bodyStyle: "SUV" as const, powertrainLabel, trim, listPriceTry, campaignPriceTry, fuelType: "BEV" as const, powerKw, torqueNm: 350, transmission: "Single-speed reduction gear", drivenWheels: "RWD" as const, dimensions: { lengthMm: 4655, widthMm: 1890, heightMm: 1605, wheelbaseMm: 3000, luggageLitres: 520 }, combinedKwhPer100Km, electricRangeKm, batteryCapacityKwh, safety: adasSafety })),
  { ...source("ioniq5n"), model: "IONIQ 5 N", modelYear: 2025, bodyStyle: "SUV", powertrainLabel: "448 kW 4x4", trim: "N", listPriceTry: 6205000, campaignPriceTry: 5800000, fuelType: "BEV", powerKw: 448, torqueNm: 740, transmission: "Single-speed reduction gear", drivenWheels: "AWD", dimensions: { lengthMm: 4715, widthMm: 1940, heightMm: 1585, wheelbaseMm: 3000, luggageLitres: 480 }, combinedKwhPer100Km: 21.2, electricRangeKm: 448, batteryCapacityKwh: 84, safety: adasSafety },
  ...([
    ["125 kW Standart Menzil", "Advance", 3225000, 2483000, 125, 521, 13.4, 63],
    ["160 kW Uzun Menzil", "Progressive", 3725000, 3725000, 160, 680, 13.5, 84],
  ] as const).map(([powertrainLabel, trim, listPriceTry, campaignPriceTry, powerKw, electricRangeKm, combinedKwhPer100Km, batteryCapacityKwh]) => ({ ...source("ioniq6"), model: "Yeni IONIQ 6", modelYear: 2026, bodyStyle: "Sedan" as const, powertrainLabel, trim, listPriceTry, campaignPriceTry, fuelType: "BEV" as const, powerKw, torqueNm: 350, transmission: "Single-speed reduction gear", drivenWheels: "RWD" as const, dimensions: { lengthMm: 4925, widthMm: 1880, heightMm: 1495, wheelbaseMm: 2950, luggageLitres: 401 }, combinedKwhPer100Km, electricRangeKm, batteryCapacityKwh, safety: adasSafety })),
  ...([
    ["160kW (218PS) 4x2", "Progressive", 5810000, 160, 350, "RWD", 620, 19.9],
    ["226kW (307PS) 4x4", "Calligraphy", 6960000, 226.1, 605, "AWD", 600, 20.6],
  ] as const).map(([powertrainLabel, trim, price, powerKw, torqueNm, drivenWheels, electricRangeKm, combinedKwhPer100Km]) => ({ ...source("ioniq9"), model: "IONIQ 9", modelYear: 2026, bodyStyle: "SUV" as const, powertrainLabel, trim, listPriceTry: price, campaignPriceTry: price, fuelType: "BEV" as const, powerKw, torqueNm, transmission: "Single-speed reduction gear", drivenWheels, dimensions: { lengthMm: 5060, widthMm: 1980, heightMm: 1790, wheelbaseMm: 3130, luggageLitres: 338 }, combinedKwhPer100Km, electricRangeKm, batteryCapacityKwh: 110.3, safety: adasSafety })),
  { ...source("santaFe"), model: "SANTA FE Hibrit", modelYear: 2026, bodyStyle: "SUV", powertrainLabel: "1.6 T-GDI HEV 239PS 4x4", trim: "Progressive", listPriceTry: 5950000, campaignPriceTry: 5950000, fuelType: "HEV", engineDisplacementCc: 1598, powerKw: 175.8, torqueNm: 380, transmission: "6-speed automatic", drivenWheels: "AWD", dimensions: { lengthMm: 4830, widthMm: 1900, heightMm: 1720, wheelbaseMm: 2815, luggageLitres: 628, seats: 7 }, combinedLitresPer100Km: 7.2, safety: adasSafety },
  { ...source("staria"), model: "STARIA Hibrit", modelYear: 2025, bodyStyle: "MPV", powertrainLabel: "1.6 T-GDI 225 PS HEV AT 4x2", trim: "Elite", listPriceTry: 2721000, campaignPriceTry: 2590000, fuelType: "HEV", engineDisplacementCc: 1598, powerKw: 165, torqueNm: 367, transmission: "6-speed automatic", drivenWheels: "FWD", dimensions: { lengthMm: 5253, widthMm: 1997, heightMm: 1990, wheelbaseMm: 3273, luggageLitres: 831, seats: 9 }, combinedLitresPer100Km: 7.6, safety: adasSafety },
];

function createRecord(input: Candidate): PilotVehicleRecord {
  const key = `${input.model}|${input.modelYear}|${input.powertrainLabel}|${input.trim}`;
  const stableExistingIds: Readonly<Record<string, string>> = {
    "IONIQ 5|2026|125 kW|Dynamic Visionroof": "87e30119-f0d5-4c98-8324-cbd65156974b",
    "IONIQ 9|2026|160kW (218PS) 4x2|Progressive": "a3728e65-51b2-447f-a6c3-a1f64db8a310",
  };
  const id = stableExistingIds[key] ?? deterministicHyundaiUuid(`variant:${key}`);
  const technical = { sourceId: "hyundai-tr", sourceUrl: input.brochureUrl, accessedAt: ACCESSED_AT, documentVersion: input.brochureVersion, contentHash: `sha256:${input.brochureHash}`, extractionMethod: "DOCUMENT_IMPORT" as const, confidence: "HIGH" as const, limitations: ["Official Turkey-market brochure facts", "Battery capacity is retained as reported; gross/usable semantics are not inferred", "PS-to-kW conversions are deterministic where the source publishes system power only in PS"] };
  const priceSource = { sourceId: "hyundai-tr", sourceUrl: PRICE_URL, accessedAt: ACCESSED_AT, documentVersion: "Hyundai Türkiye HppPriceListTR API observation, 2026-08-16", extractionMethod: "API" as const, confidence: "HIGH" as const, limitations: ["Observed distributor price; may change without notice", "Campaign price can depend on stock and dealer participation"] };
  const sourced = <T>(value: T) => ({ value, provenance: [technical] as [typeof technical], confidence: "HIGH" as const });
  const dimensions = Object.fromEntries(Object.entries(input.dimensions).map(([name, value]) => [name, sourced(value)])) as TurkeyVehicleVariant["dimensions"];
  const variant: TurkeyVehicleVariant = { id, market: "TR", lifecycleStatus: "ON_SALE", brand: sourced("Hyundai"), model: sourced(input.model), bodyStyle: sourced(input.bodyStyle), trim: sourced(`${input.powertrainLabel} ${input.trim}`), modelYear: sourced(input.modelYear), powertrain: { fuelType: sourced(input.fuelType), ...(input.engineDisplacementCc === undefined ? {} : { engineDisplacementCc: sourced(input.engineDisplacementCc) }), powerKw: sourced(input.powerKw), torqueNm: sourced(input.torqueNm), transmission: sourced(input.transmission), drivenWheels: sourced(input.drivenWheels) }, dimensions, efficiency: { protocol: sourced("WLTP"), ...(input.combinedLitresPer100Km === undefined ? {} : { combinedLitresPer100Km: sourced(input.combinedLitresPer100Km) }), ...(input.combinedKwhPer100Km === undefined ? {} : { combinedKwhPer100Km: sourced(input.combinedKwhPer100Km) }), ...(input.electricRangeKm === undefined ? {} : { electricRangeKm: sourced(input.electricRangeKm) }), ...(input.batteryCapacityKwh === undefined ? {} : { batteryCapacityKwh: sourced(input.batteryCapacityKwh) }) }, safetyFeatureCodes: input.safety.map(sourced), createdAt: ACCESSED_AT, updatedAt: ACCESSED_AT };
  const price = (priceType: "LIST" | "CAMPAIGN", amountTry: number): PriceObservation => ({ id: deterministicHyundaiUuid(`price:${key}:${priceType}`), vehicleVariantId: id, market: "TR", condition: "NEW", amountTry, priceType, validFrom: stableExistingIds[key] ? "2026-08-05T00:00:00.000Z" : ACCESSED_AT, sellerType: "DISTRIBUTOR", provenance: [priceSource], confidence: "HIGH" });
  const prices = [price("CAMPAIGN", input.campaignPriceTry), price("LIST", input.listPriceTry)];
  return { identity: { id, market: "TR", lifecycleStatus: "ON_SALE", brand: sourced("Hyundai"), model: sourced(input.model), bodyStyle: sourced(input.bodyStyle), trim: sourced(`${input.powertrainLabel} ${input.trim}`), modelYear: sourced(input.modelYear) }, prices, technicalVariant: variant };
}

export const stagedHyundaiBatch01ElectrifiedRecords: readonly PilotVehicleRecord[] = candidates.map(createRecord);
