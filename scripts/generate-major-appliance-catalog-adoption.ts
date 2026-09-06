import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { requireXpyDomainPack } from "../features/xpy/domainPacks";
import { XPY_RUNTIME_DIGEST, XPY_RUNTIME_VERSION } from "../features/xpy/runtimeContract";
import type {
  Capability,
  CatalogEvidence,
  CatalogSource,
  ObjectiveFact,
  XpyCatalogRelease,
  XpyComparisonDimension,
  XpyExternalOfferingSnapshot,
} from "../features/xpy/catalog/contract";
import { XPY_CATALOG_VERSION } from "../features/xpy/catalog/contract";
import {
  MAJOR_APPLIANCE_ADOPTION_RELEASE,
  MAJOR_APPLIANCE_ADOPTION_ROOT,
  loadMajorApplianceCatalogAdoptionCandidate,
} from "../features/xpy/catalog/majorApplianceCatalogAdoption.server";
import { projectAdvisorRead, projectComparisonEvidence } from "../features/xpy/catalog/readProjections";
import { validateXpyCatalogRelease, xpyCatalogReleaseDigest } from "../features/xpy/catalog/validation";

const root = path.resolve(process.cwd());
const outputRoot = path.join(root, MAJOR_APPLIANCE_ADOPTION_ROOT);
const workUnitId = "WU-APPL-AMAZON-P1-MAJOR-APPLIANCE-CATALOG-ADOPTION-01" as const;
const reviewedAt = "2026-09-05T12:00:00.000+03:00";
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const digest = (value: unknown) => `sha256:${sha256(JSON.stringify(value))}` as const;
const slug = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");

type CategoryId = "WASHING_MACHINE" | "DRYER" | "DISHWASHER" | "REFRIGERATOR";
type FactValue = string | number | boolean;
type FactInput = { key: string; value: FactValue; unit?: string; locator: string };
type CapabilityInput = { key: string; locator: string; limitations?: readonly string[] };

interface CandidateSpec {
  readonly disposition: "ADMITTED" | "BLOCKED_EVIDENCE";
  readonly categoryId: CategoryId;
  readonly offeringId: string;
  readonly brand: string;
  readonly model: string;
  readonly configuration: string;
  readonly asin: string;
  readonly amazonUrl: string;
  readonly amazonTitle: string;
  readonly amazonPriceTry: number;
  readonly amazonObservedAt: string;
  readonly officialUrl: string;
  readonly officialDocumentType: string;
  readonly facts: readonly FactInput[];
  readonly capabilities: readonly CapabilityInput[];
  readonly unknowns: readonly string[];
  readonly blockers: readonly string[];
}

const commonFacts = (lifecycle: string, warranty: string, manual: string): readonly FactInput[] => [
  { key: "lifecycleStatus", value: lifecycle, locator: "official Türkiye surface: exact model and category identity" },
  { key: "warrantyServiceStatus", value: warranty, locator: "official Türkiye surface: warranty/support applicability" },
  { key: "installationGuidanceStatus", value: manual, locator: "official Türkiye surface: product documents/support entrypoint" },
  { key: "safetyGuidanceStatus", value: manual, locator: "official Türkiye surface: product documents/support entrypoint" },
];

const specs: readonly CandidateSpec[] = [
  {
    disposition: "ADMITTED", categoryId: "WASHING_MACHINE", offeringId: "appliances:wm:tr:samsung:ww90ta046ah-ah", brand: "Samsung", model: "WW90TA046AH/AH", configuration: "Samsung|WW90TA046AH/AH|TR|FREESTANDING_FRONT_LOAD_WASHING_ONLY|WHITE", asin: "B099ZQLXQV", amazonUrl: "https://www.amazon.com.tr/dp/B099ZQLXQV", amazonTitle: "Samsung WW90TA046AH/AH 9 kg Çamaşır Makinesi", amazonPriceTry: 35990, amazonObservedAt: "2026-09-05T01:05:02.676Z", officialUrl: "https://images.samsung.com/is/content/samsung/p6/common/energylabel/common-energylabel-ww90ta046ah-ah-energylabel.pdf", officialDocumentType: "EXACT_TR_ENERGY_LABEL_PLUS_EXACT_TR_SUPPORT_AND_WARRANTY_LIST",
    facts: [...commonFacts("CURRENT_EXACT_TR_SUPPORT_AND_ACTIVE_AMAZON_TR_OFFER", "TEN_YEAR_DIGITAL_INVERTER_MOTOR_PART_ONLY_FOR_QUALIFYING_PURCHASES", "EXACT_TR_MANUAL_ENTRYPOINT_PRESENT_NOT_CHECKSUM_PINNED"), { key: "installationType", value: "FREESTANDING_FRONT_LOAD", locator: "energy label: type/model context" }, { key: "ratedCapacityKg", value: 9, unit: "kg", locator: "energy label p.1: rated capacity" }, { key: "maxSpinRpm", value: 1400, unit: "rpm", locator: "official product fiche: rated-load spin speed" }, { key: "energyClass", value: "A", locator: "energy label p.1" }, { key: "energyPer100CyclesKwh", value: 49, unit: "kWh/100_cycles", locator: "energy label p.1" }, { key: "waterPerCycleL", value: 50, unit: "L/cycle", locator: "energy label p.1" }, { key: "noiseDbA", value: 72, unit: "dB(A)", locator: "energy label p.1" }, { key: "widthMm", value: 600, unit: "mm", locator: "official product fiche: dimensions" }, { key: "heightMm", value: 850, unit: "mm", locator: "official product fiche: dimensions" }, { key: "depthMm", value: 550, unit: "mm", locator: "official product fiche: dimensions" }],
    capabilities: [{ key: "ecoBubble", locator: "official Samsung model family specification" }, { key: "steam", locator: "official Samsung model family specification" }, { key: "childLock", locator: "official Samsung model family specification" }],
    unknowns: ["Exact installation clearances and hose routing remain unknown until a checksum-pinned exact manual is reviewed.", "Noise perception, wash outcome, vibration and household bills are not guaranteed."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "WASHING_MACHINE", offeringId: "appliances:wm:tr:vestel:cmi-97402-wifi", brand: "Vestel", model: "CMI 97402 WIFI", configuration: "Vestel|CMI 97402 WIFI|TR|FREESTANDING_FRONT_LOAD_WASHING_ONLY|WHITE", asin: "B0GGDKT3JP", amazonUrl: "https://www.amazon.com.tr/dp/B0GGDKT3JP", amazonTitle: "Vestel CMI 97402 WIFI 9 Kg Çamaşır Makinesi", amazonPriceTry: 29499, amazonObservedAt: "2026-09-05T01:05:02.676Z", officialUrl: "https://statik.vestel.com.tr/webfiles/20350198_e.pdf", officialDocumentType: "EXACT_TR_ENERGY_LABEL_PLUS_EXACT_TR_PRODUCT_AND_MANUAL_SURFACES",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "TEN_YEAR_MOTOR_WARRANTY_MARKETING_SCOPE_DURATION_RECHECK_AT_PURCHASE", "EXACT_TR_MANUAL_PUBLISHED_NOT_CHECKSUM_PINNED_IN_RELEASE"), { key: "installationType", value: "FREESTANDING_FRONT_LOAD", locator: "energy label and exact manual" }, { key: "ratedCapacityKg", value: 9, unit: "kg", locator: "energy label p.1" }, { key: "maxSpinRpm", value: 1000, unit: "rpm", locator: "exact product page and product fiche" }, { key: "energyClass", value: "A", locator: "energy label p.1" }, { key: "energyPer100CyclesKwh", value: 49, unit: "kWh/100_cycles", locator: "energy label p.1" }, { key: "waterPerCycleL", value: 50, unit: "L/cycle", locator: "energy label p.1" }, { key: "noiseDbA", value: 73, unit: "dB(A)", locator: "energy label p.1" }, { key: "widthMm", value: 597, unit: "mm", locator: "exact manual PDF p.13 technical specifications" }, { key: "heightMm", value: 845, unit: "mm", locator: "exact manual PDF p.13 technical specifications" }, { key: "depthMm", value: 582, unit: "mm", locator: "exact manual PDF p.13 technical specifications" }],
    capabilities: [{ key: "wifi", locator: "exact official product title and page" }, { key: "childLock", locator: "exact manual p.26" }, { key: "halfLoadDetection", locator: "exact manual p.26" }],
    unknowns: ["The manual URL is exact, but L9 remains disabled because its bytes/checksum were not retained by this release.", "Seller warranty terms, final installation inclusion and usage outcomes require transaction-time confirmation."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "WASHING_MACHINE", offeringId: "appliances:wm:tr:arcelik:10120-imp", brand: "Arçelik", model: "10120 IMP", configuration: "Arçelik|10120 IMP|TR|FREESTANDING_FRONT_LOAD_WASHING_ONLY|ANTHRACITE", asin: "B0GCC5NT1Z", amazonUrl: "https://www.amazon.com.tr/dp/B0GCC5NT1Z", amazonTitle: "Arçelik 10120 IMP Neo Otonom Çamaşır Makinesi", amazonPriceTry: 42999, amazonObservedAt: "2026-09-05T01:05:02.676Z", officialUrl: "https://www.arcelik.com.tr/camasir-makinesi/10120-imp-camasir-makinesi", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_WITH_DOCUMENT_ENTRYPOINTS",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "TEN_YEAR_PROSMART_INVERTER_MOTOR_PART_ONLY", "EXACT_TR_MANUAL_AND_ENERGY_DOCUMENT_ENTRYPOINTS_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING_FRONT_LOAD", locator: "product technical specifications" }, { key: "ratedCapacityKg", value: 10, unit: "kg", locator: "technical specifications: capacity" }, { key: "maxSpinRpm", value: 1200, unit: "rpm", locator: "technical specifications: maximum spin" }, { key: "energyClass", value: "A_MINUS_10_PERCENT", locator: "technical specifications: energy class" }, { key: "energyPer100CyclesKwh", value: 46, unit: "kWh/100_cycles", locator: "performance: energy consumption" }, { key: "waterPerCycleL", value: 47, unit: "L/cycle", locator: "performance: water consumption" }, { key: "noiseDbA", value: 72, unit: "dB(A)", locator: "energy label/document entrypoint; exact label value" }, { key: "widthMm", value: 600, unit: "mm", locator: "technical specifications: dimensions" }, { key: "heightMm", value: 845, unit: "mm", locator: "technical specifications: dimensions" }, { key: "depthMm", value: 590, unit: "mm", locator: "technical specifications: dimensions" }],
    capabilities: [{ key: "wifi", locator: "technical specifications: connectivity" }, { key: "steam", locator: "technical specifications: steam therapy" }, { key: "autoDose", locator: "technical specifications: liquid detergent dosing" }, { key: "floodProtection", locator: "comfort and safety: overflow protection" }, { key: "childLock", locator: "comfort and safety: child lock" }],
    unknowns: ["Exact manual bytes and section locators are not retained; L9 is disabled.", "Programme-level load limits and claimed outcome magnitudes remain outside decision evidence."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "WASHING_MACHINE", offeringId: "appliances:wm:tr:altus:al-cm-101254-d", brand: "Altus", model: "AL CM 101254 D", configuration: "Altus|AL CM 101254 D|TR|FREESTANDING_FRONT_LOAD_WASHING_ONLY|WHITE", asin: "B0H6BNV8TG", amazonUrl: "https://www.amazon.com.tr/dp/B0H6BNV8TG", amazonTitle: "Altus AL CM 101254 D 10 kg Çamaşır Makinesi", amazonPriceTry: 32979, amazonObservedAt: "2026-09-05T01:05:02.676Z", officialUrl: "https://www.altus.com.tr/urunler/camasir-makinesi/camasir-makinesi-al-cm-101254-d", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_AND_ENERGY_LABEL",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "TEN_YEAR_MOTOR_WARRANTY_BADGE_IN_OFFICIAL_TR_CATALOG_SCOPE_RECHECK_TERMS", "EXACT_TR_PRODUCT_DOCUMENT_ENTRYPOINTS_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING_FRONT_LOAD", locator: "technical specifications" }, { key: "ratedCapacityKg", value: 10, unit: "kg", locator: "technical specifications and energy label" }, { key: "maxSpinRpm", value: 1200, unit: "rpm", locator: "technical specifications" }, { key: "energyClass", value: "A", locator: "technical specifications and energy label" }, { key: "energyPer100CyclesKwh", value: 46, unit: "kWh/100_cycles", locator: "exact energy label" }, { key: "waterPerCycleL", value: 52, unit: "L/cycle", locator: "exact energy label" }, { key: "noiseDbA", value: 72, unit: "dB(A)", locator: "exact energy label" }, { key: "widthMm", value: 600, unit: "mm", locator: "technical specifications" }, { key: "heightMm", value: 845, unit: "mm", locator: "technical specifications" }, { key: "depthMm", value: 580, unit: "mm", locator: "technical specifications" }],
    capabilities: [{ key: "steam", locator: "technical specifications: SteamCure" }, { key: "automaticWaterAdjustment", locator: "technical specifications" }, { key: "childLock", locator: "comfort and safety" }],
    unknowns: ["Exact manual bytes and section locators are not retained; L9 is disabled.", "Motor warranty eligibility and seller installation terms require purchase-date confirmation."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "WASHING_MACHINE", offeringId: "appliances:wm:tr:samsung:ww11dg6b25leah", brand: "Samsung", model: "WW11DG6B25LEAH", configuration: "Samsung|WW11DG6B25LEAH|TR|FREESTANDING_FRONT_LOAD_WASHING_ONLY|WHITE", asin: "B0G4DDZZD7", amazonUrl: "https://www.amazon.com.tr/dp/B0G4DDZZD7", amazonTitle: "Samsung WW11DG6B25LEAH 11 Kg Çamaşır Makinesi", amazonPriceTry: 35999, amazonObservedAt: "2026-09-05T01:05:02.676Z", officialUrl: "https://www.samsung.com/tr/washers-and-dryers/washing-machines/ww6000d-front-loading-smartthings-ai-energy-mode-a-10-percent-extra-energy-efficiency-11kg-essential-white-ww11dg6b25leah/", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_AND_SUPPORT",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "TEN_YEAR_DIGITAL_INVERTER_MOTOR_PART_ONLY_FOR_QUALIFYING_PURCHASES", "EXACT_TR_SUPPORT_DOCUMENT_ENTRYPOINT_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING_FRONT_LOAD", locator: "technical specifications" }, { key: "ratedCapacityKg", value: 11, unit: "kg", locator: "technical specifications: washing capacity" }, { key: "maxSpinRpm", value: 1400, unit: "rpm", locator: "technical specifications: spin speed" }, { key: "energyClass", value: "A_MINUS_10_PERCENT", locator: "technical specifications" }, { key: "energyPer100CyclesKwh", value: 48, unit: "kWh/100_cycles", locator: "performance" }, { key: "waterPerCycleL", value: 54, unit: "L/cycle", locator: "performance" }, { key: "noiseDbA", value: 72, unit: "dB(A)", locator: "performance: spin noise" }, { key: "widthMm", value: 600, unit: "mm", locator: "physical specifications" }, { key: "heightMm", value: 850, unit: "mm", locator: "physical specifications" }, { key: "depthMm", value: 600, unit: "mm", locator: "physical specifications" }],
    capabilities: [{ key: "wifi", locator: "SmartThings support" }, { key: "ecoBubble", locator: "feature list" }, { key: "steam", locator: "feature list" }, { key: "childLock", locator: "feature list" }],
    unknowns: ["Exact manual bytes and section locators are not retained; L9 is disabled.", "AI Energy savings claims are conditional and excluded from decision evidence."], blockers: [],
  },

  {
    disposition: "ADMITTED", categoryId: "DRYER", offeringId: "appliances:dryer:tr:hoover:hre-h11a2tbe-17", brand: "Hoover", model: "HRE H11A2TBE-17", configuration: "Hoover|HRE H11A2TBE-17|TR|FREESTANDING_HEAT_PUMP_DRYING_ONLY|WHITE", asin: "B0FWV9819Q", amazonUrl: "https://www.amazon.com.tr/dp/B0FWV9819Q", amazonTitle: "Hoover HRE H11A2TBE-17 11 kg Isı Pompalı Kurutma Makinesi", amazonPriceTry: 19499, amazonObservedAt: "2026-09-05T01:04:18.875Z", officialUrl: "https://www.hoover-home.com/tr_TR/kurutma-makineleri/31102852/hre-h11a2tbe-17/", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_WITH_DOCUMENT_ENTRYPOINTS",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "TR_SUPPORT_APPLICABILITY_PROVEN_DURATION_UNKNOWN", "EXACT_TR_MANUAL_ENTRYPOINT_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING", locator: "main features" }, { key: "technology", value: "HEAT_PUMP", locator: "main features" }, { key: "ratedCapacityKg", value: 11, unit: "kg", locator: "main features" }, { key: "energyClass", value: "E", locator: "performance and consumption" }, { key: "energyPer100CyclesKwh", value: 159, unit: "kWh/100_cycles", locator: "weighted energy 1.59 kWh/cycle" }, { key: "waterUseApplicability", value: "NOT_APPLICABLE_CONDENSATE_APPLIANCE", locator: "heat-pump drying-only configuration" }, { key: "noiseDbA", value: 66, unit: "dB(A)", locator: "performance and consumption" }, { key: "widthMm", value: 596, unit: "mm", locator: "dimensions" }, { key: "heightMm", value: 850, unit: "mm", locator: "dimensions" }, { key: "depthMm", value: 604, unit: "mm", locator: "dimensions" }],
    capabilities: [{ key: "wifiBluetooth", locator: "technical features" }, { key: "woolmark", locator: "programs and functions" }, { key: "filterIndicator", locator: "programs and functions" }, { key: "drainHoseIncluded", locator: "accessories" }],
    unknowns: ["Base appliance warranty duration and installation inclusion are not stated on the exact page.", "Exact manual bytes are not retained; L9 is disabled."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "DRYER", offeringId: "appliances:dryer:tr:hoover:nr-eh11n2tbex-17", brand: "Hoover", model: "NR EH11N2TBEX-17", configuration: "Hoover|NR EH11N2TBEX-17|TR|FREESTANDING_HEAT_PUMP_DRYING_ONLY|WHITE", asin: "B0HC45HBGP", amazonUrl: "https://www.amazon.com.tr/dp/B0HC45HBGP", amazonTitle: "Hoover NR EH11N2TBEX-17 11 kg Isı Pompalı Kurutma Makinesi", amazonPriceTry: 21399, amazonObservedAt: "2026-09-05T01:04:18.875Z", officialUrl: "https://www.hoover-home.com/tr_TR/kurutma-makineleri/31103113/nr-eh11n2tbex-17/", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_WITH_DOCUMENT_ENTRYPOINTS",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "TR_SUPPORT_APPLICABILITY_PROVEN_DURATION_UNKNOWN", "EXACT_TR_MANUAL_ENTRYPOINT_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING", locator: "main features" }, { key: "technology", value: "HEAT_PUMP", locator: "product family and performance" }, { key: "ratedCapacityKg", value: 11, unit: "kg", locator: "main features" }, { key: "energyClass", value: "D", locator: "performance and consumption" }, { key: "energyPer100CyclesKwh", value: 145, unit: "kWh/100_cycles", locator: "weighted energy 1.45 kWh/cycle" }, { key: "waterUseApplicability", value: "NOT_APPLICABLE_CONDENSATE_APPLIANCE", locator: "drying-only configuration" }, { key: "noiseDbA", value: 64, unit: "dB(A)", locator: "performance and consumption" }, { key: "widthMm", value: 596, unit: "mm", locator: "dimensions" }, { key: "heightMm", value: 850, unit: "mm", locator: "dimensions" }, { key: "depthMm", value: 604, unit: "mm", locator: "dimensions" }],
    capabilities: [{ key: "wifiBluetooth", locator: "technical features" }, { key: "sensorDrying", locator: "Auto Care function" }, { key: "woolmark", locator: "programs and functions" }, { key: "directDrain", locator: "drain hose accessory" }],
    unknowns: ["Base appliance warranty duration and installation inclusion are not stated on the exact page.", "Exact manual bytes are not retained; L9 is disabled."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "DRYER", offeringId: "appliances:dryer:tr:arcelik:1201-kmx", brand: "Arçelik", model: "1201 KMX", configuration: "Arçelik|1201 KMX|TR|FREESTANDING_HEAT_PUMP_DRYING_ONLY|WHITE", asin: "B0GDTP7XLW", amazonUrl: "https://www.amazon.com.tr/dp/B0GDTP7XLW", amazonTitle: "Arçelik 1201 KMX 12 Kg Kurutma Makinesi", amazonPriceTry: 39000, amazonObservedAt: "2026-09-05T01:04:18.875Z", officialUrl: "https://www.arcelik.com.tr/12-kg-kurutma-makinesi/1201-kmx-kurutma-makinesi", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_AND_PRODUCT_FICHE",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "THIRTY_SIX_MONTH_BASE_PLUS_TEN_YEAR_PROSMART_INVERTER_MOTOR_PART", "EXACT_TR_MANUAL_ENTRYPOINT_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING", locator: "product fiche" }, { key: "technology", value: "HEAT_PUMP", locator: "technical specifications" }, { key: "ratedCapacityKg", value: 12, unit: "kg", locator: "product fiche" }, { key: "energyClass", value: "E", locator: "product fiche" }, { key: "energyPer100CyclesKwh", value: 187, unit: "kWh/100_cycles", locator: "product fiche: weighted 1.87 kWh/cycle" }, { key: "waterUseApplicability", value: "NOT_APPLICABLE_CONDENSATE_APPLIANCE", locator: "drying-only configuration" }, { key: "noiseDbA", value: 64, unit: "dB(A)", locator: "product fiche" }, { key: "widthMm", value: 600, unit: "mm", locator: "product fiche" }, { key: "heightMm", value: 850, unit: "mm", locator: "product fiche" }, { key: "depthMm", value: 670, unit: "mm", locator: "product fiche" }],
    capabilities: [{ key: "sensorDrying", locator: "Smart moisture sensor" }, { key: "wifi", locator: "technical specifications" }, { key: "directDrain", locator: "comfort and safety" }, { key: "childLock", locator: "comfort and safety" }],
    unknowns: ["Door-open installation envelope is unknown.", "Exact manual bytes are not retained; L9 is disabled."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "DRYER", offeringId: "appliances:dryer:tr:samsung:dv10dg54a0abah", brand: "Samsung", model: "DV10DG54A0ABAH", configuration: "Samsung|DV10DG54A0ABAH|TR|FREESTANDING_HEAT_PUMP_DRYING_ONLY|BLACK", asin: "B0FWKLV2BJ", amazonUrl: "https://www.amazon.com.tr/dp/B0FWKLV2BJ", amazonTitle: "Samsung DV10DG54A0ABAH 10 Kg Kurutma Makinesi", amazonPriceTry: 37199, amazonObservedAt: "2026-09-05T01:04:18.875Z", officialUrl: "https://www.samsung.com/tr/washers-and-dryers/dryers/dv5000d-dryer-space-max-hygiene-care-smartthings-ai-energy-mode-10kg-black-dv10dg54a0abah/", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_AND_SUPPORT",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "TEN_YEAR_DIGITAL_INVERTER_MOTOR_PART_ONLY_FOR_QUALIFYING_PURCHASES", "EXACT_TR_MANUAL_ENTRYPOINT_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING", locator: "product fiche" }, { key: "technology", value: "HEAT_PUMP", locator: "performance" }, { key: "ratedCapacityKg", value: 10, unit: "kg", locator: "technical specifications" }, { key: "energyClass", value: "C", locator: "performance" }, { key: "energyPer100CyclesKwh", value: 114, unit: "kWh/100_cycles", locator: "performance" }, { key: "waterUseApplicability", value: "NOT_APPLICABLE_CONDENSATE_APPLIANCE", locator: "drying-only configuration" }, { key: "noiseDbA", value: 64, unit: "dB(A)", locator: "performance" }, { key: "widthMm", value: 600, unit: "mm", locator: "physical specifications" }, { key: "heightMm", value: 850, unit: "mm", locator: "physical specifications" }, { key: "depthMm", value: 600, unit: "mm", locator: "physical specifications" }],
    capabilities: [{ key: "wifi", locator: "SmartThings support" }, { key: "sensorDrying", locator: "Optimum Drying System" }, { key: "dryingRack", locator: "feature list" }, { key: "childLock", locator: "feature list" }],
    unknowns: ["Door-open installation envelope and direct-drain inclusion are unknown.", "Exact manual bytes are not retained; L9 is disabled."], blockers: [],
  },

  {
    disposition: "ADMITTED", categoryId: "DISHWASHER", offeringId: "appliances:dishwasher:tr:arcelik:a-710-i", brand: "Arçelik", model: "A 710 I", configuration: "Arçelik|A 710 I|TR|FREESTANDING_DISHWASHER|INOX", asin: "B0GR5WR3F8", amazonUrl: "https://www.amazon.com.tr/dp/B0GR5WR3F8", amazonTitle: "Arçelik A 710 I 6 Programlı Bulaşık Makinesi", amazonPriceTry: 24799, amazonObservedAt: "2026-09-05T01:04:10.169Z", officialUrl: "https://www.arcelik.com.tr/prestige-serisi/a-710-i-bulasik-makinesi", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_WITH_DOCUMENT_ENTRYPOINTS",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "TR_SUPPORT_APPLICABILITY_PROVEN_DURATION_RECHECK_AT_PURCHASE", "EXACT_TR_MANUAL_ENTRYPOINT_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING", locator: "general specifications" }, { key: "placeSettings", value: 14, unit: "place_settings", locator: "general specifications" }, { key: "energyClass", value: "B", locator: "general specifications" }, { key: "energyPerCycleKwh", value: 0.645, unit: "kWh/cycle", locator: "consumption information" }, { key: "waterPerCycleL", value: 10.9, unit: "L/cycle", locator: "consumption information" }, { key: "noiseDbA", value: 46, unit: "dB(A)", locator: "consumption information" }, { key: "widthMm", value: 598, unit: "mm", locator: "dimensions" }, { key: "heightMm", value: 850, unit: "mm", locator: "dimensions" }, { key: "depthMm", value: 600, unit: "mm", locator: "dimensions" }],
    capabilities: [{ key: "wifiBluetooth", locator: "connectivity" }, { key: "automaticDoorOpen", locator: "functions" }, { key: "halfLoad", locator: "functions" }, { key: "overflowProtection", locator: "water safety system" }, { key: "childLock", locator: "other" }],
    unknowns: ["Base warranty duration and exact installation clearances remain unknown.", "Exact manual bytes are not retained; L9 is disabled."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "DISHWASHER", offeringId: "appliances:dishwasher:tr:arcelik:a-811-i", brand: "Arçelik", model: "A 811 I", configuration: "Arçelik|A 811 I|TR|FREESTANDING_DISHWASHER|INOX", asin: "B0H8K13BL6", amazonUrl: "https://www.amazon.com.tr/dp/B0H8K13BL6", amazonTitle: "Arçelik Diamond A 811 I Bulaşık Makinesi", amazonPriceTry: 32000, amazonObservedAt: "2026-09-05T01:04:10.169Z", officialUrl: "https://www.arcelik.com.tr/diamond-serisi-solo-bulasik-makinesi/a-811-i-bulasik-makinesi", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_WITH_DOCUMENT_ENTRYPOINTS",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AMAZON_TR_OFFER_VOLATILE", "TR_SUPPORT_APPLICABILITY_PROVEN_DURATION_RECHECK_AT_PURCHASE", "EXACT_TR_MANUAL_ENTRYPOINT_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING", locator: "general specifications" }, { key: "placeSettings", value: 15, unit: "place_settings", locator: "general specifications" }, { key: "energyClass", value: "A", locator: "general specifications" }, { key: "energyPerCycleKwh", value: 0.551, unit: "kWh/cycle", locator: "consumption information" }, { key: "waterPerCycleL", value: 8.9, unit: "L/cycle", locator: "consumption information" }, { key: "noiseDbA", value: 41, unit: "dB(A)", locator: "consumption information" }, { key: "widthMm", value: 598, unit: "mm", locator: "dimensions" }, { key: "heightMm", value: 850, unit: "mm", locator: "dimensions" }, { key: "depthMm", value: 600, unit: "mm", locator: "dimensions" }],
    capabilities: [{ key: "wifiBluetooth", locator: "connectivity" }, { key: "automaticDoorOpen", locator: "functions" }, { key: "halfLoad", locator: "functions" }, { key: "soilSensor", locator: "functions" }, { key: "overflowProtection", locator: "water safety system" }, { key: "childLock", locator: "other" }],
    unknowns: ["Official manufacturer page reports its own store as temporarily out of stock; Amazon availability remains L10 only.", "Base warranty duration and exact manual checksum remain unknown."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "DISHWASHER", offeringId: "appliances:dishwasher:tr:samsung:dw60m5062fs-tr", brand: "Samsung", model: "DW60M5062FS/TR", configuration: "Samsung|DW60M5062FS/TR|TR|FREESTANDING_DISHWASHER|INOX", asin: "B07P9FNJHC", amazonUrl: "https://www.amazon.com.tr/dp/B07P9FNJHC", amazonTitle: "Samsung DW60M5062FS 7 Programlı İnox Solo Bulaşık Makinesi", amazonPriceTry: 34990, amazonObservedAt: "2026-09-05T01:04:10.169Z", officialUrl: "https://images.samsung.com/is/content/samsung/p5/common/energylabel/common-energylabel-dw60m5062fs-tr-productfiche.pdf", officialDocumentType: "EXACT_TR_PRODUCT_FICHE_AND_SUPPORT",
    facts: [...commonFacts("CURRENT_EXACT_TR_SUPPORT_AND_ACTIVE_AMAZON_TR_OFFER", "THIRTY_SIX_MONTH_MINIMUM_SUPPLIER_WARRANTY", "EXACT_TR_MANUAL_ENTRYPOINT_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING", locator: "product fiche" }, { key: "placeSettings", value: 14, unit: "place_settings", locator: "product fiche" }, { key: "energyClass", value: "F", locator: "product fiche" }, { key: "energyPerCycleKwh", value: 1.052, unit: "kWh/cycle", locator: "product fiche" }, { key: "waterPerCycleL", value: 12, unit: "L/cycle", locator: "product fiche" }, { key: "noiseDbA", value: 46, unit: "dB(A)", locator: "product fiche" }, { key: "widthMm", value: 600, unit: "mm", locator: "product fiche" }, { key: "heightMm", value: 850, unit: "mm", locator: "product fiche" }, { key: "depthMm", value: 600, unit: "mm", locator: "product fiche" }],
    capabilities: [{ key: "childLock", locator: "official Türkiye product catalog" }, { key: "thirdRack", locator: "official Türkiye product catalog" }, { key: "delayStart", locator: "official Türkiye product catalog" }, { key: "voltageProtection", locator: "official Türkiye product catalog" }],
    unknowns: ["Amazon title says seven programs while Samsung Türkiye support identifies the exact model as six-program; program count is excluded as conflicted.", "Exact manual bytes are not retained; L9 is disabled."], blockers: [],
  },
  {
    disposition: "BLOCKED_EVIDENCE", categoryId: "DISHWASHER", offeringId: "appliances:dishwasher:tr:teka:dfi-46700-ttm", brand: "Teka", model: "DFI 46700 TTM", configuration: "Teka|DFI 46700 TTM|TR|FULLY_INTEGRATED_DISHWASHER|BLACK_PANEL", asin: "B08JMF53MQ", amazonUrl: "https://www.amazon.com.tr/dp/B08JMF53MQ", amazonTitle: "Teka DFI 46700 TTM Ankastre Bulaşık Makinesi", amazonPriceTry: 23500, amazonObservedAt: "2026-09-05T01:04:10.169Z", officialUrl: "https://www.teka.com/tr-tr/wp-content/uploads/sites/16/2022/08/TK-116-KATALOG-2021-sikis%CC%A7tirildi.pdf", officialDocumentType: "HISTORICAL_2021_TR_CATALOG_ONLY",
    facts: [{ key: "installationType", value: "FULLY_INTEGRATED", locator: "2021 catalog" }, { key: "placeSettings", value: 14, unit: "place_settings", locator: "2021 catalog" }, { key: "noiseDbA", value: 46, unit: "dB(A)", locator: "2021 catalog" }, { key: "widthMm", value: 596, unit: "mm", locator: "2021 catalog" }, { key: "heightMm", value: 820, unit: "mm", locator: "2021 catalog" }, { key: "depthMm", value: 550, unit: "mm", locator: "2021 catalog" }], capabilities: [{ key: "aquaStop", locator: "2021 catalog" }], unknowns: ["Current-regime energy consumption and water consumption are unknown.", "Current manufacturer lifecycle and exact current warranty applicability are unproven."], blockers: ["CURRENT_REGIME_ENERGY_EVIDENCE_MISSING", "WATER_CONSUMPTION_EVIDENCE_MISSING", "CURRENT_LIFECYCLE_EVIDENCE_MISSING"],
  },

  {
    disposition: "ADMITTED", categoryId: "REFRIGERATOR", offeringId: "appliances:refrigerator:tr:teka:rmf-77920-ss-eu-113430009", brand: "Teka", model: "RMF 77920 SS EU / 113430009", configuration: "Teka|RMF 77920 SS EU|113430009|TR|FREESTANDING_FOUR_DOOR|STAINLESS_STEEL", asin: "B07TX2JPL6", amazonUrl: "https://www.amazon.com.tr/dp/B07TX2JPL6", amazonTitle: "Teka RMF 77920 SS EU 4 Kapılı Solo Buzdolabı", amazonPriceTry: 141990, amazonObservedAt: "2026-09-05T01:04:43.659Z", officialUrl: "https://www.teka.com/tr-tr/urun/rmf-77920_113430009/", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_LEGACY_ENERGY_REGIME",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "TR_SUPPORT_AND_WARRANTY_REGISTRATION_PATH_PRESENT_DURATION_UNKNOWN", "EXACT_PRODUCT_DOCUMENT_TAB_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING_FOUR_DOOR", locator: "product identity and dimensions" }, { key: "totalVolumeL", value: 648, unit: "L_gross", locator: "product data sheet" }, { key: "refrigeratorVolumeL", value: 455, unit: "L", locator: "product data sheet" }, { key: "freezerVolumeL", value: 182, unit: "L", locator: "product data sheet" }, { key: "energyClass", value: "A_PLUS_PLUS_LEGACY_UNCOMPARABLE", locator: "official product page legacy label" }, { key: "annualEnergyKwh", value: 339, unit: "kWh/year", locator: "product data sheet" }, { key: "waterUseApplicability", value: "NOT_APPLICABLE_NO_PLUMBED_WATER_FUNCTION_ASSERTED", locator: "exact configuration capability list" }, { key: "noiseDbA", value: 43, unit: "dB(A)", locator: "product data sheet" }, { key: "widthMm", value: 908, unit: "mm", locator: "general dimensions" }, { key: "heightMm", value: 1935, unit: "mm", locator: "general dimensions" }, { key: "depthMm", value: 775, unit: "mm", locator: "general dimensions" }],
    capabilities: [{ key: "noFrost", locator: "product data sheet" }, { key: "convertibleCompartment", locator: "feature description" }, { key: "fastCooling", locator: "product data sheet" }, { key: "childLock", locator: "technical details" }],
    unknowns: ["A++ is a legacy energy regime and must not be compared to current A-G classes.", "Current base warranty duration and installation ventilation/door-clearance envelope are unknown; L9 is disabled."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "REFRIGERATOR", offeringId: "appliances:refrigerator:tr:arcelik:270475-mb", brand: "Arçelik", model: "270475 MB", configuration: "Arçelik|270475 MB|TR|FREESTANDING_BOTTOM_FREEZER|WHITE", asin: "B0GC9LYM64", amazonUrl: "https://www.amazon.com.tr/dp/B0GC9LYM64", amazonTitle: "Arçelik 270475 MB Alttan Donduruculu Buzdolabı", amazonPriceTry: 47999, amazonObservedAt: "2026-09-05T01:04:43.659Z", officialUrl: "https://www.arcelik.com.tr/no-frost-buzdolabi/270475-mb-buzdolabi", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_WITH_DOCUMENT_ENTRYPOINTS",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "TR_SUPPORT_APPLICABILITY_PROVEN_DURATION_RECHECK_AT_PURCHASE", "EXACT_TR_MANUAL_ENTRYPOINT_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING_BOTTOM_FREEZER", locator: "general specifications" }, { key: "totalVolumeL", value: 475, unit: "L", locator: "general specifications" }, { key: "refrigeratorVolumeL", value: 340, unit: "L", locator: "refrigerator compartment" }, { key: "freezerVolumeL", value: 135, unit: "L", locator: "freezer compartment" }, { key: "energyClass", value: "E", locator: "consumption information" }, { key: "annualEnergyKwh", value: 284.7, unit: "kWh/year", locator: "consumption information" }, { key: "waterUseApplicability", value: "NOT_APPLICABLE_NO_PLUMBED_WATER_FUNCTION_ASSERTED", locator: "exact configuration capability list" }, { key: "noiseDbA", value: 36, unit: "dB(A)", locator: "general specifications" }, { key: "widthMm", value: 700, unit: "mm", locator: "dimensions" }, { key: "heightMm", value: 1870, unit: "mm", locator: "dimensions" }, { key: "depthMm", value: 745, unit: "mm", locator: "dimensions" }],
    capabilities: [{ key: "noFrost", locator: "refrigerator compartment" }, { key: "reversibleDoor", locator: "general specifications" }, { key: "holidayMode", locator: "general specifications" }, { key: "powerCutStorageHours", locator: "general specifications" }],
    unknowns: ["Base warranty duration and ventilation/door-clearance envelope remain unknown.", "Exact manual bytes are not retained; L9 is disabled."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "REFRIGERATOR", offeringId: "appliances:refrigerator:tr:samsung:rb58ds75esa-tr", brand: "Samsung", model: "RB58DS75ESA/TR", configuration: "Samsung|RB58DS75ESA/TR|TR|FREESTANDING_BOTTOM_FREEZER|SILVER", asin: "B0FVYTWYXF", amazonUrl: "https://www.amazon.com.tr/dp/B0FVYTWYXF", amazonTitle: "Samsung RB58DS75ESA/TR Kombi No Frost Buzdolabı", amazonPriceTry: 62599, amazonObservedAt: "2026-09-05T01:04:43.659Z", officialUrl: "https://www.samsung.com/tr/business/refrigerators/bottom-mount-freezer/rb3000rm-twin-cooling-580l-silver-rb58ds75esa-tr/", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_FICHE_AND_SUPPORT",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "THIRTY_SIX_MONTH_BASE_PLUS_TEN_YEAR_DIGITAL_INVERTER_COMPRESSOR_PART", "EXACT_TR_MANUAL_ENTRYPOINT_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING_BOTTOM_FREEZER", locator: "installation" }, { key: "totalVolumeL", value: 580, unit: "L", locator: "capacity" }, { key: "refrigeratorVolumeL", value: 403, unit: "L", locator: "capacity" }, { key: "freezerVolumeL", value: 177, unit: "L", locator: "capacity" }, { key: "energyClass", value: "E", locator: "performance/product fiche" }, { key: "annualEnergyKwh", value: 323, unit: "kWh/year", locator: "product fiche" }, { key: "waterUseApplicability", value: "NOT_APPLICABLE_NO_PLUMBED_WATER_FUNCTION_ASSERTED", locator: "exact configuration capability list" }, { key: "noiseDbA", value: 43, unit: "dB(A)", locator: "performance/product fiche" }, { key: "widthMm", value: 840, unit: "mm", locator: "physical specifications" }, { key: "heightMm", value: 1860, unit: "mm", locator: "physical specifications" }, { key: "depthMm", value: 750, unit: "mm", locator: "physical specifications" }],
    capabilities: [{ key: "noFrost", locator: "cooling features" }, { key: "twinCooling", locator: "cooling type" }, { key: "reversibleDoor", locator: "product highlights" }, { key: "fastFreeze", locator: "product fiche" }],
    unknowns: ["Installation ventilation and door-open clearance envelope remain unknown.", "Exact manual bytes are not retained; L9 is disabled."], blockers: [],
  },
  {
    disposition: "ADMITTED", categoryId: "REFRIGERATOR", offeringId: "appliances:refrigerator:tr:samsung:rf57c510esr-tr", brand: "Samsung", model: "RF57C510ESR/TR", configuration: "Samsung|RF57C510ESR/TR|TR|FREESTANDING_FRENCH_DOOR|SILVER", asin: "B0DKFT7NVJ", amazonUrl: "https://www.amazon.com.tr/dp/B0DKFT7NVJ", amazonTitle: "Samsung RF57C510ESR/TR Gardırop Tipi No Frost Buzdolabı", amazonPriceTry: 95899, amazonObservedAt: "2026-09-05T01:04:43.659Z", officialUrl: "https://www.samsung.com/tr/business/refrigerators/french-door/rf5000a-550l-silver-rf57c510esr-tr/", officialDocumentType: "EXACT_CURRENT_TR_PRODUCT_PAGE_FICHE_AND_SUPPORT",
    facts: [...commonFacts("CURRENT_OFFICIAL_TR_PRODUCT_PAGE_AND_ACTIVE_AMAZON_TR_OFFER", "THIRTY_SIX_MONTH_BASE_PLUS_TEN_YEAR_DIGITAL_INVERTER_COMPRESSOR_PART", "EXACT_TR_MANUAL_ENTRYPOINT_PRESENT_NOT_PINNED"), { key: "installationType", value: "FREESTANDING_FRENCH_DOOR", locator: "product fiche" }, { key: "totalVolumeL", value: 550, unit: "L", locator: "capacity/product fiche" }, { key: "refrigeratorVolumeL", value: 364, unit: "L", locator: "capacity/product fiche" }, { key: "freezerVolumeL", value: 186, unit: "L", locator: "capacity/product fiche" }, { key: "energyClass", value: "E", locator: "performance/product fiche" }, { key: "annualEnergyKwh", value: 318, unit: "kWh/year", locator: "performance/product fiche" }, { key: "waterUseApplicability", value: "NOT_APPLICABLE_NO_PLUMBED_WATER_FUNCTION_ASSERTED", locator: "exact configuration capability list" }, { key: "noiseDbA", value: 40, unit: "dB(A)", locator: "performance/product fiche" }, { key: "widthMm", value: 817, unit: "mm", locator: "physical specifications" }, { key: "heightMm", value: 1776, unit: "mm", locator: "physical specifications" }, { key: "depthMm", value: 765, unit: "mm", locator: "physical specifications" }],
    capabilities: [{ key: "noFrost", locator: "cooling features" }, { key: "twinCoolingPlus", locator: "cooling type" }, { key: "wifi", locator: "smart features" }, { key: "doorAlarm", locator: "general features" }, { key: "fastFreeze", locator: "freezer features" }],
    unknowns: ["Installation ventilation and door-open clearance envelope remain unknown.", "Exact manual bytes are not retained; L9 is disabled."], blockers: [],
  },
];

const categoryConfig: Readonly<Record<CategoryId, {
  slug: string;
  candidateVersion: string;
  activePointerPath: string;
  decisionArtifact: string;
  semanticVersion: string;
  dimensions: readonly XpyComparisonDimension[];
}>> = {
  WASHING_MACHINE: {
    slug: "washing-machines", candidateVersion: "APPLIANCES-WM-CATALOG-RICHNESS-TR-v0.3-candidate", activePointerPath: "data/production/appliances/washing-machines/active.json", decisionArtifact: "catalog.json", semanticVersion: "WASHING_MACHINE_SEMANTIC_REGISTRY/v0.3-candidate",
    dimensions: [
      { dimensionId: "washing.capacity", humanLabel: "Anma kapasitesi", scope: "EXACT_TR_CONFIGURATION", source: { kind: "FACT", key: "ratedCapacityKg", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
      { dimensionId: "washing.energy-100", humanLabel: "100 çevrim enerji", scope: "SAME_REGIME_ONLY", source: { kind: "FACT", key: "energyPer100CyclesKwh", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
      { dimensionId: "washing.water", humanLabel: "Çevrim su tüketimi", scope: "ECO_40_60", source: { kind: "FACT", key: "waterPerCycleL", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
      { dimensionId: "washing.noise", humanLabel: "Sıkma sesi", scope: "REGULATORY_LABEL", source: { kind: "FACT", key: "noiseDbA", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
    ],
  },
  DRYER: {
    slug: "dryers", candidateVersion: "APPLIANCES-DRYER-CATALOG-RICHNESS-TR-v0.3-candidate", activePointerPath: "data/production/appliances/dryers/active.json", decisionArtifact: "domain-pack.json", semanticVersion: "DRYER_SEMANTIC_REGISTRY/v0.3-candidate",
    dimensions: [
      { dimensionId: "dryer.capacity", humanLabel: "Anma kuru yük kapasitesi", scope: "EXACT_TR_CONFIGURATION", source: { kind: "FACT", key: "ratedCapacityKg", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
      { dimensionId: "dryer.energy-100", humanLabel: "100 çevrim enerji", scope: "CURRENT_REGIME_ONLY", source: { kind: "FACT", key: "energyPer100CyclesKwh", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
      { dimensionId: "dryer.noise", humanLabel: "Kurutma sesi", scope: "REGULATORY_LABEL", source: { kind: "FACT", key: "noiseDbA", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
    ],
  },
  DISHWASHER: {
    slug: "dishwashers", candidateVersion: "APPLIANCES-DISHWASHER-CATALOG-RICHNESS-TR-v0.3-candidate", activePointerPath: "data/production/appliances/dishwashers/active.json", decisionArtifact: "domain-pack.json", semanticVersion: "DISHWASHER_SEMANTIC_REGISTRY/v0.3-candidate",
    dimensions: [
      { dimensionId: "dishwasher.capacity", humanLabel: "Kişilik kapasite", scope: "EXACT_TR_CONFIGURATION", source: { kind: "FACT", key: "placeSettings", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
      { dimensionId: "dishwasher.energy", humanLabel: "Eko çevrim enerji", scope: "CURRENT_REGIME_ECO", source: { kind: "FACT", key: "energyPerCycleKwh", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
      { dimensionId: "dishwasher.water", humanLabel: "Eko çevrim su", scope: "CURRENT_REGIME_ECO", source: { kind: "FACT", key: "waterPerCycleL", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
      { dimensionId: "dishwasher.noise", humanLabel: "Ses seviyesi", scope: "REGULATORY_LABEL", source: { kind: "FACT", key: "noiseDbA", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
    ],
  },
  REFRIGERATOR: {
    slug: "refrigerators", candidateVersion: "APPLIANCES-REFRIGERATOR-CATALOG-RICHNESS-TR-v0.3-candidate", activePointerPath: "data/production/appliances/refrigerators/active.json", decisionArtifact: "domain-pack.json", semanticVersion: "REFRIGERATOR_SEMANTIC_REGISTRY/v0.3-candidate",
    dimensions: [
      { dimensionId: "refrigerator.fresh-food-volume", humanLabel: "Soğutucu bölme hacmi", scope: "PUBLISHED_NET_COMPARTMENT_VOLUME", source: { kind: "FACT", key: "refrigeratorVolumeL", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
      { dimensionId: "refrigerator.energy", humanLabel: "Yıllık enerji", scope: "SAME_REGIME_ONLY", source: { kind: "FACT", key: "annualEnergyKwh", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
      { dimensionId: "refrigerator.noise", humanLabel: "Ses seviyesi", scope: "REGULATORY_LABEL", source: { kind: "FACT", key: "noiseDbA", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
    ],
  },
};

const requiredFactKeys: Readonly<Record<CategoryId, readonly string[]>> = {
  WASHING_MACHINE: ["lifecycleStatus", "warrantyServiceStatus", "installationGuidanceStatus", "safetyGuidanceStatus", "installationType", "ratedCapacityKg", "energyClass", "energyPer100CyclesKwh", "waterPerCycleL", "noiseDbA", "widthMm", "heightMm", "depthMm"],
  DRYER: ["lifecycleStatus", "warrantyServiceStatus", "installationGuidanceStatus", "safetyGuidanceStatus", "installationType", "ratedCapacityKg", "energyClass", "energyPer100CyclesKwh", "waterUseApplicability", "noiseDbA", "widthMm", "heightMm", "depthMm"],
  DISHWASHER: ["lifecycleStatus", "warrantyServiceStatus", "installationGuidanceStatus", "safetyGuidanceStatus", "installationType", "placeSettings", "energyClass", "energyPerCycleKwh", "waterPerCycleL", "noiseDbA", "widthMm", "heightMm", "depthMm"],
  REFRIGERATOR: ["lifecycleStatus", "warrantyServiceStatus", "installationGuidanceStatus", "safetyGuidanceStatus", "installationType", "totalVolumeL", "energyClass", "annualEnergyKwh", "waterUseApplicability", "noiseDbA", "widthMm", "heightMm", "depthMm"],
};

function evidenceFor(spec: CandidateSpec, input: FactInput | CapabilityInput, kind: "TECHNICAL" | "CAPABILITY", entityId: string, sourceId: string): CatalogEvidence {
  return {
    evidenceId: `adoption-evidence:${slug(spec.offeringId)}:${slug(input.key)}`,
    kind,
    sourceId,
    assertionId: `adoption-assertion:${slug(spec.offeringId)}:${slug(input.key)}`,
    offeringIds: [spec.offeringId],
    market: "TR",
    observedAt: reviewedAt,
    reviewedAt,
    confidence: "HIGH",
    status: "REVIEWED",
    limitations: kind === "TECHNICAL" ? ["Exact Türkiye configuration only; published measurement context applies."] : [...(input as CapabilityInput).limitations ?? []],
    assertion: { locator: input.locator, value: kind === "TECHNICAL" ? (input as FactInput).value : true, unit: kind === "TECHNICAL" ? (input as FactInput).unit : undefined, applicability: { offeringId: spec.offeringId, market: "TR", model: spec.model, configuration: spec.configuration, status: "EXACT" } },
  };
}

async function main(): Promise<void> {
  const pack = requireXpyDomainPack("APPLIANCES");
  const admitted = specs.filter((item) => item.disposition === "ADMITTED");
  const blocked = specs.filter((item) => item.disposition === "BLOCKED_EVIDENCE");
  if (specs.length !== 17 || admitted.length !== 16 || blocked.length !== 1) throw new Error("BOUNDED_CANDIDATE_SET_CHANGED");
  if (new Set(specs.map((item) => item.asin)).size !== specs.length || new Set(specs.map((item) => item.offeringId)).size !== specs.length) throw new Error("CANDIDATE_IDENTITY_COLLISION");
  for (const item of admitted) {
    const present = new Set(item.facts.map((fact) => fact.key));
    const missing = requiredFactKeys[item.categoryId].filter((key) => !present.has(key));
    if (missing.length || item.blockers.length) throw new Error(`ADMISSION_GATE_FAILED:${item.offeringId}:${missing.join(",")}`);
  }

  await mkdir(outputRoot, { recursive: true });
  const categoryBindings: unknown[] = [];
  const l10Snapshots = {} as Record<CategoryId, XpyExternalOfferingSnapshot>;
  const batchSourceRegister: unknown[] = [];
  const batchCoverage: unknown[] = [];

  for (const categoryId of Object.keys(categoryConfig) as CategoryId[]) {
    const config = categoryConfig[categoryId];
    const categorySpecs = admitted.filter((item) => item.categoryId === categoryId);
    const activePointerRaw = await readFile(path.join(root, config.activePointerPath), "utf8");
    const active = JSON.parse(activePointerRaw) as { releaseVersion: string; artifactSha256?: string; richness?: { releaseVersion?: string; catalogArtifactSha256?: string } };
    if (!active.richness?.releaseVersion || !active.richness.catalogArtifactSha256) throw new Error(`ACTIVE_RICHNESS_POINTER_MISSING:${categoryId}`);
    const decisionArtifactPath = `data/production/appliances/${config.slug}/releases/${active.releaseVersion}/${config.decisionArtifact}`;
    const [decisionRaw, parentReleaseRaw] = await Promise.all([
      readFile(path.join(root, decisionArtifactPath), "utf8"),
      readFile(path.join(root, `data/production/appliances/${config.slug}/richness/releases/${active.richness.releaseVersion}/catalog-release.json`), "utf8"),
    ]);
    let decisionArtifactSha256 = active.artifactSha256;
    if (!decisionArtifactSha256) {
      const decisionManifestRaw = await readFile(
        path.join(root, `data/production/appliances/${config.slug}/releases/${active.releaseVersion}/manifest.json`),
        "utf8",
      );
      const decisionManifest = JSON.parse(decisionManifestRaw) as { catalogArtifactSha256?: string };
      decisionArtifactSha256 = decisionManifest.catalogArtifactSha256;
    }
    if (!decisionArtifactSha256 || sha256(decisionRaw) !== decisionArtifactSha256 || sha256(parentReleaseRaw) !== active.richness.catalogArtifactSha256) throw new Error(`ACTIVE_PARENT_DIGEST_MISMATCH:${categoryId}`);
    const parent = JSON.parse(parentReleaseRaw) as XpyCatalogRelease;
    if (validateXpyCatalogRelease(parent).length) throw new Error(`ACTIVE_PARENT_RELEASE_INVALID:${categoryId}`);
    const parentIdentity = new Set(parent.offerings.map((item) => item.identity.kind === "PRODUCT" ? `${item.identity.manufacturer}|${item.identity.model}|${item.identity.configuration}` : item.offeringId));
    if (categorySpecs.some((item) => parentIdentity.has(`${item.brand}|${item.model}|${item.configuration}`))) throw new Error(`DUPLICATE_EXISTING_EXACT_CONFIGURATION:${categoryId}`);

    const newSources: CatalogSource[] = categorySpecs.map((item) => ({
      sourceId: `adoption-source:${slug(item.offeringId)}:official-tr`, kind: "OFFICIAL", uri: item.officialUrl, version: `observed-${reviewedAt.slice(0, 10)}`, observedAt: reviewedAt, reviewedAt, market: "TR", applicabilityStatus: "EXACT", status: "REVIEWED", language: "tr-TR",
    }));
    const sourceByOffering = new Map(categorySpecs.map((item, index) => [item.offeringId, newSources[index].sourceId]));
    const newEvidence: CatalogEvidence[] = [];
    const newFacts: ObjectiveFact[] = [];
    const newCapabilities: Capability[] = [];
    for (const item of categorySpecs) {
      const sourceId = sourceByOffering.get(item.offeringId)!;
      for (const fact of item.facts) {
        const factId = `adoption-fact:${slug(item.offeringId)}:${slug(fact.key)}`;
        const evidence = evidenceFor(item, fact, "TECHNICAL", factId, sourceId);
        newEvidence.push(evidence);
        newFacts.push({ factId, offeringId: item.offeringId, key: fact.key, value: fact.value, unit: fact.unit, evidenceId: evidence.evidenceId });
      }
      for (const capability of item.capabilities) {
        const capabilityId = `adoption-capability:${slug(item.offeringId)}:${slug(capability.key)}`;
        const evidence = evidenceFor(item, capability, "CAPABILITY", capabilityId, sourceId);
        newEvidence.push(evidence);
        newCapabilities.push({ capabilityId, offeringId: item.offeringId, key: capability.key, state: "PRESENT", evidenceId: evidence.evidenceId, limitations: [...capability.limitations ?? []] });
      }
    }

    const categoryFactIds = newFacts.map((item) => item.factId);
    const categoryCapabilityIds = newCapabilities.map((item) => item.capabilityId);
    const needId = `ADOPTION_${categoryId}_DOCUMENTED_FIT`;
    const mappingId = `adoption-need-map:${slug(categoryId)}:documented-fit`;
    const newSemantic = { semanticId: `adoption-semantic:${slug(categoryId)}:published-context`, meaning: "Published capacity, dimensions, energy, water and noise are exact-configuration evidence with their stated regimes; they do not guarantee fit, bills, quietness, service outcomes or household results.", factIds: categoryFactIds, capabilityIds: categoryCapabilityIds };
    const newNeed = { needId, meaning: "Check an explicit load/storage, installation, consumption, noise, safety, warranty or lifecycle requirement against exact Türkiye evidence." };
    const newMapping = { mappingId, needId, eligibleFactIds: categoryFactIds, eligibleCapabilityIds: categoryCapabilityIds, policy: "QUESTION_INPUT" as const };
    const newPersona = { signalId: `adoption-planning:${slug(categoryId)}:documented-fit`, needIds: [needId], authority: "DOMAIN_PLANNING" as const, classification: "DERIVED_PLANNING" as const, decisionUse: "NONE" as const, directCandidateEffect: "NONE" as const };
    const newInterpretations = categorySpecs.map((item) => ({
      interpretationId: `adoption-interpretation:${slug(item.offeringId)}:published-fit`, offeringId: item.offeringId,
      text: "Published capacity and body dimensions can support an explicit fit check. Consumption and noise remain label/regime-bound; actual use, room acoustics, load mix, installation and tariffs can change lived outcomes.",
      factIds: newFacts.filter((fact) => fact.offeringId === item.offeringId).map((fact) => fact.factId), capabilityIds: newCapabilities.filter((capability) => capability.offeringId === item.offeringId).map((capability) => capability.capabilityId), method: "DETERMINISTIC_REVIEWED_MAPPING" as const, reviewedAt, polarity: "NEUTRAL" as const,
      limitations: ["No result, savings, quietness, freshness, care or longevity guarantee."], nonGuarantees: ["No direct candidate rank, score, Y authorization or purchase recommendation effect."],
    }));
    const evidenceByOffering = (id: string) => newEvidence.filter((item) => item.offeringIds.includes(id)).map((item) => item.evidenceId);
    const newProjections = categorySpecs.map((item) => ({
      projectionId: `adoption-decision-projection:${slug(item.offeringId)}`, offeringId: item.offeringId, eligibleEvidenceIds: evidenceByOffering(item.offeringId), needMappingIds: [mappingId],
      limitations: ["Only explicit user needs and comparable exact-configuration evidence may be projected.", "Unknown and incomparable values remain neutral and fail closed."],
      disclosures: ["Persona planning, daily-life interpretation, Amazon price and manual content have no Y authority.", "This candidate is inactive until Product-owner approval and transactional pointer activation."], traceability: "EXACT" as const,
    }));

    const semanticPayload = { version: config.semanticVersion, semantic: newSemantic, need: newNeed, mapping: newMapping, persona: newPersona, dailyLife: newInterpretations, boundaries: { personaDecisionUse: "NONE", experienceAuthority: "NONE", manualDecisionAuthority: "NONE", commerceAuthority: "NONE", unknownTreatment: "NEUTRAL_FAIL_CLOSED" } };
    const unsigned: Omit<XpyCatalogRelease, "releaseDigest"> = {
      ...parent,
      schemaVersion: XPY_CATALOG_VERSION,
      releaseId: `appliances:${slug(categoryId)}:catalog-adoption:tr:v0.3-candidate`,
      releaseVersion: config.candidateVersion,
      lifecycle: "FROZEN",
      effectiveAt: reviewedAt,
      compatibility: { runtime: { version: XPY_RUNTIME_VERSION, digest: XPY_RUNTIME_DIGEST, domainPackId: pack.domainPackId }, domainPackVersion: pack.domainPackId, semanticAuthorityVersion: config.semanticVersion, semanticAuthorityDigest: digest(semanticPayload), revisionClass: "SEMANTIC_POLICY_CHANGE", semanticAuthorityChange: "VERSIONED_CHANGE" },
      sources: Object.freeze([...parent.sources, ...newSources]),
      evidence: Object.freeze([...parent.evidence, ...newEvidence]),
      offerings: Object.freeze([...parent.offerings, ...categorySpecs.map((item) => ({ offeringId: item.offeringId, market: "TR", lifecycle: "FROZEN" as const, validFrom: reviewedAt, identity: { kind: "PRODUCT" as const, manufacturer: item.brand, model: item.model, configuration: item.configuration, identifiers: { asin: item.asin, manufacturerModelCode: item.model } } }))]),
      layers: {
        l1Facts: Object.freeze([...parent.layers.l1Facts, ...newFacts]),
        l2Capabilities: Object.freeze([...parent.layers.l2Capabilities, ...newCapabilities]),
        l3UsageSemantics: Object.freeze([...parent.layers.l3UsageSemantics, newSemantic]),
        l4Needs: Object.freeze([...parent.layers.l4Needs, newNeed]),
        l4NeedEvidenceMappings: Object.freeze([...parent.layers.l4NeedEvidenceMappings, newMapping]),
        l5PersonaSignals: Object.freeze([...parent.layers.l5PersonaSignals, newPersona]),
        l6DailyLifeInterpretations: Object.freeze([...parent.layers.l6DailyLifeInterpretations, ...newInterpretations]),
        l7ExperienceRules: Object.freeze([...parent.layers.l7ExperienceRules]),
        l8DecisionProjections: Object.freeze([...parent.layers.l8DecisionProjections, ...newProjections]),
        l9AdvisorKnowledge: Object.freeze(parent.layers.l9AdvisorKnowledge.map((item) => ({ ...item, offeringVersion: config.candidateVersion }))),
      },
      externalBoundaries: { commerce: "EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY", media: "EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY", offerIdentityAuthority: "NONE", offerRankingAuthority: "NONE", affiliateRankingAuthority: "NONE" },
    };
    const release: XpyCatalogRelease = Object.freeze({ ...unsigned, releaseDigest: xpyCatalogReleaseDigest(unsigned) });
    const issues = validateXpyCatalogRelease(release);
    if (issues.length) throw new Error(`CANDIDATE_RELEASE_INVALID:${categoryId}:${issues.join(",")}`);

    const comparison = projectComparisonEvidence({ release, authorization: { purchaseStatus: "PURCHASED", entitlementId: "GOVERNANCE-VERIFICATION-NON-PRODUCTION", comparisonSetId: `${categoryId}-ADOPTION-VERIFICATION`, exactOfferingIds: categorySpecs.map((item) => item.offeringId) }, dimensions: config.dimensions });
    const advisors = categorySpecs.map((item) => projectAdvisorRead({ release, authorizedDecision: { decisionId: `ADOPTION-VERIFICATION:${item.offeringId}`, exactOfferingId: item.offeringId } }));
    const projectionArtifact = { schemaVersion: "major-appliance-adoption-read-projections/v1", status: "NON_PRODUCTION_GOVERNANCE_VERIFICATION", candidateReleaseDigest: release.releaseDigest, comparison, advisors };
    const coverage = {
      schemaVersion: "major-appliance-category-adoption-coverage/v1", categoryId, workUnitId, verdict: "ADMITTED_TO_FROZEN_CANDIDATE_RELEASE_ACTIVATION_BLOCKED_APPROVAL",
      counts: { priorOfferings: parent.offerings.length, admittedOfferings: categorySpecs.length, candidateOfferings: release.offerings.length, newSources: newSources.length, newEvidenceAssertions: newEvidence.length, newFacts: newFacts.length, newCapabilities: newCapabilities.length, newDailyLifeInterpretations: newInterpretations.length, newDecisionProjections: newProjections.length, newAdvisorKnowledge: 0 },
      layers: { L0: "COMPLETE", L1: "COMPLETE", L2: "COMPLETE", L3: "COMPLETE", L4: "COMPLETE", L5: "COMPLETE_PLANNING_ONLY_NO_Y", L6: "COMPLETE_SEPARATE_FROM_TECHNICAL_TRUTH", L7: "ABSENT_NO_GOVERNED_EXPERIENCE", L8: "COMPLETE_NEUTRAL_UNKNOWN_LIMITED", L9: "DISABLED_NO_CHECKSUM_PINNED_EXACT_MANUAL", L10: "PARTIAL_EXTERNAL_VOLATILE_AMAZON_ONLY" },
      perProduct: categorySpecs.map((item) => ({ offeringId: item.offeringId, disposition: item.disposition, layerCoverage: { L0: "COMPLETE", L1: "COMPLETE", L2: "COMPLETE", L3: "COMPLETE", L4: "COMPLETE", L5: "COMPLETE_NO_Y", L6: "COMPLETE_NEUTRAL", L7: "ABSENT", L8: "COMPLETE", L9: "DISABLED", L10: "VOLATILE" }, unknowns: item.unknowns })),
      nonRegression: { existingOfferingsRetained: parent.offerings.every((item) => release.offerings.some((next) => next.offeringId === item.offeringId)), existingEvidenceRetained: parent.evidence.every((item) => release.evidence.some((next) => next.evidenceId === item.evidenceId)), activePointerChanged: false, currentYAuthorityChanged: false, rankingOrRemovalIntroduced: false },
    };
    const semanticArtifact = { schemaVersion: "major-appliance-adoption-semantic-registry/v1", categoryId, releaseVersion: config.candidateVersion, semanticAuthorityVersion: config.semanticVersion, semanticAuthorityDigest: release.compatibility.semanticAuthorityDigest, additions: semanticPayload, boundaries: { L5: "PLANNING_ONLY_NO_Y", L6: "SEPARATE_INTERPRETATION_NOT_TECHNICAL_TRUTH", L7: "ABSENT", L9: "DISABLED_WITHOUT_PINNED_ARTIFACT_CHECKSUM_AND_LOCATOR", L10: "EXTERNAL_VOLATILE_ONLY" } };
    const sourceRegister = categorySpecs.map((item) => ({ offeringId: item.offeringId, officialSource: item.officialUrl, officialDocumentType: item.officialDocumentType, amazonSource: item.amazonUrl, amazonAuthority: "L10_VOLATILE_ONLY", factLocators: item.facts.map((fact) => ({ key: fact.key, locator: fact.locator })), manualAuthority: "DISABLED_NO_PINNED_BYTES_CHECKSUM_LOCATOR" }));
    const unknownRegister = categorySpecs.map((item) => ({ offeringId: item.offeringId, unknowns: item.unknowns, treatment: "NEUTRAL_NO_PENALTY_NO_INFERENCE" }));
    const releaseRaw = stable(release);
    const semanticRaw = stable(semanticArtifact);
    const coverageRaw = stable(coverage);
    const projectionsRaw = stable(projectionArtifact);
    const sourcesRaw = stable(sourceRegister);
    const unknownsRaw = stable(unknownRegister);
    const ids = release.offerings.map((item) => item.offeringId).sort();
    const categoryOut = path.join(outputRoot, config.slug);
    const relativeBase = `${MAJOR_APPLIANCE_ADOPTION_ROOT}/${config.slug}`;
    const manifest = {
      schemaVersion: "major-appliance-category-adoption-manifest/v1", workUnitId, categoryId, releaseVersion: config.candidateVersion, releaseDigest: release.releaseDigest,
      catalogArtifactSha256: sha256(releaseRaw), semanticArtifactSha256: sha256(semanticRaw), coverageArtifactSha256: sha256(coverageRaw), projectionsArtifactSha256: sha256(projectionsRaw), sourceRegisterArtifactSha256: sha256(sourcesRaw), unknownRegisterArtifactSha256: sha256(unknownsRaw), membershipDigest: sha256(ids.join("\n")), memberCount: ids.length, priorMemberCount: parent.offerings.length, admittedOfferingIds: categorySpecs.map((item) => item.offeringId),
      parent: { activePointerPath: config.activePointerPath, activePointerSha256: sha256(activePointerRaw), decisionReleaseVersion: active.releaseVersion, decisionArtifactPath, decisionArtifactSha256, richnessReleaseVersion: active.richness.releaseVersion, richnessCatalogArtifactSha256: active.richness.catalogArtifactSha256, relationship: "IMMUTABLE_SUCCESSOR_CANDIDATE_NO_OVERWRITE" },
      compatibility: release.compatibility,
      activation: { performed: false, status: "BLOCKED_MANDATORY_PRODUCT_OWNER_APPROVAL", blocker: "Product membership changes decision authority. Existing read-only richness approval does not authorize new members." },
    } as const;
    const manifestRaw = stable(manifest);
    await mkdir(categoryOut, { recursive: true });
    await Promise.all([
      writeFile(path.join(categoryOut, "catalog-release.json"), releaseRaw, "utf8"),
      writeFile(path.join(categoryOut, "semantic-registry.json"), semanticRaw, "utf8"),
      writeFile(path.join(categoryOut, "coverage-report.json"), coverageRaw, "utf8"),
      writeFile(path.join(categoryOut, "read-projections.json"), projectionsRaw, "utf8"),
      writeFile(path.join(categoryOut, "source-register.json"), sourcesRaw, "utf8"),
      writeFile(path.join(categoryOut, "unknown-register.json"), unknownsRaw, "utf8"),
      writeFile(path.join(categoryOut, "manifest.json"), manifestRaw, "utf8"),
    ]);
    categoryBindings.push({ categoryId, releasePath: `${relativeBase}/catalog-release.json`, manifestPath: `${relativeBase}/manifest.json`, releaseVersion: config.candidateVersion, catalogArtifactSha256: sha256(releaseRaw), manifestArtifactSha256: sha256(manifestRaw), membershipDigest: manifest.membershipDigest, memberCount: manifest.memberCount, priorMemberCount: manifest.priorMemberCount, admittedOfferingIds: manifest.admittedOfferingIds, activePointerPath: config.activePointerPath, activePointerSha256: sha256(activePointerRaw), activeDecisionReleaseVersion: active.releaseVersion, activeDecisionArtifactPath: decisionArtifactPath, activeDecisionArtifactSha256: decisionArtifactSha256 });
    l10Snapshots[categoryId] = { schemaVersion: "XPY_CATALOG_EXTERNAL_SNAPSHOT/v0.1", snapshotId: `amazon-tr:${slug(categoryId)}:${reviewedAt.slice(0, 10)}`, observedAt: categorySpecs.map((item) => item.amazonObservedAt).sort()[0], expiresAt: "2026-09-06T01:05:02.676Z", market: "TR", offers: categorySpecs.map((item) => ({ offerId: `amazon-tr:${item.asin}`, offeringId: item.offeringId, merchant: "Amazon.com.tr marketplace search observation", amount: item.amazonPriceTry, currency: "TRY", affiliate: false })), media: [] };
    batchSourceRegister.push(...sourceRegister);
    batchCoverage.push(coverage);
  }

  const l10Raw = stable(l10Snapshots);
  const ledger = specs.map((item) => ({ categoryId: item.categoryId, offeringId: item.offeringId, brand: item.brand, model: item.model, asin: item.asin, disposition: item.disposition, blockers: item.blockers, activationStatus: item.disposition === "ADMITTED" ? "BLOCKED_MANDATORY_PRODUCT_OWNER_APPROVAL" : "NOT_APPLICABLE_EVIDENCE_BLOCKED", noDisadvantage: "NO_EXISTING_PRODUCT_REMOVED_DOWNGRADED_OR_REORDERED" }));
  const ledgerRaw = stable(ledger);
  const batchSourceRegisterRaw = stable(batchSourceRegister);
  const batchCoverageRaw = stable(batchCoverage);
  const approval = {
    schemaVersion: "major-appliance-catalog-adoption-approval-package/v1", workUnitId, releaseId: MAJOR_APPLIANCE_ADOPTION_RELEASE, requestedApproval: "PRODUCT_OWNER_MEMBERSHIP_AND_DECISION_AUTHORITY_ACTIVATION", status: "AWAITING_MANDATORY_APPROVAL", approved: false,
    scope: { admittedProducts: 16, categories: 4, removals: 0, replacements: 0, rankingChanges: 0, blockedEvidenceProducts: 1 },
    candidateBindings: categoryBindings,
    approvalsRequired: [{ role: "PRODUCT_OWNER", decision: "PENDING", scope: "NEW_CATEGORY_MEMBERSHIP_AND_TRANSACTIONAL_ACTIVE_POINTER_CHANGE" }],
    transactionPlan: ["Re-review volatile lifecycle/warranty/offer state at activation time.", "Materialize category-native decision-authority successor releases from these approved exact identities without replacing current members.", "Rebind v0.3 richness candidates to the approved native parents and rerun fail-closed loaders.", "Create immutable activation events with approval identity and artifact digests.", "Atomically update all four category active pointers; abort the whole transaction on any digest, membership, identity, compatibility or projection failure."],
    rollback: "Before pointer commit, no runtime rollback is needed. After an approved atomic activation, restore all four prior pointer bytes as one transaction if post-activation verification fails.",
    forbidden: ["SELF_APPROVAL", "PARTIAL_POINTER_ACTIVATION", "AMAZON_AS_PRODUCT_TRUTH", "MANUAL_PROSE_WITHOUT_CHECKSUM_AND_LOCATOR", "RANKING_OR_REMOVAL_OF_EXISTING_PRODUCTS"],
  };
  const approvalRaw = stable(approval);
  const summary = `# Major-appliance catalog adoption candidate\n\n- Work unit: ${workUnitId}\n- Verdict: 16 admitted to immutable candidate releases; 1 blocked on evidence; activation blocked on mandatory Product-owner approval.\n- Active pointers changed: no. Existing products removed, replaced, downgraded or reordered: none.\n- New candidate releases: ${categoryBindings.map((item) => (item as { releaseVersion: string }).releaseVersion).join(", ")}.\n- L0-L6 and L8: populated for every admitted product. L5 is planning-only with no Y authority; L6 is separate from technical truth.\n- L7: absent because no governed experience authority was admitted.\n- L9: disabled for all 16 additions because exact manual bytes/checksums were not retained, even where an official manual entrypoint exists.\n- L10: Amazon.com.tr ASIN/price observations are external, volatile and non-authoritative; no Amazon media bytes were ingested.\n- Evidence hold: Teka DFI 46700 TTM lacks current-regime energy/water and current lifecycle evidence; it is not present in any candidate release.\n`;
  const aggregateArtifacts = {
    candidateLedger: { path: `${MAJOR_APPLIANCE_ADOPTION_ROOT}/candidate-ledger.json`, sha256: sha256(ledgerRaw) },
    sourceRegister: { path: `${MAJOR_APPLIANCE_ADOPTION_ROOT}/source-register.json`, sha256: sha256(batchSourceRegisterRaw) },
    coverageReport: { path: `${MAJOR_APPLIANCE_ADOPTION_ROOT}/coverage-report.json`, sha256: sha256(batchCoverageRaw) },
    approvalPackage: { path: `${MAJOR_APPLIANCE_ADOPTION_ROOT}/activation-approval-package.json`, sha256: sha256(approvalRaw) },
    summary: { path: `${MAJOR_APPLIANCE_ADOPTION_ROOT}/summary.md`, sha256: sha256(summary) },
  } as const;
  const batchManifestWithoutDigest = {
    schemaVersion: "major-appliance-catalog-adoption-batch/v1", workUnitId, releaseId: MAJOR_APPLIANCE_ADOPTION_RELEASE, lifecycle: "FROZEN_CANDIDATE", generatedAt: reviewedAt,
    counts: { inputCandidates: 17, admitted: 16, blockedEvidence: 1, rejected: 0 }, admittedCount: 16, blockedEvidenceCount: 1, categories: categoryBindings,
    decisionNeutrality: { activePointersChanged: false, currentCandidateSelectionChanged: false, currentYAuthorizationChanged: false, existingProductsRemoved: 0, existingProductsDisadvantaged: 0 },
    aggregateArtifacts,
    l10SnapshotPath: `${MAJOR_APPLIANCE_ADOPTION_ROOT}/l10-commerce-snapshot.json`, l10SnapshotSha256: sha256(l10Raw),
    activation: { status: "BLOCKED_MANDATORY_PRODUCT_OWNER_APPROVAL", pointersChanged: false, approvalArtifact: aggregateArtifacts.approvalPackage.path, approvalArtifactSha256: aggregateArtifacts.approvalPackage.sha256 },
  } as const;
  const batchManifest = { ...batchManifestWithoutDigest, batchDigest: `sha256:${sha256(JSON.stringify({ ...batchManifestWithoutDigest, batchDigest: undefined }))}` };
  await Promise.all([
    writeFile(path.join(outputRoot, "batch-manifest.json"), stable(batchManifest), "utf8"),
    writeFile(path.join(outputRoot, "candidate-ledger.json"), ledgerRaw, "utf8"),
    writeFile(path.join(outputRoot, "source-register.json"), batchSourceRegisterRaw, "utf8"),
    writeFile(path.join(outputRoot, "coverage-report.json"), batchCoverageRaw, "utf8"),
    writeFile(path.join(outputRoot, "l10-commerce-snapshot.json"), l10Raw, "utf8"),
    writeFile(path.join(outputRoot, "activation-approval-package.json"), approvalRaw, "utf8"),
    writeFile(path.join(outputRoot, "summary.md"), summary, "utf8"),
  ]);

  const loaded = await loadMajorApplianceCatalogAdoptionCandidate(root);
  if (loaded.status !== "READY_FOR_PRODUCT_OWNER_APPROVAL") throw new Error(`POST_WRITE_LOAD_FAILED:${loaded.reason}`);
  console.log(`${MAJOR_APPLIANCE_ADOPTION_RELEASE}: 16 admitted, 1 evidence-blocked, activation approval-gated; ${batchManifest.batchDigest}`);
}

void main();
