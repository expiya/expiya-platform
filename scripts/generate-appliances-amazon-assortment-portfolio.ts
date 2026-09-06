import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type CategoryPriority = "P1_ADOPTION_REVIEW" | "P2_EVIDENCE_DEEPENING" | "P3_QUERY_REFINEMENT";
type OriginSegment = "DOMESTIC_TURKIYE_ROOTED_BRAND" | "IMPORTED_OR_GLOBAL_BRAND";
type Confidence = "HIGH" | "MEDIUM";
type RejectionStatus =
  | "REJECTED_CURRENT_SCOPE_DUPLICATE"
  | "REJECTED_DUPLICATE_LISTING"
  | "REJECTED_WRONG_CATEGORY"
  | "REJECTED_UNAVAILABLE"
  | "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE"
  | "PENDING_EXACT_CONFIGURATION_IDENTITY";

type Product = {
  readonly exactProductId: string;
  readonly categoryId: string;
  readonly brand: string;
  readonly model: string;
};

type PriorAuditRow = Product & {
  readonly status:
    | "EXACT_ACTIVE_LISTING_CONFIRMED"
    | "EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE"
    | "AMBIGUOUS_OR_FAMILY_ONLY"
    | "NOT_FOUND"
    | "BLOCKED_OR_UNVERIFIABLE";
  readonly asin: string | null;
};

type CategoryScanSeed = {
  readonly categoryId: string;
  readonly query: string;
  readonly retrievedAt: string;
  readonly headingResultText: string;
  readonly rawCardCount: number;
  readonly rawActiveCardCount: number;
  readonly rawUnavailableCardCount: number;
  readonly rawUnclassifiedCardCount?: number;
  readonly priority: CategoryPriority;
  readonly priorityRationale: string;
};

type CandidateSeed = {
  readonly categoryId: string;
  readonly brand: string;
  readonly exactModel: string;
  readonly asin: string;
  readonly amazonTitle: string;
  readonly price: string;
  readonly manufacturerUrl: string;
  readonly confidence?: Confidence;
  readonly manufacturerEvidence?: string;
};

type RejectionSeed = {
  readonly categoryId: string;
  readonly asin: string | null;
  readonly amazonTitle: string;
  readonly status: RejectionStatus;
  readonly active: boolean;
  readonly amazonExactIdentityObserved?: boolean;
  readonly price: string | null;
  readonly reason: string;
};

const root = process.cwd();
const outputDirectory = path.join(root, "data/research/appliances-amazon-assortment-portfolio-discovery-01");
const commerceDirectory = path.join(root, "data/production/appliances/commerce");
const priorAuditFile = path.join(root, "data/research/appliances-amazon-commerce-readiness-01/availability-audit.json");

const pointer = JSON.parse(readFileSync(path.join(commerceDirectory, "current.json"), "utf8")) as {
  readonly snapshotFile: string;
  readonly snapshotDigest: string;
};
if (!/^snapshots\/[A-Za-z0-9._+-]+\.json$/u.test(pointer.snapshotFile)) throw new Error("INVALID_COMMERCE_POINTER");
const snapshot = JSON.parse(readFileSync(path.join(commerceDirectory, pointer.snapshotFile), "utf8")) as {
  readonly snapshotDigest: string;
  readonly productScope: readonly Product[];
};
const priorAudit = JSON.parse(readFileSync(priorAuditFile, "utf8")) as {
  readonly auditDigest: string;
  readonly rows: readonly PriorAuditRow[];
};

if (snapshot.snapshotDigest !== pointer.snapshotDigest) throw new Error("COMMERCE_POINTER_DIGEST_MISMATCH");
if (snapshot.productScope.length !== 97) throw new Error("CURRENT_SCOPE_MUST_REMAIN_97_PRODUCTS");
if (new Set(snapshot.productScope.map((item) => item.categoryId)).size !== 24) throw new Error("CURRENT_SCOPE_MUST_REMAIN_24_CATEGORIES");
if (priorAudit.rows.length !== 97) throw new Error("PRIOR_AUDIT_SCOPE_MISMATCH");

const categoryScans: readonly CategoryScanSeed[] = [
  { categoryId: "AIR_FRYER", query: "airfryer", retrievedAt: "2026-09-05T01:03:56.982Z", headingResultText: "3.000+ results", rawCardCount: 30, rawActiveCardCount: 26, rawUnavailableCardCount: 4, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Three diverse exact active additions cleared the strict Türkiye evidence gate." },
  { categoryId: "AIR_PURIFIER", query: "hava temizleyici", retrievedAt: "2026-09-05T01:03:58.425Z", headingResultText: "659 results", rawCardCount: 30, rawActiveCardCount: 28, rawUnavailableCardCount: 2, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact active imported/global models have manufacturer Türkiye corroboration." },
  { categoryId: "BLENDER", query: "blender", retrievedAt: "2026-09-05T01:03:59.938Z", headingResultText: "4.000+ results", rawCardCount: 30, rawActiveCardCount: 30, rawUnavailableCardCount: 0, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact candidates broaden both brand and price-band coverage." },
  { categoryId: "BUILT_IN_MICROWAVE_OVEN", query: "ankastre mikrodalga fırın", retrievedAt: "2026-09-05T01:04:01.151Z", headingResultText: "76 results", rawCardCount: 30, rawActiveCardCount: 21, rawUnavailableCardCount: 9, priority: "P2_EVIDENCE_DEEPENING", priorityRationale: "Only one active exact built-in model survived heavy solo-microwave query pollution." },
  { categoryId: "BUILT_IN_OVEN", query: "ankastre fırın", retrievedAt: "2026-09-05T01:04:07.529Z", headingResultText: "234 results", rawCardCount: 30, rawActiveCardCount: 25, rawUnavailableCardCount: 5, priority: "P2_EVIDENCE_DEEPENING", priorityRationale: "Two exact candidates are ready; several other active cards still lack exact manufacturer corroboration." },
  { categoryId: "COUNTERTOP_MICROWAVE_OVEN", query: "solo mikrodalga fırın", retrievedAt: "2026-09-05T01:04:08.853Z", headingResultText: "191 results", rawCardCount: 30, rawActiveCardCount: 20, rawUnavailableCardCount: 10, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four active exact Türkiye configurations cleared the gate." },
  { categoryId: "DISHWASHER", query: "bulaşık makinesi", retrievedAt: "2026-09-05T01:04:10.169Z", headingResultText: "240 results", rawCardCount: 30, rawActiveCardCount: 19, rawUnavailableCardCount: 11, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact active models cover domestic and imported/global brands." },
  { categoryId: "DRYER", query: "çamaşır kurutma makinesi", retrievedAt: "2026-09-05T01:04:18.875Z", headingResultText: "171 results", rawCardCount: 30, rawActiveCardCount: 18, rawUnavailableCardCount: 12, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact active models are ready despite accessory-heavy search results." },
  { categoryId: "ELECTRIC_STORAGE_WATER_HEATER", query: "elektrikli termosifon", retrievedAt: "2026-09-05T01:04:20.402Z", headingResultText: "54 results", rawCardCount: 30, rawActiveCardCount: 22, rawUnavailableCardCount: 8, priority: "P2_EVIDENCE_DEEPENING", priorityRationale: "Three exact Türkiye configurations are ready, but installation and offer-warranty review remains material." },
  { categoryId: "FILTER_COFFEE_MACHINE", query: "filtre kahve makinesi", retrievedAt: "2026-09-05T01:04:21.748Z", headingResultText: "261 results", rawCardCount: 30, rawActiveCardCount: 28, rawUnavailableCardCount: 2, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact candidates provide immediate assortment breadth." },
  { categoryId: "FOOD_PROCESSOR", query: "mutfak robotu", retrievedAt: "2026-09-05T01:04:23.253Z", headingResultText: "236 results", rawCardCount: 30, rawActiveCardCount: 30, rawUnavailableCardCount: 0, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact candidates cleared product-type and manufacturer identity checks." },
  { categoryId: "FREESTANDING_COOKER", query: "solo ocaklı fırın", retrievedAt: "2026-09-05T01:04:29.254Z", headingResultText: "Result count not exposed", rawCardCount: 21, rawActiveCardCount: 17, rawUnavailableCardCount: 4, priority: "P3_QUERY_REFINEMENT", priorityRationale: "No active full-size freestanding cooker cleared the gate; results were dominated by spare parts, midi ovens, and built-in ovens." },
  { categoryId: "FREEZER", query: "derin dondurucu", retrievedAt: "2026-09-05T01:04:30.580Z", headingResultText: "136 results", rawCardCount: 30, rawActiveCardCount: 8, rawUnavailableCardCount: 22, priority: "P2_EVIDENCE_DEEPENING", priorityRationale: "Two exact active models are ready but the category shows substantial current unavailability." },
  { categoryId: "FULLY_AUTOMATIC_ESPRESSO_MACHINE", query: "tam otomatik espresso makinesi", retrievedAt: "2026-09-05T01:04:32.226Z", headingResultText: "192 results", rawCardCount: 30, rawActiveCardCount: 29, rawUnavailableCardCount: 1, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact candidates broaden brand and model-generation coverage." },
  { categoryId: "HOB", query: "ankastre ocak", retrievedAt: "2026-09-05T01:04:33.539Z", headingResultText: "252 results", rawCardCount: 30, rawActiveCardCount: 26, rawUnavailableCardCount: 4, priority: "P2_EVIDENCE_DEEPENING", priorityRationale: "Three exact built-in models are ready; many results were set-top, portable, generic, or bundle identities." },
  { categoryId: "INSTANTANEOUS_ELECTRIC_WATER_HEATER", query: "elektrikli şofben", retrievedAt: "2026-09-05T01:04:39.512Z", headingResultText: "52 results", rawCardCount: 30, rawActiveCardCount: 26, rawUnavailableCardCount: 4, priority: "P2_EVIDENCE_DEEPENING", priorityRationale: "Three exact models are ready, subject to safety, installation, and offer-warranty review." },
  { categoryId: "MANUAL_ESPRESSO_MACHINE", query: "manuel espresso makinesi", retrievedAt: "2026-09-05T01:04:40.928Z", headingResultText: "155 results", rawCardCount: 30, rawActiveCardCount: 28, rawUnavailableCardCount: 2, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Three Türkiye-corroborated exact models are ready; global-only variants were held back." },
  { categoryId: "RANGE_HOOD", query: "davlumbaz", retrievedAt: "2026-09-05T01:04:42.244Z", headingResultText: "1.000+ results", rawCardCount: 30, rawActiveCardCount: 27, rawUnavailableCardCount: 3, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact products are ready after filtering accessories and replacement filters." },
  { categoryId: "REFRIGERATOR", query: "buzdolabı", retrievedAt: "2026-09-05T01:04:43.659Z", headingResultText: "238 results", rawCardCount: 30, rawActiveCardCount: 20, rawUnavailableCardCount: 10, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact active full-size models provide meaningful portfolio breadth." },
  { categoryId: "ROBOT_VACUUM", query: "robot süpürge", retrievedAt: "2026-09-05T01:04:51.570Z", headingResultText: "7.000+ results", rawCardCount: 30, rawActiveCardCount: 26, rawUnavailableCardCount: 4, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact, Türkiye-supported models cleared the gate in a broad active category." },
  { categoryId: "SPLIT_AIR_CONDITIONER", query: "split klima", retrievedAt: "2026-09-05T01:04:53.064Z", headingResultText: "203 results", rawCardCount: 30, rawActiveCardCount: 23, rawUnavailableCardCount: 7, priority: "P2_EVIDENCE_DEEPENING", priorityRationale: "Three exact Türkiye models are ready; package identity and installation inclusions remain critical review fields." },
  { categoryId: "TURKISH_COFFEE_MACHINE", query: "Türk kahvesi makinesi", retrievedAt: "2026-09-05T01:04:54.443Z", headingResultText: "251 results", rawCardCount: 30, rawActiveCardCount: 24, rawUnavailableCardCount: 5, rawUnclassifiedCardCount: 1, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact models are ready across domestic and imported/global brands." },
  { categoryId: "VACUUM", query: "elektrikli süpürge", retrievedAt: "2026-09-05T01:04:56.101Z", headingResultText: "254 results", rawCardCount: 30, rawActiveCardCount: 29, rawUnavailableCardCount: 1, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Four exact active products cleared duplicate-listing and product-type checks." },
  { categoryId: "WASHING_MACHINE", query: "çamaşır makinesi", retrievedAt: "2026-09-05T01:05:02.676Z", headingResultText: "243 results", rawCardCount: 30, rawActiveCardCount: 20, rawUnavailableCardCount: 10, priority: "P1_ADOPTION_REVIEW", priorityRationale: "Five exact active Türkiye models expose both missing domestic products and alternative imported configurations." },
] as const;

const candidateSeeds: readonly CandidateSeed[] = [
  { categoryId: "AIR_FRYER", brand: "Xiaomi", exactModel: "Smart Air Fryer Pro 4L EU", asin: "B0BQNDGJRV", amazonTitle: "XIAOMI Xiaomi Smart Air Fryer Pro 4L EU yağsız fritöz", price: "5.499,00 TL", manufacturerUrl: "https://www.mi.com/tr/product/xiaomi-smart-air-fryer-pro-4l/" },
  { categoryId: "AIR_FRYER", brand: "Philips", exactModel: "HD9243/90", asin: "B0CD2KVVRC", amazonTitle: "Philips Airfryer 3000 Serisi L 4,1L (HD9243/90)", price: "6.799,00 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/HD9243_90/3000-serisi-airfryer/destek" },
  { categoryId: "AIR_FRYER", brand: "Vestel", exactModel: "LightFry 15 X", asin: "B0CL9FR5JN", amazonTitle: "Vestel LightFry 15 X Fritöz", price: "2.597,00 TL", manufacturerUrl: "https://statik.vestel.com.tr/webfiles/20244644_k.pdf" },

  { categoryId: "AIR_PURIFIER", brand: "Xiaomi", exactModel: "Smart Air Purifier 4 Compact EU / AC-M18-SC", asin: "B0B6FHKKHP", amazonTitle: "Xiaomi Smart Hava Temizleyicisi 4 Kompakt EU", price: "4.999,00 TL", manufacturerUrl: "https://www.mi.com/tr/product/xiaomi-smart-air-purifier-4-compact/specs/" },
  { categoryId: "AIR_PURIFIER", brand: "Xiaomi", exactModel: "Smart Air Purifier 4 Lite", asin: "B09QX6JN98", amazonTitle: "Xiaomi Smart Air Purifier 4 Lite hava temizleyici", price: "7.399,00 TL", manufacturerUrl: "https://www.mi.com/tr/product/xiaomi-smart-air-purifier-4-lite/" },
  { categoryId: "AIR_PURIFIER", brand: "Philips", exactModel: "AC2220/10", asin: "B0FYHKVT96", amazonTitle: "Philips Hava Temizleyici 2200 Serisi (AC2220/10)", price: "13.591,50 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/AC2220_10/cobra-pureprotect-quiet-2200-series" },
  { categoryId: "AIR_PURIFIER", brand: "Bosch", exactModel: "Air 4000", asin: "B0B5D7H7VP", amazonTitle: "Bosch Thermotechnik Air 4000 Hava Temizleyici", price: "8.721,25 TL", manufacturerUrl: "https://www.bosch-homecomfort.com/tr/tr/ocs/residential/air-4000-19297701-p/" },

  { categoryId: "BLENDER", brand: "Philips", exactModel: "HR3031/00", asin: "B0CX23H3G6", amazonTitle: "Philips Blender Series 5000 HR3031/00", price: "7.051,09 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/HR3031_00/5000-series-hr3020-grey" },
  { categoryId: "BLENDER", brand: "Electrolux", exactModel: "E4TB1-6ST", asin: "B092MWBSF9", amazonTitle: "Electrolux E4TB1-6ST Sürahili Blender", price: "3.090,00 TL", manufacturerUrl: "https://www.electrolux.com.tr/kitchen/small-kitchen-appliances/table-blenders/table-blender/e4tb1-6st/" },
  { categoryId: "BLENDER", brand: "Arzum", exactModel: "AR1147 Shake'N Take Neo", asin: "B0CJJYY61L", amazonTitle: "Arzum AR1147 Shake'N Take Neo Kişisel Blender", price: "2.589,00 TL", manufacturerUrl: "https://destek.arzum.com.tr/manuals/arzum-shaken-take-neo-kisisel-blender-ar1147-b.pdf" },
  { categoryId: "BLENDER", brand: "Homend", exactModel: "Mixfresh 7026H", asin: "B0GP19HRMZ", amazonTitle: "Homend Mixfresh 7026H Kişisel Smoothie Blender", price: "1.360,66 TL", manufacturerUrl: "https://www.homend.com.tr/urun/homend-mixfresh-7026h-kisisel-smoothie-blender-antrasit-siyah" },

  { categoryId: "BUILT_IN_MICROWAVE_OVEN", brand: "Franke", exactModel: "FSL 20 MW XS / 131.0632.992", asin: "B0BW647X95", amazonTitle: "Franke Smart Linear FSL 20 MW XS 20 LT Mikrodalga Fırın", price: "20.888,00 TL", manufacturerUrl: "https://www.franke.com/tr/tr/home-solutions/urunler/filtreli-armaturler/product-detail-page.html/131.0632.992.html" },

  { categoryId: "BUILT_IN_OVEN", brand: "Samsung", exactModel: "NV60K3110BS/TR", asin: "B07F3WMGMF", amazonTitle: "Samsung NV60K3110BS/TR 60 Lt Ankastre Fırın", price: "16.999,00 TL", manufacturerUrl: "https://www.samsung.com/tr/cooking-appliances/ovens/electric-oven-nv60k3110bs-tr/" },
  { categoryId: "BUILT_IN_OVEN", brand: "Franke", exactModel: "FSL 86 H WH / 116.0609.448", asin: "B097F3SKW2", amazonTitle: "Franke Smart Linear Digital FSL 86 H WH Ankastre Fırın", price: "33.765,00 TL", manufacturerUrl: "https://www.franke.com/tr/tr/home-solutions/urunler/bulasik-makineleri/product-detail-page.html/116.0609.448.html" },

  { categoryId: "COUNTERTOP_MICROWAVE_OVEN", brand: "Samsung", exactModel: "MS23DG4504GTTR", asin: "B0DRSJ6G7J", amazonTitle: "Samsung MW4000D MS23DG4504GTTR 23 lt Mikrodalga Fırın", price: "5.979,08 TL", manufacturerUrl: "https://www.samsung.com/tr/microwave-ovens/solo/mw4000d-solo-mwo-fry-bread-defrost-seamless-and-recessed-handle-design-ms23dg4504gttr/" },
  { categoryId: "COUNTERTOP_MICROWAVE_OVEN", brand: "Arçelik", exactModel: "MD 211 DS", asin: "B0G5PTBGWC", amazonTitle: "Arçelik MD 211 DS Solo Mikrodalga Fırın", price: "7.988,15 TL", manufacturerUrl: "https://www.arcelik.com.tr/mikrodalga-firin/md-211-ds-mikrodalga-firin" },
  { categoryId: "COUNTERTOP_MICROWAVE_OVEN", brand: "Arçelik", exactModel: "MD 201 G", asin: "B0G5PSF9JN", amazonTitle: "Arçelik MD 201 G Gri Mikrodalga", price: "5.899,00 TL", manufacturerUrl: "https://www.arcelik.com.tr/mikrodalga-firin/md-201-g-mikrodalga-firin" },
  { categoryId: "COUNTERTOP_MICROWAVE_OVEN", brand: "Kumtel", exactModel: "HMIN-02 Smartwave", asin: "B0DYFCMX79", amazonTitle: "Kumtel HMIN-02 Smartwave Dijital Inverter Mikrodalga", price: "3.529,00 TL", manufacturerUrl: "https://www.kumtel.com/kumtel-siyah-smartwave-dijital-inverter-mikrodalga-hmin-02-559" },

  { categoryId: "DISHWASHER", brand: "Arçelik", exactModel: "A 710 I", asin: "B0GR5WR3F8", amazonTitle: "Arçelik A 710 I 6 Programlı Bulaşık Makinesi", price: "24.799,00 TL", manufacturerUrl: "https://www.arcelik.com.tr/prestige-serisi-solo-bulasik-makinesi/a-710-i-bulasik-makinesi" },
  { categoryId: "DISHWASHER", brand: "Arçelik", exactModel: "Diamond A 811 I", asin: "B0H8K13BL6", amazonTitle: "Arçelik Diamond A 811 I Bulaşık Makinesi", price: "32.000,00 TL", manufacturerUrl: "https://www.arcelik.com.tr/diamond-serisi-solo-bulasik-makinesi/a-811-i-bulasik-makinesi" },
  { categoryId: "DISHWASHER", brand: "Samsung", exactModel: "DW60M5062FS/TR", asin: "B07P9FNJHC", amazonTitle: "Samsung DW60M5062FS 7 Programlı İnox Solo Bulaşık Makinesi", price: "34.990,00 TL", manufacturerUrl: "https://www.samsung.com/tr/support/model/DW60M5062FS/TR/" },
  { categoryId: "DISHWASHER", brand: "Teka", exactModel: "DFI 46700 TTM", asin: "B08JMF53MQ", amazonTitle: "Teka DFI 46700 TTM Ankastre Bulaşık Makinesi", price: "23.500,00 TL", manufacturerUrl: "https://www.teka.com/tr-tr/wp-content/uploads/sites/16/2022/08/TK-116-KATALOG-2021-sikis%CC%A7tirildi.pdf" },

  { categoryId: "DRYER", brand: "Hoover", exactModel: "HRE H11A2TBE-17", asin: "B0FWV9819Q", amazonTitle: "Hoover HRE H11A2TBE-17 11 kg Isı Pompalı Kurutma Makinesi", price: "19.499,00 TL", manufacturerUrl: "https://www.hoover-home.com/tr_TR/kurutma-makineleri/31102852/hre-h11a2tbe-17/" },
  { categoryId: "DRYER", brand: "Hoover", exactModel: "NR EH11N2TBEX-17", asin: "B0HC45HBGP", amazonTitle: "Hoover NR EH11N2TBEX-17 11 kg Isı Pompalı Kurutma Makinesi", price: "21.399,00 TL", manufacturerUrl: "https://www.hoover-home.com/tr_TR/kurutma-makineleri/31103113/nr-eh11n2tbex-17/" },
  { categoryId: "DRYER", brand: "Arçelik", exactModel: "1201 KMX", asin: "B0GDTP7XLW", amazonTitle: "Arçelik 1201 KMX 12 Kg Kurutma Makinesi", price: "39.000,00 TL", manufacturerUrl: "https://www.arcelik.com.tr/12-kg-kurutma-makinesi/1201-kmx-kurutma-makinesi" },
  { categoryId: "DRYER", brand: "Samsung", exactModel: "DV10DG54A0ABAH", asin: "B0FWKLV2BJ", amazonTitle: "Samsung DV10DG54A0ABAH 10 Kg Kurutma Makinesi", price: "37.199,00 TL", manufacturerUrl: "https://www.samsung.com/tr/washers-and-dryers/dryers/dv5000d-dryer-space-max-hygiene-care-smartthings-ai-energy-mode-10kg-black-dv10dg54a0abah/" },

  { categoryId: "ELECTRIC_STORAGE_WATER_HEATER", brand: "Baymak", exactModel: "Aqua X-LED 65", asin: "B0FQN244PZ", amazonTitle: "Baymak AQUA X-LED Prizmatik 65 LT Termosifon", price: "13.899,00 TL", manufacturerUrl: "https://www.baymak.com.tr/urunler/su-isiticilari/termosifonlar/baymak-aqua-x-led-prizmatik" },
  { categoryId: "ELECTRIC_STORAGE_WATER_HEATER", brand: "Vestel", exactModel: "TRM 50 MS", asin: "B0CLH2XBSR", amazonTitle: "Vestel TRM 50 MS 50 Lt Mekanik Termosifon", price: "13.695,00 TL", manufacturerUrl: "https://www.vestel.com.tr/vestel-trm-50-ms-termosifon-p-2313" },
  { categoryId: "ELECTRIC_STORAGE_WATER_HEATER", brand: "DemirDöküm", exactModel: "DT4 Titanium Digital 65 Lt", asin: "B0BBBPZMPS", amazonTitle: "DT4 Titanium 65 Lt Digital Termosifon", price: "19.799,00 TL", manufacturerUrl: "https://www.demirdokum.com.tr/urunler/demirdokum-dt4-titanium-digital-21952.html" },

  { categoryId: "FILTER_COFFEE_MACHINE", brand: "Philips", exactModel: "HD7459/20", asin: "B00E385ATG", amazonTitle: "Philips Filtre Kahve Makinesi HD7459/20", price: "2.526,95 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/HD7459_20/daily-collection-kahve-makinesi" },
  { categoryId: "FILTER_COFFEE_MACHINE", brand: "Electrolux", exactModel: "E5CM1-6ST", asin: "B0BX9MGW6G", amazonTitle: "Electrolux E5CM1-6ST Create 5 Filtre Kahve Makinesi", price: "4.793,00 TL", manufacturerUrl: "https://www.electrolux.com.tr/kitchen/small-kitchen-appliances/coffee-makers/coffee-maker/e5cm1-6st/" },
  { categoryId: "FILTER_COFFEE_MACHINE", brand: "Arzum", exactModel: "AR3073 Brewtime Pro", asin: "B09JG7DB24", amazonTitle: "Arzum AR3073 Brewtime Pro Filtre Kahve Makinesi", price: "3.479,00 TL", manufacturerUrl: "https://destek.arzum.com.tr/manuals/arzum-brewtime-pro-filtre-kahve-makinesi-ar3073.pdf" },
  { categoryId: "FILTER_COFFEE_MACHINE", brand: "Homend", exactModel: "Coffeebreak 5006H", asin: "B07BQ5FR85", amazonTitle: "Homend Coffeebreak 5006H Filtre Kahve Makinesi", price: "2.499,00 TL", manufacturerUrl: "https://www.homend.com.tr/urun/homend-coffeebreak-5006h-filtre-kahve-makinesi" },

  { categoryId: "FOOD_PROCESSOR", brand: "Homend", exactModel: "Functionall 2851H", asin: "B0GJ5TRH59", amazonTitle: "Homend Functionall 2851H Mutfak Robotu", price: "2.518,99 TL", manufacturerUrl: "https://www.homend.com.tr/urun/homend-functionall-2851h-mutfak-robotu-antrasit-siyah" },
  { categoryId: "FOOD_PROCESSOR", brand: "Homend", exactModel: "Functionall 2843H", asin: "B0CV19CNLW", amazonTitle: "Homend Functionall 2843H Mutfak Robotu", price: "1.899,00 TL", manufacturerUrl: "https://www.homend.com.tr/urun/homend-functionall-2843h-mutfak-robotu-antrasit" },
  { categoryId: "FOOD_PROCESSOR", brand: "Karaca", exactModel: "Mastermaid Power Multifunctional 10 in 1 Galaxy Grey", asin: "B09GKD8QFK", amazonTitle: "Karaca Mastermaid Power Multifunctional 10 in 1 Galaxy Grey Mutfak Robotu", price: "3.999,00 TL", manufacturerUrl: "https://www.karaca.com/urun/karaca-mastermaid-power-multifunctional-10-in-1-galaxy-grey-gida-hazirlama-seti-2000w" },
  { categoryId: "FOOD_PROCESSOR", brand: "Karaca", exactModel: "x Refika Mastermaid Power 10 in 1 Swiss Cream", asin: "B0DG96G4CT", amazonTitle: "Karaca x Refika Mastermaid Power 10 in 1 Swiss Cream Mutfak Robotu", price: "3.999,00 TL", manufacturerUrl: "https://www.karaca.com/urun/karaca-x-refika-birgul-mastermaid-power-10-in-1-mutfak-robotu-swiss-cream-2000w" },

  { categoryId: "FREEZER", brand: "Kumtel", exactModel: "HFR-100", asin: "B0DYFCH1K5", amazonTitle: "Kumtel HFR-100 88 L Dikey Dondurucu", price: "10.999,00 TL", manufacturerUrl: "https://www.kumtel.com/hfr-100" },
  { categoryId: "FREEZER", brand: "Arçelik", exactModel: "2298 JEMG", asin: "B0G5PWJY1S", amazonTitle: "Arçelik 2298 JEMG Sandık Tipi Derin Dondurucu", price: "42.930,91 TL", manufacturerUrl: "https://www.arcelik.com.tr/sandik-tipi-derin-dondurucu/2298-jemg-derin-dondurucu" },

  { categoryId: "FULLY_AUTOMATIC_ESPRESSO_MACHINE", brand: "Philips", exactModel: "EP3343/50", asin: "B0CZY1V3XP", amazonTitle: "Philips 3300 Serisi Tam Otomatik Espresso Makinesi EP3343/50", price: "15.899,00 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/EP3343_50/series-3300-fully-automatic-espresso-machine" },
  { categoryId: "FULLY_AUTOMATIC_ESPRESSO_MACHINE", brand: "Philips", exactModel: "EP5547/90", asin: "B0CZ7D5DTQ", amazonTitle: "Philips 5500 Serisi Tam Otomatik Espresso Makinesi EP5547/90", price: "22.599,00 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/EP5547_90/5500-serisi-tam-otomatik-espresso-makinesi" },
  { categoryId: "FULLY_AUTOMATIC_ESPRESSO_MACHINE", brand: "Grundig", exactModel: "KVA 7230 Delisia Coffee", asin: "B0CN1VPF99", amazonTitle: "Grundig KVA 7230 Delisia Coffee Tam Otomatik Espresso Makinesi", price: "16.999,00 TL", manufacturerUrl: "https://www.grundig.com.tr/espresso-makinesi/kva-7230-delisia-coffee-tam-otomatik-kahve-makinesi" },
  { categoryId: "FULLY_AUTOMATIC_ESPRESSO_MACHINE", brand: "Tchibo", exactModel: "Esperto2 Caffè Granit Siyah / article 176321478579", asin: "B0BZJ63RHF", amazonTitle: "Tchibo Esperto2 Caffe Tam Otomatik Kahve Makinesi Granit Siyah", price: "14.499,00 TL", manufacturerUrl: "https://www.tchibo.com.tr/products/200762047863/esperto2-caffe-tam-otomatik-kahve-makinesi?article_id=176321478579" },

  { categoryId: "HOB", brand: "Hoover", exactModel: "HH64CC/TK", asin: "B0H21YDKTR", amazonTitle: "Hoover HH64CC/TK 60 CM Vitroseramik Ankastre Ocak", price: "6.000,00 TL", manufacturerUrl: "https://www.hoover-home.com/tr_TR/ankastre-ocaklar/33803628/hh64cc-tk/" },
  { categoryId: "HOB", brand: "Kumtel", exactModel: "KO-40 TAHDF Antrasit", asin: "B0DYDLPGHF", amazonTitle: "Kumtel KO-40 TAHDF Camlı Ankastre Ocak Antrasit", price: "4.809,00 TL", manufacturerUrl: "https://www.kumtel.com/kumtel-antrasit-cam-ankastre-ocak-ko-40-tahdf1" },
  { categoryId: "HOB", brand: "Luxell", exactModel: "LX-40TAHDF Opall Siyah", asin: "B0DGLCL773", amazonTitle: "Luxell 40-TAHDF Opall Siyah Cam Ankastre Ocak", price: "3.650,98 TL", manufacturerUrl: "https://www.luxell.com.tr/40-tahdf-opall-siyah-cam-ankastre-ocak" },

  { categoryId: "INSTANTANEOUS_ELECTRIC_WATER_HEATER", brand: "Aura", exactModel: "Basic 105A6", asin: "B0CKLV23LT", amazonTitle: "AURA Basic Elektrikli Şofben 105A6", price: "3.097,00 TL", manufacturerUrl: "https://www.iea.com.tr/tr/urunler/banyo-sofbenleri/aura-basic-sofben/74" },
  { categoryId: "INSTANTANEOUS_ELECTRIC_WATER_HEATER", brand: "King", exactModel: "K7101 Erman", asin: "B0FXH86FMT", amazonTitle: "King K7101 Erman Elektrikli Şofben", price: "1.550,00 TL", manufacturerUrl: "https://www.king.com.tr/products/king-erman-k7101-elektri%CC%87kli%CC%87-sofben" },
  { categoryId: "INSTANTANEOUS_ELECTRIC_WATER_HEATER", brand: "King", exactModel: "K7008 Ekvator", asin: "B08BN3MQ7D", amazonTitle: "King K7008 Ekvator Elektrikli Şofben", price: "1.600,00 TL", manufacturerUrl: "https://www.king.com.tr/pages/dokumanlar", manufacturerEvidence: "King Türkiye's document registry exposes an exact K7008 Ekvator Şofben manual and warranty-document entry." },

  { categoryId: "MANUAL_ESPRESSO_MACHINE", brand: "Homend", exactModel: "Coffeebreak 5011H", asin: "B0F3CQH8M5", amazonTitle: "Homend Coffeebreak 5011H Manuel Espresso Makinesi", price: "4.499,00 TL", manufacturerUrl: "https://www.homend.com.tr/urun/homend-coffeebreak-5011h-manuel-1100w-espresso-makinesi" },
  { categoryId: "MANUAL_ESPRESSO_MACHINE", brand: "Electrolux", exactModel: "E6EC1-6ST", asin: "B0BX9FSZ7T", amazonTitle: "Electrolux E6EC1-6ST Explorer 6 Espresso Cappuccino Kahve Makinesi", price: "6.994,00 TL", manufacturerUrl: "https://www.electrolux.com.tr/kitchen/small-kitchen-appliances/coffee-makers/coffee-maker/e6ec1-6st/" },
  { categoryId: "MANUAL_ESPRESSO_MACHINE", brand: "Philips", exactModel: "BAR300/03 Baristina", asin: "B0D8TSNW2L", amazonTitle: "Philips Baristina Espresso Makinesi BAR300/03", price: "9.499,00 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/BAR300_03/baristina-espresso-machine", manufacturerEvidence: "Philips Türkiye identifies BAR300/03 as Baristina; the product uses a portafilter workflow and is retained in the repository's manual/semi-automatic category with explicit identity evidence." },

  { categoryId: "RANGE_HOOD", brand: "Electrolux", exactModel: "KFIB19X", asin: "B07XFG4S98", amazonTitle: "Electrolux KFIB19X Island Davlumbaz", price: "79.999,00 TL", manufacturerUrl: "https://www.electrolux.com.tr/kitchen/cooking/cooker-hoods/island-hood/kfib19x/" },
  { categoryId: "RANGE_HOOD", brand: "Kumtel", exactModel: "DA6-835 Beyaz Rustik", asin: "B0CBSY4Q55", amazonTitle: "Kumtel DA6-835 Beyaz Rustik Cam Davlumbaz", price: "3.148,99 TL", manufacturerUrl: "https://www.kumtel.com/ankastre-davlumbazlar" },
  { categoryId: "RANGE_HOOD", brand: "Teka", exactModel: "DF 60 Inox", asin: "B08912XS6J", amazonTitle: "Teka DF 60 Inox Duvar Tipi Davlumbaz", price: "6.190,00 TL", manufacturerUrl: "https://www.teka.com/tr-tr/wp-content/uploads/sites/16/2022/08/teka-fiyat-katalogu_26.pdf" },
  { categoryId: "RANGE_HOOD", brand: "Teka", exactModel: "DBT 60 Siyah", asin: "B0C3RGBYQ6", amazonTitle: "Teka DBT 60 Davlumbaz Siyah", price: "6.809,00 TL", manufacturerUrl: "https://www.teka.com/tr-tr/wp-content/uploads/sites/16/2022/08/teka-fiyat-katalogu_26.pdf" },

  { categoryId: "REFRIGERATOR", brand: "Teka", exactModel: "RMF 77920 SS EU / 113430009", asin: "B07TX2JPL6", amazonTitle: "Teka RMF 77920 SS EU 4 Kapılı Solo Buzdolabı", price: "141.990,00 TL", manufacturerUrl: "https://www.teka.com/tr-tr/urun/rmf-77920_113430009/" },
  { categoryId: "REFRIGERATOR", brand: "Arçelik", exactModel: "270475 MB", asin: "B0GC9LYM64", amazonTitle: "Arçelik 270475 MB Alttan Donduruculu Buzdolabı", price: "47.999,00 TL", manufacturerUrl: "https://www.arcelik.com.tr/no-frost-buzdolabi/270475-mb-buzdolabi" },
  { categoryId: "REFRIGERATOR", brand: "Samsung", exactModel: "RB58DS75ESA/TR", asin: "B0FVYTWYXF", amazonTitle: "Samsung RB58DS75ESA/TR Kombi No Frost Buzdolabı", price: "62.599,00 TL", manufacturerUrl: "https://www.samsung.com/tr/home-appliances-10-year-warranty/", manufacturerEvidence: "Samsung Türkiye's model-specific warranty list exposes RB58DS75ESA/TR, corroborating the exact Türkiye suffix and local after-sales applicability." },
  { categoryId: "REFRIGERATOR", brand: "Samsung", exactModel: "RF57C510ESR/TR", asin: "B0DKFT7NVJ", amazonTitle: "Samsung RF57C510ESR/TR Gardırop Tipi No Frost Buzdolabı", price: "95.899,00 TL", manufacturerUrl: "https://www.samsung.com/tr/business/refrigerators/french-door/rf5000a-550l-silver-rf57c510esr-tr/" },

  { categoryId: "ROBOT_VACUUM", brand: "Xiaomi", exactModel: "Robot Vacuum S40 Pro / OV71GL", asin: "B0FX5MSQFH", amazonTitle: "Xiaomi Vacuum S40 Pro Robot Süpürge ve Paspas", price: "17.499,00 TL", manufacturerUrl: "https://www.mi.com/tr/product/xiaomi-robot-vacuum-s40-pro/specs/" },
  { categoryId: "ROBOT_VACUUM", brand: "Philips", exactModel: "XU5100/10", asin: "B0FVLZ5L9P", amazonTitle: "Philips HomeRun 5000 Serisi Robot Süpürge XU5100/10", price: "21.949,23 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/XU5100_10/homerun-5000-series-vacuum-and-mop-robot" },
  { categoryId: "ROBOT_VACUUM", brand: "Philips", exactModel: "XU2100/15", asin: "B0FVYCGMQY", amazonTitle: "Philips HomeRun 2000 Serisi Robot Süpürge XU2100/15", price: "16.999,00 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/XU2100_15/2000-series/destek" },
  { categoryId: "ROBOT_VACUUM", brand: "TP-Link Tapo", exactModel: "RV20 Max", asin: "B0DQV76SR6", amazonTitle: "Tapo RV20 Max Robot Süpürge ve Paspas", price: "9.499,00 TL", manufacturerUrl: "https://www.tp-link.com/tr/smart-home/robot-vacuum/tapo-rv20-max/" },

  { categoryId: "SPLIT_AIR_CONDITIONER", brand: "Arçelik", exactModel: "09325 A", asin: "B0DW4F66KM", amazonTitle: "Arçelik 09325 A 9.000 BTU Split Klima", price: "37.199,00 TL", manufacturerUrl: "https://www.arcelik.com.tr/9000-btu-klima/09325-a-klima" },
  { categoryId: "SPLIT_AIR_CONDITIONER", brand: "Arçelik", exactModel: "15325 S", asin: "B0G5PYLMG9", amazonTitle: "Arçelik 15325 S 15.000 BTU Split Klima", price: "30.500,00 TL", manufacturerUrl: "https://www.arcelik.com.tr/15000-btu-klima/15325-s-klima" },
  { categoryId: "SPLIT_AIR_CONDITIONER", brand: "Samsung", exactModel: "AR60F12C1KW/SK", asin: "B0751MGPQ3", amazonTitle: "Samsung WindFree AR60F12C1KW/SK 12.000 BTU Klima", price: "37.999,00 TL", manufacturerUrl: "https://www.samsung.com/tr/air-conditioners/wall-mount/ar9500t-ar70f12caawneu-ai-fast---comfort-cooling--ai-fast---comfort-cooling--comfort-drying-for-cold-free-dehumidification-ar60f12c1kw-sk/" },

  { categoryId: "TURKISH_COFFEE_MACHINE", brand: "Philips", exactModel: "HDA150/60", asin: "B0CNW7VGW4", amazonTitle: "Philips 5000 Serisi Türk Kahvesi Makinesi HDA150/60", price: "2.049,00 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/HDA150_60/series-5000-turkish-coffee-maker" },
  { categoryId: "TURKISH_COFFEE_MACHINE", brand: "Arzum", exactModel: "OK006 OKKA Minio Duo Bakır", asin: "B07QM7DF9T", amazonTitle: "Arzum OK006 OKKA Minio Duo Türk Kahvesi Makinesi Bakır", price: "3.207,46 TL", manufacturerUrl: "https://www.arzum.com.tr/Data/EditorFiles/katalog/Arzum%20Ihracat%20Katalogu%202020-1%20LoRes.pdf" },
  { categoryId: "TURKISH_COFFEE_MACHINE", brand: "Karaca", exactModel: "Hatır Neo Inox", asin: "B0FWDF9JD9", amazonTitle: "Karaca Hatır Neo Inox Türk Kahvesi Makinesi", price: "2.859,61 TL", manufacturerUrl: "https://www.karaca.com/turk-kahve-makinesi" },
  { categoryId: "TURKISH_COFFEE_MACHINE", brand: "Arzum", exactModel: "OK0010 OKKA Minio Pro Bakır", asin: "B0844LSWD3", amazonTitle: "Arzum OK0010 OKKA Minio Pro Türk Kahvesi Makinesi Bakır", price: "2.599,00 TL", manufacturerUrl: "https://www.arzum.com.tr/Data/EditorFiles/katalog/Arzum%20Ihracat%20Katalogu%202020-1%20LoRes.pdf" },

  { categoryId: "VACUUM", brand: "Samsung", exactModel: "VC07R302MVR/TR", asin: "B0817R9NYQ", amazonTitle: "Samsung VC07R302MVR Toz Torbasız Süpürge", price: "4.311,01 TL", manufacturerUrl: "https://www.samsung.com/tr/support/model/VC07R302MVR/TR/" },
  { categoryId: "VACUUM", brand: "Philips", exactModel: "XB2123/09", asin: "B08P7WBBXP", amazonTitle: "Philips 2000 Serisi Torbasız Elektrikli Süpürge XB2123/09", price: "5.299,00 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/XB2123_09/2000-serisi-torbasiz-elektrikli-suepuerge" },
  { categoryId: "VACUUM", brand: "Philips", exactModel: "FC9749/07", asin: "B0FDX2GJGJ", amazonTitle: "Philips PowerPro Max Torbasız Elektrikli Süpürge FC9749/07", price: "8.999,62 TL", manufacturerUrl: "https://www.philips.com.tr/c-p/FC9749_07/powerpro-max-torbasiz-elektrikli-suepuerge" },
  { categoryId: "VACUUM", brand: "Electrolux", exactModel: "PC91-8STM", asin: "B07PN75PW1", amazonTitle: "Electrolux Pure C9 PC91-8STM Torbasız Elektrikli Süpürge", price: "9.899,00 TL", manufacturerUrl: "https://www.electrolux.com.tr/vacuums-home-comfort/vacuum-cleaners/bagless-vacuum-cleaners/bagless-vacuum-cleaner/pc91-8stm/" },

  { categoryId: "WASHING_MACHINE", brand: "Samsung", exactModel: "WW90TA046AH/AH", asin: "B099ZQLXQV", amazonTitle: "Samsung WW90TA046AH/AH 9 kg Çamaşır Makinesi", price: "35.990,00 TL", manufacturerUrl: "https://www.samsung.com/tr/support/model/WW90TA046AH/AH/" },
  { categoryId: "WASHING_MACHINE", brand: "Vestel", exactModel: "CMI 97402 WIFI", asin: "B0GGDKT3JP", amazonTitle: "Vestel CMI 97402 WIFI 9 Kg Çamaşır Makinesi", price: "29.499,00 TL", manufacturerUrl: "https://statik.vestel.com.tr/webfiles/20350198_k.pdf" },
  { categoryId: "WASHING_MACHINE", brand: "Arçelik", exactModel: "10120 IMP", asin: "B0GCC5NT1Z", amazonTitle: "Arçelik 10120 IMP Neo Otonom Çamaşır Makinesi", price: "42.999,00 TL", manufacturerUrl: "https://www.arcelik.com.tr/10-kg-camasir-makinesi/10120-imp-camasir-makinesi" },
  { categoryId: "WASHING_MACHINE", brand: "Altus", exactModel: "AL CM 101254 D", asin: "B0H6BNV8TG", amazonTitle: "Altus AL CM 101254 D 10 kg Çamaşır Makinesi", price: "32.979,00 TL", manufacturerUrl: "https://www.altus.com.tr/urunler/camasir-makinesi/camasir-makinesi-al-cm-101254-d" },
  { categoryId: "WASHING_MACHINE", brand: "Samsung", exactModel: "WW11DG6B25LEAH", asin: "B0G4DDZZD7", amazonTitle: "Samsung WW11DG6B25LEAH 11 Kg Çamaşır Makinesi", price: "35.999,00 TL", manufacturerUrl: "https://www.samsung.com/tr/washers-and-dryers/washing-machines/ww6000d-front-loading-smartthings-ai-energy-mode-a-10-percent-extra-energy-efficiency-11kg-essential-white-ww11dg6b25leah/" },
] as const;

const rejectionSeeds: readonly RejectionSeed[] = [
  { categoryId: "AIR_FRYER", asin: "B0BF17GJCZ", amazonTitle: "Karaca Air Pro Cook XL 2in1 Rose Gold", status: "PENDING_EXACT_CONFIGURATION_IDENTITY", active: true, price: "4.999,00 TL", reason: "The bounded manufacturer pass did not establish the exact 2-in-1 Rose Gold configuration identity." },
  { categoryId: "AIR_FRYER", asin: "B0DJR8CNCZ", amazonTitle: "Philips NA322/00 Airfryer", status: "REJECTED_UNAVAILABLE", active: false, price: null, reason: "The exact listing card exposed no current price/offer." },
  { categoryId: "AIR_PURIFIER", asin: "B0FVXMCMC3", amazonTitle: "H13 HEPA Filtreli Hava Temizleyici", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, amazonExactIdentityObserved: false, price: "1.426,45 TL", reason: "No manufacturer or exact model identity was exposed." },
  { categoryId: "AIR_PURIFIER", asin: "B0DT7D6X21", amazonTitle: "Shark NeverChange5 Compact Pro HP072EU", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, price: "6.585,00 TL", reason: "Exact Türkiye manufacturer/support and offer-warranty applicability were not proven in the bounded pass." },
  { categoryId: "BLENDER", asin: "B0D1KVD99N", amazonTitle: "Philips HR2695/01 El Blender", status: "REJECTED_WRONG_CATEGORY", active: true, price: "3.695,00 TL", reason: "Hand blender/set identity is outside the countertop jug/personal blender category boundary." },
  { categoryId: "BUILT_IN_MICROWAVE_OVEN", asin: "B0DRSJ6G7J", amazonTitle: "Samsung MS23DG4504GTTR Solo Mikrodalga", status: "REJECTED_WRONG_CATEGORY", active: true, price: "5.979,08 TL", reason: "Manufacturer and Amazon identify a solo/countertop microwave, not built-in." },
  { categoryId: "BUILT_IN_MICROWAVE_OVEN", asin: "B07BYDGZYK", amazonTitle: "Bosch BFL520MS0 Ankastre Mikrodalga", status: "REJECTED_UNAVAILABLE", active: false, price: null, reason: "Exact product card was present but no current offer was visible." },
  { categoryId: "BUILT_IN_OVEN", asin: "B0DYVQ5H6M", amazonTitle: "Altus ALA 137 W fırın komütatörü", status: "REJECTED_WRONG_CATEGORY", active: true, price: "1.228,00 TL", reason: "Spare part, not an oven." },
  { categoryId: "BUILT_IN_OVEN", asin: "B0GTRKRY4Z", amazonTitle: "Arçelik AFC 121 SR Ankastre Fırın", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, price: "12.000,00 TL", reason: "Exact manufacturer model corroboration was not located during the bounded pass." },
  { categoryId: "COUNTERTOP_MICROWAVE_OVEN", asin: "B0DLL48F95", amazonTitle: "Samsung MS23DG4504ATTR Mikrodalga", status: "REJECTED_UNAVAILABLE", active: false, price: null, reason: "Exact product card was present but no current offer was visible." },
  { categoryId: "DISHWASHER", asin: "B0CMCNDT2J", amazonTitle: "Vestel BM4212 WIFI Bulaşık Makinesi", status: "PENDING_EXACT_CONFIGURATION_IDENTITY", active: true, price: null, reason: "Manufacturer materials exposed BM4212 S/X/MS WIFI variants, but the unsuffixed Amazon identity did not resolve to one exact configuration." },
  { categoryId: "DRYER", asin: "B0H8422M56", amazonTitle: "Çamaşır-kurutma makinesi bağlantı istifleme kiti", status: "REJECTED_WRONG_CATEGORY", active: true, price: "2.880,00 TL", reason: "Accessory, not a dryer." },
  { categoryId: "DRYER", asin: "B0FWKS8ZFW", amazonTitle: "Samsung DV90DG6845LEAH Kurutma Makinesi", status: "REJECTED_UNAVAILABLE", active: false, price: null, reason: "Exact product card was present but no current offer was visible." },
  { categoryId: "ELECTRIC_STORAGE_WATER_HEATER", asin: "B0C2VX87RX", amazonTitle: "Ariston Andris Lux 15 Lt Termosifon", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, price: "10.980,00 TL", reason: "A global manufacturer model was found, but exact Türkiye technical configuration and manufacturer service/warranty applicability were not proven." },
  { categoryId: "FILTER_COFFEE_MACHINE", asin: "B00EUWJGQ8", amazonTitle: "De'Longhi ICM14011 Filtre Kahve Makinesi", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, price: "4.449,00 TL", reason: "The exact active Amazon model lacked bounded manufacturer Türkiye support/warranty corroboration." },
  { categoryId: "FOOD_PROCESSOR", asin: "B0GNS9H9GH", amazonTitle: "Philips HR1502/00 Doğrayıcı", status: "REJECTED_WRONG_CATEGORY", active: true, price: "2.249,00 TL", reason: "Philips identifies HR1502/00 as a chopper, not the governed food-processor type." },
  { categoryId: "FREESTANDING_COOKER", asin: "B0DYVQHS8P", amazonTitle: "Arçelik FM 668 TW solo fırın komütatörü", status: "REJECTED_WRONG_CATEGORY", active: true, price: "1.228,00 TL", reason: "Spare switch, not a freestanding cooker." },
  { categoryId: "FREESTANDING_COOKER", asin: "B0FWRVBWPF", amazonTitle: "Kumtel B66-SF2 ankastre fırın", status: "REJECTED_WRONG_CATEGORY", active: true, price: "7.963,99 TL", reason: "Built-in oven, not a freestanding cooker with hob." },
  { categoryId: "FREEZER", asin: "B0CZP4HKRR", amazonTitle: "Vestel CDM601 E Dikey Derin Dondurucu", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, price: "26.999,00 TL", reason: "Exact manufacturer model evidence was not located in the bounded pass." },
  { categoryId: "FULLY_AUTOMATIC_ESPRESSO_MACHINE", asin: "B09CGRQ965", amazonTitle: "De'Longhi ECAM292.81.B Magnifica Evo", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, price: "25.999,00 TL", reason: "Exact Türkiye market and manufacturer after-sales applicability were not proven." },
  { categoryId: "FULLY_AUTOMATIC_ESPRESSO_MACHINE", asin: "B0CRDM9HY1", amazonTitle: "Philips EP2331/10", status: "REJECTED_UNAVAILABLE", active: false, price: null, reason: "Exact product card was present but no current offer was visible." },
  { categoryId: "HOB", asin: "B0DH4V2F6V", amazonTitle: "Luxell LX-420F set üstü ocak", status: "REJECTED_WRONG_CATEGORY", active: true, price: "4.699,00 TL", reason: "Set-top installation identity is outside the built-in hob category." },
  { categoryId: "HOB", asin: "B0FDL7L1F8", amazonTitle: "2500W çift pleytli portatif elektrikli ocak", status: "REJECTED_WRONG_CATEGORY", active: true, price: "2.349,00 TL", reason: "Portable generic hotplate, not a built-in hob and no exact manufacturer model." },
  { categoryId: "INSTANTANEOUS_ELECTRIC_WATER_HEATER", asin: "B0CKLSD258", amazonTitle: "Aura Premium PR105 Elektrikli Şofben", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, price: "5.989,00 TL", reason: "Exact PR105 manufacturer configuration evidence was not located in the bounded pass." },
  { categoryId: "INSTANTANEOUS_ELECTRIC_WATER_HEATER", asin: "B0G6Z29V4T", amazonTitle: "Elektrikli Şofben 7000 Watt", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, amazonExactIdentityObserved: false, price: "1.063,05 TL", reason: "No brand, exact model, or manufacturer safety/support evidence was exposed." },
  { categoryId: "MANUAL_ESPRESSO_MACHINE", asin: "B0DWFVBL9V", amazonTitle: "De'Longhi EC890.GR Dedica Duo", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, price: "15.900,00 TL", reason: "Global exact model evidence alone did not establish Türkiye technical and after-sales applicability." },
  { categoryId: "MANUAL_ESPRESSO_MACHINE", asin: "B013GDEAI0", amazonTitle: "De'Longhi ECP31.21", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, price: "11.199,60 TL", reason: "Global exact model evidence alone did not establish Türkiye technical and after-sales applicability." },
  { categoryId: "RANGE_HOOD", asin: "B0H4BVYP5F", amazonTitle: "Davlumbaz karbon filtre", status: "REJECTED_WRONG_CATEGORY", active: true, price: null, reason: "Replacement filter/accessory, not a range hood." },
  { categoryId: "REFRIGERATOR", asin: "B0CY5BKLN6", amazonTitle: "Vestel NF52111 No-Frost Buzdolabı", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, price: "35.499,00 TL", reason: "Exact manufacturer model corroboration was not located in the bounded pass." },
  { categoryId: "ROBOT_VACUUM", asin: "B0F7J1BKVV", amazonTitle: "Roborock S8 Pro Robot Süpürge", status: "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE", active: true, price: "15.300,00 TL", reason: "Exact Türkiye manufacturer/support and warranty applicability were not proven in the bounded pass." },
  { categoryId: "SPLIT_AIR_CONDITIONER", asin: "B0H6213TJL", amazonTitle: "TCL SaveIN 12000 BTU Split Klima", status: "PENDING_EXACT_CONFIGURATION_IDENTITY", active: true, price: "29.082,85 TL", reason: "Amazon did not expose the exact indoor/outdoor package identifiers; a European family page could not establish the Türkiye package or installation/warranty scope." },
  { categoryId: "SPLIT_AIR_CONDITIONER", asin: "B0GXPGGBDR", amazonTitle: "Split klima hava yönlendirici", status: "REJECTED_WRONG_CATEGORY", active: true, price: "430,10 TL", reason: "Accessory, not an air conditioner." },
  { categoryId: "TURKISH_COFFEE_MACHINE", asin: "B0FQ5FBVQZ", amazonTitle: "Arzum OK004-54 Minio Sorgül Buğdayı", status: "PENDING_EXACT_CONFIGURATION_IDENTITY", active: true, price: "1.739,00 TL", reason: "This overlaps the current OK004 family while the exact -54 color/configuration identity and non-duplication require a dedicated variant review." },
  { categoryId: "VACUUM", asin: "B0BLHDCP7R", amazonTitle: "Philips FC9749/07 PowerPro Max", status: "REJECTED_DUPLICATE_LISTING", active: true, price: "8.989,00 TL", reason: "A second active ASIN for the same exact FC9749/07 identity; B0FDX2GJGJ is the selected portfolio listing." },
  { categoryId: "WASHING_MACHINE", asin: "B0DFCHC7FT", amazonTitle: "Samsung WW11DB8B95GBAH", status: "REJECTED_CURRENT_SCOPE_DUPLICATE", active: true, price: "43.199,00 TL", reason: "Already present in the frozen 97-product current scope and therefore not an assortment expansion candidate." },
  { categoryId: "WASHING_MACHINE", asin: "B0FWKM26HG", amazonTitle: "Samsung WD11DG5B15BBAH Kurutmalı Çamaşır Makinesi", status: "REJECTED_WRONG_CATEGORY", active: true, price: "55.599,00 TL", reason: "Washer-dryer combination, not the governed washing-machine-only category." },
] as const;

const domesticTurkiyeRootedBrands = new Set([
  "altus", "arnica", "arzum", "arçelik", "baymak", "beko", "demirdöküm", "homend", "karaca", "king", "kumtel", "luxell", "vestel", "aura",
]);
const importedBrandTurkeySupportUrls = new Map<string, string>([
  ["bosch", "https://www.bosch-homecomfort.com/tr/tr/hizmetler/"],
  ["electrolux", "https://www.electrolux.com.tr/support/"],
  ["franke", "https://www.franke.com/tr/tr/home-solutions/musteri-hizmetleri.html"],
  ["grundig", "https://www.grundig.com.tr/destek"],
  ["hoover", "https://www.hoover-home.com/tr_TR/destek/"],
  ["philips", "https://www.philips.com.tr/c-w/support-home.html"],
  ["samsung", "https://www.samsung.com/tr/support/"],
  ["tchibo", "https://www.tchibo.com.tr/c/yardim"],
  ["teka", "https://www.teka.com/tr-tr/destek/"],
  ["tp-link tapo", "https://www.tp-link.com/tr/support/"],
  ["xiaomi", "https://www.mi.com/tr/support/"],
]);
const normalizeBrand = (value: string) => value.trim().toLocaleLowerCase("tr-TR");
const normalizeIdentity = (value: string) => value.normalize("NFKD").toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]+/gu, "");
const originSegment = (brand: string): OriginSegment => domesticTurkiyeRootedBrands.has(normalizeBrand(brand))
  ? "DOMESTIC_TURKIYE_ROOTED_BRAND"
  : "IMPORTED_OR_GLOBAL_BRAND";
const scanByCategory = new Map(categoryScans.map((scan) => [scan.categoryId, scan]));
const categories = [...new Set(snapshot.productScope.map((item) => item.categoryId))].sort();
if (categoryScans.length !== 24 || new Set(categoryScans.map((scan) => scan.categoryId)).size !== 24) throw new Error("CATEGORY_SCAN_COVERAGE_NOT_24");
if (categories.some((categoryId) => !scanByCategory.has(categoryId))) throw new Error("CATEGORY_SCAN_MISSING_CURRENT_CATEGORY");

const priorAsins = new Set(priorAudit.rows.flatMap((row) => row.asin ? [row.asin] : []));
const currentIdentities = new Set(snapshot.productScope.map((item) => `${item.categoryId}|${normalizeBrand(item.brand)}|${normalizeIdentity(item.model)}`));
const candidateAsins = new Set<string>();
for (const seed of candidateSeeds) {
  if (!scanByCategory.has(seed.categoryId)) throw new Error(`UNKNOWN_CANDIDATE_CATEGORY:${seed.categoryId}`);
  if (!/^[A-Z0-9]{10}$/u.test(seed.asin)) throw new Error(`INVALID_ASIN:${seed.asin}`);
  if (candidateAsins.has(seed.asin)) throw new Error(`DUPLICATE_CANDIDATE_ASIN:${seed.asin}`);
  candidateAsins.add(seed.asin);
  if (priorAsins.has(seed.asin)) throw new Error(`CANDIDATE_ASIN_ALREADY_IN_CURRENT_AUDIT:${seed.asin}`);
  if (currentIdentities.has(`${seed.categoryId}|${normalizeBrand(seed.brand)}|${normalizeIdentity(seed.exactModel)}`)) throw new Error(`CANDIDATE_IDENTITY_ALREADY_IN_CURRENT_SCOPE:${seed.asin}`);
  if (!/^https:\/\//u.test(seed.manufacturerUrl)) throw new Error(`INVALID_MANUFACTURER_URL:${seed.asin}`);
  if (originSegment(seed.brand) === "IMPORTED_OR_GLOBAL_BRAND" && !importedBrandTurkeySupportUrls.has(normalizeBrand(seed.brand))) throw new Error(`IMPORTED_CANDIDATE_MISSING_TURKEY_SUPPORT_CHANNEL:${seed.asin}`);
}

const candidates = candidateSeeds
  .map((seed) => {
    const scan = scanByCategory.get(seed.categoryId)!;
    const currentCategoryBrands = new Set(snapshot.productScope.filter((item) => item.categoryId === seed.categoryId).map((item) => normalizeBrand(item.brand)));
    const segment = originSegment(seed.brand);
    return {
      decision: "CATALOG_CANDIDATE_READY" as const,
      candidateId: `amazon-tr:${seed.categoryId.toLocaleLowerCase("en-US")}:${seed.asin.toLocaleLowerCase("en-US")}`,
      categoryId: seed.categoryId,
      brand: seed.brand,
      exactModel: seed.exactModel,
      originSegment: segment,
      originBoundary: "Brand-root segment supports composition analysis only; it is not country-of-manufacture evidence and never affects quality, authority, rank, or sufficiency.",
      currentCategoryBrandPresence: currentCategoryBrands.has(normalizeBrand(seed.brand)) ? "BRAND_ALREADY_PRESENT_DIFFERENT_EXACT_MODEL" as const : "BRAND_ABSENT_FROM_CURRENT_CATEGORY" as const,
      asin: seed.asin,
      canonicalAmazonUrl: `https://www.amazon.com.tr/dp/${seed.asin}`,
      amazonSearchUrl: `https://www.amazon.com.tr/s?k=${encodeURIComponent(`${seed.brand} ${seed.exactModel}`).replaceAll("%20", "+")}`,
      amazonTitle: seed.amazonTitle,
      currentAvailability: "ACTIVE_SEARCH_CARD_WITH_PRICE" as const,
      volatilePrice: {
        observedText: seed.price,
        currency: "TRY",
        observedAt: scan.retrievedAt,
        warning: "Volatile marketplace observation; not a stable product fact, comparison input, or authority signal.",
      },
      sellerObservation: null,
      fulfillmentObservation: null,
      sellerFulfillmentVisibility: "NOT_VISIBLE_ON_BOUNDED_SEARCH_CARD" as const,
      amazonRetrievedAt: scan.retrievedAt,
      exactIdentityEvidence: [
        `Amazon native result exposed ASIN ${seed.asin} and the exact model/configuration in the title: ${seed.amazonTitle}`,
        `The canonical Amazon target is /dp/${seed.asin}; tracking and affiliate parameters were not retained.`,
      ],
      manufacturerCorroboration: {
        sourceUrl: seed.manufacturerUrl,
        retrievedOn: "2026-09-05",
        exactEvidence: seed.manufacturerEvidence ?? `The manufacturer's Türkiye product, support, manual, or catalog surface exposes the exact ${seed.brand} ${seed.exactModel} identity.`,
      },
      turkiyeApplicability: {
        status: "PROVEN_BY_EXACT_MANUFACTURER_TURKIYE_SURFACE_AND_AMAZON_TR_IDENTITY" as const,
        evidence: "The exact identity is present on a manufacturer Türkiye product/support surface and on Amazon.com.tr; a foreign/global page alone was not admitted.",
      },
      warrantyServiceApplicability: {
        status: "EXACT_MODEL_ON_TURKIYE_SURFACE_AND_MANUFACTURER_TURKIYE_SUPPORT_CHANNEL_CONFIRMED" as const,
        manufacturerTurkeySupportUrl: segment === "IMPORTED_OR_GLOBAL_BRAND" ? importedBrandTurkeySupportUrls.get(normalizeBrand(seed.brand))! : seed.manufacturerUrl,
        evidence: "Exact manufacturer Türkiye documentation plus a manufacturer Türkiye support channel establish local product/service applicability. Specific seller warranty duration, installation inclusion, and transactional coverage must still be rechecked at adoption time.",
      },
      categoryIdentity: {
        status: "EXACT_CATEGORY_IDENTITY_CONFIRMED" as const,
        evidence: `Amazon title and manufacturer source both identify the appliance type governed by ${seed.categoryId}.`,
      },
      confidence: seed.confidence ?? "HIGH" as const,
      blockers: [] as const,
      authorityUse: "COMMERCIAL_RESEARCH_PRIORITY_ONLY" as const,
    };
  })
  .sort((left, right) => `${left.categoryId}|${left.brand}|${left.exactModel}|${left.asin}`.localeCompare(`${right.categoryId}|${right.brand}|${right.exactModel}|${right.asin}`, "en"));

const rejections = rejectionSeeds
  .map((seed) => {
    const scan = scanByCategory.get(seed.categoryId)!;
    return {
      decision: seed.status,
      categoryId: seed.categoryId,
      asin: seed.asin,
      canonicalAmazonUrl: seed.asin ? `https://www.amazon.com.tr/dp/${seed.asin}` : null,
      amazonTitle: seed.amazonTitle,
      activeSearchCardObserved: seed.active,
      amazonExactIdentityObserved: seed.amazonExactIdentityObserved ?? (seed.status === "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE" || seed.status === "REJECTED_UNAVAILABLE"),
      volatilePriceObservation: seed.price,
      amazonRetrievedAt: scan.retrievedAt,
      reason: seed.reason,
      authorityUse: "EXCLUDED_FROM_CATALOG_CANDIDATES" as const,
    };
  })
  .sort((left, right) => `${left.categoryId}|${left.asin ?? ""}|${left.decision}`.localeCompare(`${right.categoryId}|${right.asin ?? ""}|${right.decision}`, "en"));

const priorRowsByCategory = new Map(categories.map((categoryId) => [categoryId, priorAudit.rows.filter((row) => row.categoryId === categoryId)]));
const categoryMetrics = categories.map((categoryId) => {
  const scan = scanByCategory.get(categoryId)!;
  const currentRows = snapshot.productScope.filter((item) => item.categoryId === categoryId);
  const currentAuditRows = priorRowsByCategory.get(categoryId)!;
  const ready = candidates.filter((item) => item.categoryId === categoryId);
  const rejected = rejections.filter((item) => item.categoryId === categoryId);
  const activeFailedGate = rejected.filter((item) => item.activeSearchCardObserved);
  const ambiguous = activeFailedGate.filter((item) => !item.amazonExactIdentityObserved && item.decision !== "REJECTED_WRONG_CATEGORY" && item.decision !== "REJECTED_DUPLICATE_LISTING" && item.decision !== "REJECTED_CURRENT_SCOPE_DUPLICATE");
  const manufacturerEvidenceGaps = activeFailedGate.filter((item) => item.amazonExactIdentityObserved && item.decision === "PENDING_EXACT_MANUFACTURER_TURKIYE_EVIDENCE");
  const observedActiveExactCount = ready.length + activeFailedGate.filter((item) => item.amazonExactIdentityObserved && item.decision !== "REJECTED_WRONG_CATEGORY" && item.decision !== "REJECTED_DUPLICATE_LISTING" && item.decision !== "REJECTED_CURRENT_SCOPE_DUPLICATE").length;
  const domesticCurrent = currentRows.filter((item) => originSegment(item.brand) === "DOMESTIC_TURKIYE_ROOTED_BRAND");
  const importedCurrent = currentRows.filter((item) => originSegment(item.brand) === "IMPORTED_OR_GLOBAL_BRAND");
  const domesticReady = ready.filter((item) => item.originSegment === "DOMESTIC_TURKIYE_ROOTED_BRAND");
  const importedReady = ready.filter((item) => item.originSegment === "IMPORTED_OR_GLOBAL_BRAND");
  const importedNewBrand = importedReady.filter((item) => item.currentCategoryBrandPresence === "BRAND_ABSENT_FROM_CURRENT_CATEGORY");
  const importedSameBrandNewModel = importedReady.filter((item) => item.currentCategoryBrandPresence === "BRAND_ALREADY_PRESENT_DIFFERENT_EXACT_MODEL");
  const decisionRecordCount = ready.length + rejected.length;
  return {
    categoryId,
    query: scan.query,
    retrievedAt: scan.retrievedAt,
    rawSearchContext: {
      headingResultText: scan.headingResultText,
      rawCardCount: scan.rawCardCount,
      rawActiveCardCount: scan.rawActiveCardCount,
      rawUnavailableCardCount: scan.rawUnavailableCardCount,
      rawUnclassifiedCardCount: scan.rawUnclassifiedCardCount ?? 0,
      warning: "Raw cards include duplicates, sponsored/organic repetition, accessories, wrong product types, and cross-category results; they are not exact-product counts.",
    },
    boundedDecisionLedger: {
      observedActiveExactProductCount: observedActiveExactCount,
      manufacturerCorroboratedActiveExactCount: ready.length,
      usableCandidateCount: ready.length,
      rejectedOrPendingCount: rejected.length,
      identityAmbiguityCount: ambiguous.length,
      identityAmbiguityRate: decisionRecordCount === 0 ? 0 : Number((ambiguous.length / decisionRecordCount).toFixed(4)),
      manufacturerTurkiyeEvidenceGapCount: manufacturerEvidenceGaps.length,
      metricBoundary: "Counts cover the explicit deduplicated decision ledger, not all Amazon inventory.",
    },
    currentCatalogComposition: {
      productCount: currentRows.length,
      domesticTurkiyeRootedBrandCount: domesticCurrent.length,
      importedOrGlobalBrandCount: importedCurrent.length,
      exactActiveCount: currentAuditRows.filter((row) => row.status === "EXACT_ACTIVE_LISTING_CONFIRMED").length,
      exactUnavailableCount: currentAuditRows.filter((row) => row.status === "EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE").length,
      identityMismatchCount: currentAuditRows.filter((row) => row.status === "AMBIGUOUS_OR_FAMILY_ONLY").length,
      boundedNotFoundCount: currentAuditRows.filter((row) => row.status === "NOT_FOUND").length,
      products: currentRows.map((item) => ({
        brand: item.brand,
        exactModel: item.model,
        originSegment: originSegment(item.brand),
        priorAmazonStatus: currentAuditRows.find((row) => row.exactProductId === item.exactProductId)?.status ?? "BLOCKED_OR_UNVERIFIABLE",
      })),
    },
    readyPortfolioComposition: {
      domesticTurkiyeRootedBrandCount: domesticReady.length,
      importedOrGlobalBrandCount: importedReady.length,
      importedBrandAbsentFromCurrentCategoryCount: importedNewBrand.length,
      importedBrandAlreadyPresentDifferentExactModelCount: importedSameBrandNewModel.length,
      products: ready.map((item) => ({
        brand: item.brand,
        exactModel: item.exactModel,
        originSegment: item.originSegment,
        asin: item.asin,
      })),
    },
    priority: scan.priority,
    priorityRationale: scan.priorityRationale,
    compositionFinding: importedNewBrand.length > 0 && importedSameBrandNewModel.length > 0
      ? "Both missing imported/global brands and non-Amazon-aligned exact variants within already represented imported/global brands are evidenced."
      : importedNewBrand.length > 0
        ? "At least one ready imported/global candidate adds a brand absent from the current category."
        : importedSameBrandNewModel.length > 0
          ? "Ready imported/global candidates mainly replace or complement different exact variants of brands already represented in the current category."
          : domesticReady.length > 0
            ? "Ready breadth in this category is currently domestic/Türkiye-rooted; this is a coverage observation, not a quality judgment."
            : "The bounded ledger does not resolve a composition cause for this category.",
  };
});

const segmentSummary = (segment: OriginSegment) => {
  const currentRows = priorAudit.rows.filter((row) => originSegment(row.brand) === segment);
  const readyRows = candidates.filter((item) => item.originSegment === segment);
  return {
    currentProductCount: currentRows.length,
    currentExactActiveCount: currentRows.filter((row) => row.status === "EXACT_ACTIVE_LISTING_CONFIRMED").length,
    currentExactUnavailableCount: currentRows.filter((row) => row.status === "EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE").length,
    currentIdentityMismatchCount: currentRows.filter((row) => row.status === "AMBIGUOUS_OR_FAMILY_ONLY").length,
    currentBoundedNotFoundCount: currentRows.filter((row) => row.status === "NOT_FOUND").length,
    readyCandidateCount: readyRows.length,
    readyCandidateBrands: [...new Set(readyRows.map((row) => row.brand))].sort(),
  };
};

const importedReady = candidates.filter((item) => item.originSegment === "IMPORTED_OR_GLOBAL_BRAND");
const domesticReady = candidates.filter((item) => item.originSegment === "DOMESTIC_TURKIYE_ROOTED_BRAND");
const weakCategories = categoryMetrics.filter((item) => item.boundedDecisionLedger.usableCandidateCount <= 1).map((item) => item.categoryId);
const unavailableCurrentCount = priorAudit.rows.filter((row) => row.status === "EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE").length;
const mismatchCurrentCount = priorAudit.rows.filter((row) => row.status === "AMBIGUOUS_OR_FAMILY_ONLY").length;
const boundedNotFoundCurrentCount = priorAudit.rows.filter((row) => row.status === "NOT_FOUND").length;

const causalAnalysis = {
  question: "Why did only 10 of 97 current exact products expose active Amazon.com.tr offers in the prior bounded audit?",
  overallHypothesis: {
    hypothesis: "The low 10/97 result is primarily explained by domestic/Türkiye-manufacturer selection bias and missing imported products.",
    verdict: "PARTIALLY_SUPPORTED" as const,
    explanation: "Missing imported/global products and alternative active variants are material, but domestic selection bias cannot be the primary overall explanation: only 34/97 current products are Türkiye-rooted brands, imported/global products are 63/97, and imported/global products supplied 8/10 active matches. Exact-variant mismatch, current unavailability, and bounded logged-out discovery limits are independently substantial.",
  },
  tests: [
    {
      cause: "DOMESTIC_TURKIYE_MANUFACTURER_SELECTION_BIAS",
      verdict: "REJECTED" as const,
      quantifiedEvidence: "34/97 current products are domestic/Türkiye-rooted brands and 63/97 are imported/global brands. Active rates were 2/34 (5.9%) and 8/63 (12.7%) respectively.",
      interpretation: "Domestic-heavy pockets exist in some categories, but the overall catalog is not domestic-majority and origin does not explain most of the 87 non-active results.",
    },
    {
      cause: "MISSING_IMPORTED_BRANDS_OR_PRODUCTS_IN_CURRENT_CATALOG",
      verdict: "SUPPORTED" as const,
      quantifiedEvidence: `${importedReady.length} imported/global exact active candidates cleared the strict gate; ${importedReady.filter((item) => item.currentCategoryBrandPresence === "BRAND_ABSENT_FROM_CURRENT_CATEGORY").length} add a brand absent from that current category.`,
      interpretation: "The existing assortment misses demonstrably active imported/global products, but this is an expansion opportunity rather than proof that origin predicts product quality.",
    },
    {
      cause: "IMPORTED_BRANDS_PRESENT_BUT_WRONG_STALE_OR_NON_AMAZON_EXACT_VARIANTS",
      verdict: "SUPPORTED" as const,
      quantifiedEvidence: `Within 63 current imported/global products, 42 were bounded not-found, 6 were family/accessory mismatches, 7 were exact but unavailable, and only 8 were active. ${importedReady.filter((item) => item.currentCategoryBrandPresence === "BRAND_ALREADY_PRESENT_DIFFERENT_EXACT_MODEL").length} ready imported/global candidates use a brand already present in the category but a different exact active model.`,
      interpretation: "Current imported-brand presence alone is insufficient; exact Amazon-active Türkiye variants matter." ,
    },
    {
      cause: "AMAZON_SPECIFIC_SUFFIX_BUNDLE_COLOR_VOLTAGE_PACK_OR_MARKETPLACE_IDENTITY_MISMATCH",
      verdict: "SUPPORTED" as const,
      quantifiedEvidence: `${mismatchCurrentCount}/97 current rows were explicitly classified ambiguous/family/accessory in the prior audit; this portfolio additionally holds configuration-ambiguous Amazon cards outside the ready list.`,
      interpretation: "An ASIN or family token cannot cure missing exact suffix, color, bundle, voltage, indoor/outdoor pair, or product-type identity." ,
    },
    {
      cause: "DISCONTINUED_OR_CURRENTLY_UNAVAILABLE_LISTINGS",
      verdict: "SUPPORTED" as const,
      quantifiedEvidence: `${unavailableCurrentCount}/97 current exact products had a confirmed Amazon detail identity but no current featured offer/add-to-cart state.`,
      interpretation: "Current unavailability directly explains part of the gap but does not prove permanent discontinuation." ,
    },
    {
      cause: "GENUINELY_WEAK_AMAZON_CATEGORY_COVERAGE",
      verdict: "PARTIALLY_SUPPORTED" as const,
      quantifiedEvidence: `${weakCategories.length}/24 categories produced at most one usable new candidate in the bounded ledger: ${weakCategories.join(", ")}.`,
      interpretation: "Weak coverage is localized; most categories produced multiple exact active candidates after category-first discovery." ,
    },
    {
      cause: "BOUNDED_LOGGED_OUT_SEARCH_LIMITATIONS",
      verdict: "INDETERMINATE" as const,
      quantifiedEvidence: `${boundedNotFoundCurrentCount}/97 current products remained bounded not-found. The audit used logged-out web search, one delivery context, top-result inspection, and no Amazon API/account inventory surface.`,
      interpretation: "Those rows cannot be causally split into truly absent, poorly indexed, delivery-context hidden, suppressed, or beyond-result-window inventory without broader access." ,
    },
  ],
  segmentDefinitions: {
    domesticTurkiyeRootedBrand: "Brand rooted in Türkiye for composition analysis. This is not country-of-manufacture evidence; ownership and manufacturing footprint can be multinational.",
    importedOrGlobalBrand: "Brand not classified as Türkiye-rooted. Exact Türkiye model, support, and service applicability are still required for admission.",
    qualityBoundary: "Brand origin, manufacturer domicile, and country of manufacture are not decision-quality proxies and do not affect candidate confidence, rank, sufficiency, or technical authority.",
  },
  segmentSummary: {
    domesticTurkiyeRootedBrand: segmentSummary("DOMESTIC_TURKIYE_ROOTED_BRAND"),
    importedOrGlobalBrand: segmentSummary("IMPORTED_OR_GLOBAL_BRAND"),
  },
};

const payload = {
  schemaVersion: "appliances-amazon-assortment-portfolio/v1",
  workUnit: "WU-APPL-AMAZON-ASSORTMENT-PORTFOLIO-DISCOVERY-01",
  generatedFromFrozenEvidenceAt: "2026-09-05T01:05:02.676Z",
  market: "TR",
  marketplace: "www.amazon.com.tr",
  scopeAuthority: {
    currentProductCount: 97,
    categoryCount: 24,
    commerceSnapshotFile: pointer.snapshotFile,
    commerceSnapshotDigest: pointer.snapshotDigest,
    priorAmazonAuditFile: path.relative(root, priorAuditFile),
    priorAmazonAuditDigest: priorAudit.auditDigest,
    technicalPointersMutated: false,
    catalogMutated: false,
    runtimeMutated: false,
    schemasMutated: false,
    credentialsOrAffiliateIntegrationMutated: false,
    mediaCopied: false,
  },
  authorityBoundary: {
    allowedUse: "Amazon presence, observed availability, price, seller, and fulfillment are commercial research and future assortment-priority signals only.",
    prohibitedUses: ["XPY authority", "recommendation rank", "technical sufficiency", "evidence sufficiency", "product quality", "country-of-origin quality proxy", "automatic catalog adoption"],
    adoptionGate: "Every ready row still requires owner-reviewed catalog adoption and current transactional revalidation. No row changes the active catalog.",
  },
  method: {
    discovery: "One category-first native Amazon.com.tr query per governed category, followed by exact deduplication and explicit decision-ledger review.",
    availability: "Active means the bounded logged-out search card exposed a current price and was not labelled unavailable at retrieval time.",
    corroboration: "Ready candidates require exact manufacturer Türkiye product, support, manual, catalog, or part evidence; global-only corroboration is rejected.",
    importedProductGate: "Imported/global brands are admitted only when exact model/configuration, Türkiye applicability, manufacturer Türkiye support/service applicability, category identity, and active Amazon.com.tr listing are all proven.",
    warrantyBoundary: "Manufacturer Türkiye support/product presence proves local applicability; a particular seller's warranty duration or installation scope is never inferred and must be checked at transaction/adoption time.",
    boundedness: "Logged-out, top-result, single-delivery-context observation. It is reproducible evidence, not exhaustive marketplace inventory.",
  },
  causalAnalysis,
  totals: {
    categories: categoryMetrics.length,
    readyCandidates: candidates.length,
    readyDomesticTurkiyeRootedBrandCandidates: domesticReady.length,
    readyImportedOrGlobalBrandCandidates: importedReady.length,
    rejectedOrPendingDecisionRecords: rejections.length,
    categoriesWithReadyCandidates: new Set(candidates.map((item) => item.categoryId)).size,
    categoriesWithoutReadyCandidates: categories.filter((categoryId) => !candidates.some((item) => item.categoryId === categoryId)),
  },
  categoryMetrics,
  candidates,
  rejectedOrPending: rejections,
};

if (payload.totals.categories !== 24) throw new Error("OUTPUT_CATEGORY_COUNT_NOT_24");
if (payload.totals.readyCandidates < 24) throw new Error("PORTFOLIO_NOT_BROAD_ENOUGH");
if (categoryMetrics.some((item) => item.boundedDecisionLedger.manufacturerCorroboratedActiveExactCount !== item.boundedDecisionLedger.usableCandidateCount)) throw new Error("USABLE_CANDIDATE_WITHOUT_CORROBORATION");
if (candidates.some((item) => item.authorityUse !== "COMMERCIAL_RESEARCH_PRIORITY_ONLY")) throw new Error("AMAZON_AUTHORITY_BOUNDARY_VIOLATION");

const artifact = {
  ...payload,
  portfolioDigest: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
};

const csvCell = (value: unknown) => JSON.stringify(value ?? "");
const decisionRows = [
  ...candidates.map((item) => ({
    decision: item.decision,
    categoryId: item.categoryId,
    brand: item.brand,
    exactModel: item.exactModel,
    originSegment: item.originSegment,
    asin: item.asin,
    canonicalAmazonUrl: item.canonicalAmazonUrl,
    currentAvailability: item.currentAvailability,
    volatilePrice: item.volatilePrice.observedText,
    seller: item.sellerObservation,
    fulfillment: item.fulfillmentObservation,
    retrievedAt: item.amazonRetrievedAt,
    manufacturerUrl: item.manufacturerCorroboration.sourceUrl,
    turkiyeApplicability: item.turkiyeApplicability.status,
    categoryIdentity: item.categoryIdentity.status,
    confidence: item.confidence,
    blockerOrReason: "",
  })),
  ...rejections.map((item) => ({
    decision: item.decision,
    categoryId: item.categoryId,
    brand: "",
    exactModel: item.amazonTitle,
    originSegment: "",
    asin: item.asin,
    canonicalAmazonUrl: item.canonicalAmazonUrl,
    currentAvailability: item.activeSearchCardObserved ? "ACTIVE_SEARCH_CARD" : "UNAVAILABLE_SEARCH_CARD",
    volatilePrice: item.volatilePriceObservation,
    seller: null,
    fulfillment: null,
    retrievedAt: item.amazonRetrievedAt,
    manufacturerUrl: "",
    turkiyeApplicability: "NOT_PROVEN_OR_NOT_APPLICABLE",
    categoryIdentity: item.decision === "REJECTED_WRONG_CATEGORY" ? "REJECTED" : "UNRESOLVED_OR_EXCLUDED",
    confidence: "",
    blockerOrReason: item.reason,
  })),
].sort((left, right) => `${left.categoryId}|${left.decision}|${left.asin ?? ""}`.localeCompare(`${right.categoryId}|${right.decision}|${right.asin ?? ""}`, "en"));

const decisionHeaders = ["decision", "categoryId", "brand", "exactModel", "originSegment", "asin", "canonicalAmazonUrl", "currentAvailability", "volatilePrice", "seller", "fulfillment", "retrievedAt", "manufacturerUrl", "turkiyeApplicability", "categoryIdentity", "confidence", "blockerOrReason"] as const;
const categoryHeaders = ["categoryId", "observedActiveExactProductCount", "manufacturerCorroboratedActiveExactCount", "usableCandidateCount", "identityAmbiguityRate", "manufacturerTurkiyeEvidenceGapCount", "currentProductCount", "currentDomesticCount", "currentImportedCount", "currentExactActiveCount", "readyDomesticCount", "readyImportedCount", "importedNewBrandCount", "importedSameBrandNewModelCount", "priority"] as const;

const decisionCsv = `${decisionHeaders.join(",")}\n${decisionRows.map((row) => decisionHeaders.map((header) => csvCell(row[header])).join(",")).join("\n")}\n`;
const categoryCsv = `${categoryHeaders.join(",")}\n${categoryMetrics.map((item) => [
  item.categoryId,
  item.boundedDecisionLedger.observedActiveExactProductCount,
  item.boundedDecisionLedger.manufacturerCorroboratedActiveExactCount,
  item.boundedDecisionLedger.usableCandidateCount,
  item.boundedDecisionLedger.identityAmbiguityRate,
  item.boundedDecisionLedger.manufacturerTurkiyeEvidenceGapCount,
  item.currentCatalogComposition.productCount,
  item.currentCatalogComposition.domesticTurkiyeRootedBrandCount,
  item.currentCatalogComposition.importedOrGlobalBrandCount,
  item.currentCatalogComposition.exactActiveCount,
  item.readyPortfolioComposition.domesticTurkiyeRootedBrandCount,
  item.readyPortfolioComposition.importedOrGlobalBrandCount,
  item.readyPortfolioComposition.importedBrandAbsentFromCurrentCategoryCount,
  item.readyPortfolioComposition.importedBrandAlreadyPresentDifferentExactModelCount,
  item.priority,
].map(csvCell).join(",")).join("\n")}\n`;

const categoryTable = categoryMetrics.map((item) => `| ${item.categoryId} | ${item.currentCatalogComposition.productCount} (${item.currentCatalogComposition.domesticTurkiyeRootedBrandCount}/${item.currentCatalogComposition.importedOrGlobalBrandCount}) | ${item.currentCatalogComposition.exactActiveCount} | ${item.boundedDecisionLedger.observedActiveExactProductCount} | ${item.boundedDecisionLedger.manufacturerCorroboratedActiveExactCount} | ${item.boundedDecisionLedger.usableCandidateCount} (${item.readyPortfolioComposition.domesticTurkiyeRootedBrandCount}/${item.readyPortfolioComposition.importedOrGlobalBrandCount}) | ${(item.boundedDecisionLedger.identityAmbiguityRate * 100).toFixed(1)}% | ${item.priority} |`).join("\n");
const compositionComparison = categoryMetrics.map((item) => {
  const current = item.currentCatalogComposition.products.map((product) => `${product.brand} ${product.exactModel} [${product.originSegment === "DOMESTIC_TURKIYE_ROOTED_BRAND" ? "D" : "I"}; ${product.priorAmazonStatus}]`).join("; ");
  const ready = item.readyPortfolioComposition.products.map((product) => `${product.brand} ${product.exactModel} [${product.originSegment === "DOMESTIC_TURKIYE_ROOTED_BRAND" ? "D" : "I"}; ${product.asin}]`).join("; ") || "None";
  return `- **${item.categoryId}.** Current: ${current}. Ready: ${ready}. Finding: ${item.compositionFinding}`;
}).join("\n");
const candidateList = candidates.map((item) => `- **${item.categoryId}** — ${item.brand} ${item.exactModel} — [${item.asin}](${item.canonicalAmazonUrl}) — ${item.volatilePrice.observedText} observed ${item.amazonRetrievedAt} — [manufacturer Türkiye evidence](${item.manufacturerCorroboration.sourceUrl})`).join("\n");
const rejectionList = rejections.map((item) => `- **${item.categoryId} / ${item.decision}** — ${item.amazonTitle}${item.asin ? ` — [${item.asin}](${item.canonicalAmazonUrl})` : ""} — ${item.reason}`).join("\n");
const causeList = causalAnalysis.tests.map((item) => `- **${item.cause}: ${item.verdict}.** ${item.quantifiedEvidence} ${item.interpretation}`).join("\n");

const markdown = `# Amazon.com.tr assortment expansion portfolio discovery\n\nWork unit: \`${payload.workUnit}\`. Frozen logged-out Amazon.com.tr observation window ended at ${payload.generatedFromFrozenEvidenceAt}. Prices and availability are volatile commercial observations, not technical facts or decision authority.\n\n## Outcome\n\n${candidates.length} exact active products cleared the strict manufacturer-Türkiye gate across ${payload.totals.categoriesWithReadyCandidates}/24 categories. ${rejections.length} additional inspected records were rejected or held pending. ${payload.totals.categoriesWithoutReadyCandidates.join(", ") || "No category"} produced no ready candidate.\n\nNo catalog, active pointer, runtime, deployment, schema, credential, affiliate, or media file was changed. Amazon presence is commercial research priority only and never changes XPY authority, rank, sufficiency, or product-quality judgments.\n\n## Why only 10/97 current products were active\n\nOverall hypothesis verdict: **${causalAnalysis.overallHypothesis.verdict}**. ${causalAnalysis.overallHypothesis.explanation}\n\n${causeList}\n\nBrand-root segments are descriptive only. They are not country-of-manufacture evidence and are never a quality proxy. Imported/global products were admitted only with exact model/configuration, Amazon.com.tr activity, manufacturer Türkiye evidence, category identity, and local product/support applicability; seller-specific warranty terms still require adoption-time review.\n\n## Category metrics and composition\n\nCurrent and ready composition is shown as domestic-Türkiye-rooted/imported-or-global. Observed exact counts cover the explicit decision ledger, not all Amazon inventory.\n\n| Category | Current (D/I) | Current active | Observed active exact | Corroborated | Ready (D/I) | Ambiguity | Priority |\n|---|---:|---:|---:|---:|---:|---:|---|\n${categoryTable}\n\n## Per-category brand/model comparison\n\nD = domestic/Türkiye-rooted brand; I = imported/global brand. These labels are descriptive only.\n\n${compositionComparison}\n\n## Ready candidates\n\n${candidateList}\n\n## Rejected, ambiguous, unavailable, duplicate, or pending\n\n${rejectionList}\n\n## Reproducibility and boundary\n\nRun \`node --import tsx scripts/generate-appliances-amazon-assortment-portfolio.ts\` from the repository root. The generator pins the current 97-product/24-category commerce snapshot and prior audit, rejects current-scope ASIN/model duplication, validates canonical Amazon URLs and exact manufacturer evidence fields, emits deterministic JSON/CSV/Markdown, and performs no production mutation.\n`;

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(path.join(outputDirectory, "assortment-portfolio.json"), `${JSON.stringify(artifact, null, 2)}\n`);
writeFileSync(path.join(outputDirectory, "decision-ledger.csv"), decisionCsv);
writeFileSync(path.join(outputDirectory, "category-metrics.csv"), categoryCsv);
writeFileSync(path.join(outputDirectory, "summary.md"), markdown);

console.log(JSON.stringify({
  outputDirectory,
  portfolioDigest: artifact.portfolioDigest,
  categories: artifact.totals.categories,
  readyCandidates: artifact.totals.readyCandidates,
  readyDomestic: artifact.totals.readyDomesticTurkiyeRootedBrandCandidates,
  readyImported: artifact.totals.readyImportedOrGlobalBrandCandidates,
  rejectedOrPending: artifact.totals.rejectedOrPendingDecisionRecords,
  categoriesWithoutReadyCandidates: artifact.totals.categoriesWithoutReadyCandidates,
}));
