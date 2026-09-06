import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ELECTRONICS_CATEGORY_REGISTRY } from "../features/electronics/architectureBaseline";
import { ELECTRONICS_AMAZON_PRIMARY_SCHEMA_VERSION, validateAmazonPrimaryResearch, type AmazonDiscoveryDisposition, type ElectronicsAmazonAuditRow, type ElectronicsAmazonCandidate, type ElectronicsAmazonQueryRun } from "../features/electronics/amazonPrimaryCatalog";

const observedAt = "2026-09-05T10:08:35.000Z";
const seeds = [
  ["SMARTPHONE", "akıllı telefon", "240 sonuç", "B0F1FNX644", "Samsung Galaxy A26 5G, 256GB, 8GB RAM, Siyah (Samsung Türkiye Garantili)", "18.339,84 TL", "EXACT_ACTIVE", true],
  ["LAPTOP", "dizüstü bilgisayar", "359 sonuç", "B0GNZZ9QB4", "Asus TUF Gaming F16 FX607VJB-RL136 16GB 512GB RTX 3050 FreeDOS", "37.999,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["TABLET", "tablet bilgisayar", "181 sonuç", "B0FRG1ZQDL", "Samsung Galaxy Tab A11 WiFi 4GB 64GB 8.7 inç Gümüş", "5.259,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["MONITOR", "bilgisayar monitörü", "135 sonuç", "B0F9LLPSJD", "Dell E2425HM 23.8 İnç Full HD IPS", "5.171,38 TL", "BLOCKED_UNVERIFIABLE", true],
  ["TELEVISION", "smart televizyon", "4.000 üzeri sonuç", "B0G6MCRHB6", "Next YE-55GFSG8-QLED 55 inç 4K Google TV", "24.399,00 TL", "EXACT_ACTIVE", true],
  ["E_READER", "e-kitap okuyucu kindle", "33 sonuç", "B0CZY1LRT4", "Kobo Clara Colour 6 inç Siyah", null, "EXACT_UNAVAILABLE", false],
  ["HEADPHONES", "kulaklık", "10.000 üzeri sonuç", "B0CDM94MJL", "HUAWEI FreeBuds SE 2 Mavi", "1.280,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["PORTABLE_SPEAKER", "taşınabilir bluetooth hoparlör", "853 sonuç", "B0DHFZW4CV", "Anker Soundcore Select 4 Go Mor A31X1", "1.499,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["SOUNDBAR", "soundbar", "228 sonuç", "B0FVVRHSVT", "Marshall Heston 60 Black Dolby Atmos Soundbar", "32.831,18 TL", "BLOCKED_UNVERIFIABLE", true],
  ["DIGITAL_CAMERA", "dijital fotoğraf makinesi", "218 sonuç", "B0F9Z1ZFD6", "Insta360 X5 Essentials Paketi", "33.999,00 TL", "ACCESSORY_OR_BUNDLE", true],
  ["PROJECTOR", "projektör", "230 sonuç", "B0GVXXWWR2", "Next Cine450 GoogleTV Projeksiyon Cihazı", "10.349,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["GAME_CONSOLE", "oyun konsolu", "3.000 üzeri sonuç", "B0CLTBHXWQ", "Sony PlayStation 5 Slim Digital Sürüm (İthalat)", "40.999,00 TL", "FOREIGN_ONLY", true],
  ["WIFI_ROUTER_MESH", "wifi 6 mesh router", "128 sonuç", "B085G5CDY7", "Xiaomi Mi WiFi Router 4A", "1.289,00 TL", "AMBIGUOUS_OR_FAMILY_ONLY", true],
  ["NETWORK_ATTACHED_STORAGE", "NAS ağ depolama", "43 sonuç", "B0C99TX1RM", "Synology DS223J 2 Bay NAS", "12.484,16 TL", "BLOCKED_UNVERIFIABLE", false],
  ["EXTERNAL_STORAGE", "harici SSD", "164 sonuç", "B0BGXWT3GL", "Toshiba Canvio Partner 1TB Harici HDD", "4.249,00 TL", "AMBIGUOUS_OR_FAMILY_ONLY", true],
  ["PRINTER", "yazıcı", "270 sonuç", "B0GQNGFPXN", "Ticimark Mini Termal Yazıcı", "1.124,95 TL", "BLOCKED_UNVERIFIABLE", true],
  ["WEBCAM", "web kamera", "120 sonuç", "B0DZXK2KWH", "Coverzone WebCam 4K 813", "1.331,85 TL", "BLOCKED_UNVERIFIABLE", true],
  ["COMPUTER_AUDIO", "bilgisayar hoparlörü", "185 sonuç", "B0G3BC53D5", "Divoom D-base 30W Masaüstü Hoparlör", "8.549,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["SMARTWATCH", "akıllı saat", "3.000 üzeri sonuç", "B0H99R7M28", "Samsung Galaxy Watch Ultra2 47mm Bluetooth", "32.999,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["FITNESS_TRACKER", "akıllı bileklik", "114 sonuç", "B0H99V1GMP", "Samsung Galaxy Watch Ultra2 47mm Bluetooth", "32.999,00 TL", "AMBIGUOUS_OR_FAMILY_ONLY", true],
  ["HOME_SECURITY_CAMERA", "ev güvenlik kamerası", "230 sonuç", "B0FKBPYFFZ", "Tapo C660 KIT 4K Güneş Enerjili Güvenlik Kamerası", "6.486,80 TL", "ACCESSORY_OR_BUNDLE", true],
  ["VIDEO_DOORBELL", "görüntülü kapı zili", "164 sonuç", "B0DFLQP24S", "Botslab Kablosuz Kapı Zili Kamerası Homebase 5MP", "6.208,06 TL", "BLOCKED_UNVERIFIABLE", true],
  ["SMART_HOME_HUB", "akıllı ev merkezi hub", "9 sonuç", "B08FRLQH75", "Homey Bridge Akıllı Ev Merkezi", "6.090,00 TL", "BLOCKED_UNVERIFIABLE", false],
  ["UNINTERRUPTIBLE_POWER_SUPPLY", "kesintisiz güç kaynağı UPS", "110 sonuç", "B0CCNX39JZ", "Eaton 5E Gen2 1600 USB DIN 5E1600UD", "9.292,00 TL", "EXACT_ACTIVE", true],
] as const;

const additionalSeeds = [
  ["SMARTPHONE", "Samsung Galaxy A26 5G 256GB", "123 sonuç", "B0F1FQG96J", "Samsung Galaxy A26 5G 256GB 8GB Beyaz Türkiye Garantili", "18.999,00 TL", "BLOCKED_UNVERIFIABLE", false],
  ["LAPTOP", "Lenovo laptop 83 TR", "43 sonuç", "B0FS415BBW", "Lenovo IdeaPad Slim 3 16IRH10 83K20077TR 16GB 1TB", "34.789,02 TL", "BLOCKED_UNVERIFIABLE", false],
  ["TABLET", "Samsung Galaxy Tab WiFi", "102 sonuç", "B0FQJ5FKW6", "Samsung Galaxy Tab S10 Lite WiFi 6GB 128GB Gri", "14.149,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["MONITOR", "Dell monitör", "236 sonuç", "B0FQ5BKD63", "Dell 27 Plus S2725HSM 27 FHD 144Hz", "8.409,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["TELEVISION", "Next 55 televizyon", "31 sonuç", "B0F4KK5NNN", "Next YE-55GFSG8-4K 55 inç Google TV", "20.740,00 TL", "BLOCKED_UNVERIFIABLE", false],
  ["E_READER", "PocketBook e-kitap okuyucu", "4 sonuç", "B0CGVWV9Z2", "PocketBook Verse PB629 6 inç 8GB Mist Grey", "8.499,00 TL", "BLOCKED_UNVERIFIABLE", false],
  ["HEADPHONES", "Huawei FreeBuds kulaklık", "250 sonuç", "B0DN93PF5Z", "HUAWEI FreeBuds SE 3 Siyah", "1.649,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["PORTABLE_SPEAKER", "Soundcore Select 4 Go", "27 sonuç", "B0DKFZT517", "Soundcore Select 4 Go Kırmızı Beyaz", "1.459,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["SOUNDBAR", "Marshall Heston soundbar", "7 sonuç", "B0FVVRXPMY", "Marshall Heston 60 Cream Dolby Atmos Soundbar", "40.168,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["DIGITAL_CAMERA", "Sony ZV-E10 II 16-50", "5 sonuç", "B0D8QRHQNL", "Sony ZV-E10 II 16-50 mm SELP16502 Kit Siyah", "54.999,00 TL", "EXACT_ACTIVE", true],
  ["PROJECTOR", "Epson projektör", "50 sonuç", "B0B985X9G6", "Epson EH-TW6150 4K PRO-UHD Projektör", "51.974,04 TL", "BLOCKED_UNVERIFIABLE", true],
  ["GAME_CONSOLE", "PlayStation 5 Türkiye garantili", "4 sonuç", "B0FXBBHC7X", "Sony PlayStation 5 Slim Digital Bilkom Garantili", "47.599,00 TL", "BLOCKED_UNVERIFIABLE", false],
  ["WIFI_ROUTER_MESH", "TP-Link Deco X50 2 pack", "19 sonuç", "B09LVFNMVJ", "TP-Link Deco X50 2-pack AX3000", "8.312,16 TL", "BLOCKED_UNVERIFIABLE", true],
  ["NETWORK_ATTACHED_STORAGE", "Synology DS223j", "5 sonuç", "B0BT17XFBK", "Synology DS223 2 Bay NAS 2GB", "19.997,70 TL", "BLOCKED_UNVERIFIABLE", false],
  ["EXTERNAL_STORAGE", "Samsung portable SSD", "43 sonuç", "B087DFLF9S", "Samsung T7 1TB MU-PC1T0T/WW Gri", null, "EXACT_UNAVAILABLE", false],
  ["PRINTER", "HP yazıcı Türkiye garantili", "13 sonuç", "B0CF2NQL8K", "HP Smart Tank 585 All-in-One 1F3Y4A", "7.760,00 TL", "EXACT_ACTIVE", false],
  ["WEBCAM", "Logitech webcam", "67 sonuç", "B0080IA1J4", "Logitech BCC950 Video Konferans Kamerası", "21.900,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["COMPUTER_AUDIO", "Logitech bilgisayar hoparlörü", "1.000 üzeri sonuç", "B08JRGQM3K", "HP DHS-2111 2.0 Bilgisayar Hoparlörü", "449,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["SMARTWATCH", "Huawei Watch akıllı saat", "3.000 üzeri sonuç", "B0FK9M37S6", "HUAWEI WATCH GT 6 Pro 46 mm Kahverengi", "13.837,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["FITNESS_TRACKER", "Huawei Band akıllı bileklik", "160 sonuç", "B0GL9B3FQJ", "HUAWEI Band 11 Siyah", "2.046,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["HOME_SECURITY_CAMERA", "Tapo C220 kamera", "38 sonuç", "B0CDCL6FLC", "Tapo C220 2K 4MP İç Mekan Kamera", "1.499,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["VIDEO_DOORBELL", "Aqara G410 kapı zili", "4 sonuç", "B0FHKH1BP1", "Aqara G410 CH-C09D-S Siyah", "9.490,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["SMART_HOME_HUB", "Aqara Hub M100", "9 sonuç", "B0F7H5HYGD", "Aqara Hub M100 HM-G02D", "1.979,01 TL", "BLOCKED_UNVERIFIABLE", true],
  ["UNINTERRUPTIBLE_POWER_SUPPLY", "APC UPS 1600", "35 sonuç", "B08G8WHYMH", "APC BX1600MI-GR", "10.879,11 TL", "BLOCKED_UNVERIFIABLE", false],
] as const;

const targetedQueries: Readonly<Record<string, readonly [string, string]>> = {
  SMARTPHONE: ["Samsung Galaxy A26 5G 256GB", "Xiaomi Redmi Note telefon"], LAPTOP: ["Lenovo laptop 83 TR", "Asus laptop FX"], TABLET: ["Samsung Galaxy Tab WiFi", "Lenovo tablet"], MONITOR: ["Dell monitör", "Asus ProArt monitör"], TELEVISION: ["Samsung televizyon 55", "Next 55 televizyon"], E_READER: ["Kobo e-kitap okuyucu", "PocketBook e-kitap okuyucu"],
  HEADPHONES: ["Huawei FreeBuds kulaklık", "Soundcore kulaklık A3949"], PORTABLE_SPEAKER: ["Soundcore Select 4 Go", "JBL bluetooth hoparlör"], SOUNDBAR: ["Samsung soundbar", "Marshall Heston soundbar"], DIGITAL_CAMERA: ["Sony ZV-E10 II 16-50", "Canon aynasız kamera kit"], PROJECTOR: ["Next Cine projektör", "Epson projektör"], GAME_CONSOLE: ["PlayStation 5 Türkiye garantili", "Xbox Series konsol"],
  WIFI_ROUTER_MESH: ["TP-Link Deco X50 2 pack", "Keenetic AX3000 router"], NETWORK_ATTACHED_STORAGE: ["Synology DS223j", "QNAP TS-233"], EXTERNAL_STORAGE: ["Samsung portable SSD", "WD external SSD"], PRINTER: ["HP yazıcı Türkiye garantili", "Epson EcoTank yazıcı"], WEBCAM: ["Logitech webcam", "Asus webcam"], COMPUTER_AUDIO: ["Logitech bilgisayar hoparlörü", "Creative masaüstü hoparlör"],
  SMARTWATCH: ["Samsung Galaxy Watch Bluetooth", "Huawei Watch akıllı saat"], FITNESS_TRACKER: ["Xiaomi Smart Band", "Huawei Band akıllı bileklik"], HOME_SECURITY_CAMERA: ["Tapo C220 kamera", "Tapo dış mekan kamera"], VIDEO_DOORBELL: ["Aqara G410 kapı zili", "Tapo görüntülü kapı zili"], SMART_HOME_HUB: ["Aqara Hub M100", "Homey Bridge hub"], UNINTERRUPTIBLE_POWER_SUPPLY: ["Eaton 5E UPS", "APC UPS 1600"],
};

const pageTwoSeeds = [
  ["SMARTPHONE", "akıllı telefon", "PAGE_2", "B0H99B12XN", "Samsung Galaxy Z Fold8 Ultra 512GB Mürdüm Türkiye Versiyonu", "139.999,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["TABLET", "tablet bilgisayar", "PAGE_2", "B0FGJWLXHS", "Wacom Cintiq 16 2025 Ekranlı Grafik Tableti", "50.196,94 TL", "AMBIGUOUS_OR_FAMILY_ONLY", true],
  ["MONITOR", "bilgisayar monitörü", "PAGE_2", "B096Y4JT1G", "MSI MAG 245F X24 23.8 FHD 240Hz", "6.199,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["E_READER", "e-kitap okuyucu kindle", "PAGE_2", "B0DXDVK12C", "XPPen Magic Note Pad 10.95 Dijital Not Defteri", "29.999,00 TL", "AMBIGUOUS_OR_FAMILY_ONLY", true],
  ["GAME_CONSOLE", "oyun konsolu", "PAGE_2", "B0CJT5DJ16", "Sony PlayStation Portal Remote Player Bilkom Garantili", "20.899,00 TL", "AMBIGUOUS_OR_FAMILY_ONLY", true],
  ["EXTERNAL_STORAGE", "harici SSD", "PAGE_2", "B0BGXY2NZ4", "Toshiba Canvio Partner 4TB Harici HDD", "8.300,00 TL", "BLOCKED_UNVERIFIABLE", true],
  ["PRINTER", "yazıcı", "PAGE_2", "B0D2VW57NL", "Anycubic Photon Mono M7 Pro 3D Yazıcı", "24.254,01 TL", "AMBIGUOUS_OR_FAMILY_ONLY", true],
  ["WEBCAM", "web kamera", "PAGE_2", "B08H5F8BHG", "ASUS BE249QFK Monitör Dahili Web Kamera", "13.999,00 TL", "AMBIGUOUS_OR_FAMILY_ONLY", true],
  ["COMPUTER_AUDIO", "bilgisayar hoparlörü", "PAGE_2", "B0CW3BHDKS", "Mikado MD-381BT 5+1 Multimedya Hoparlör", "2.999,99 TL", "BLOCKED_UNVERIFIABLE", true],
  ["SMARTWATCH", "akıllı saat", "PAGE_2", "B0H9B18JX9", "Samsung Galaxy Watch9 40mm Bluetooth Koyu Gri Türkiye Versiyonu", "17.195,33 TL", "BLOCKED_UNVERIFIABLE", true],
  ["HOME_SECURITY_CAMERA", "ev güvenlik kamerası", "PAGE_2", "B0DD7BJ54F", "Imou Cruiser SE+ 2K Dış Mekan Kamera", "2.799,00 TL", "BLOCKED_UNVERIFIABLE", true],
] as const;

const byId = new Map(ELECTRONICS_CATEGORY_REGISTRY.map(category => [category.categoryId, category]));
const reason = (status: AmazonDiscoveryDisposition) => ({ EXACT_ACTIVE: "Exact Amazon listing and exact Türkiye manufacturer configuration independently corroborated.", EXACT_UNAVAILABLE: "Exact-looking listing observed without a current price; not active-admissible.", AMBIGUOUS_OR_FAMILY_ONLY: "The result does not establish the requested exact category/configuration identity.", ACCESSORY_OR_BUNDLE: "Bundle/kit topology obscures a standalone exact-product admission.", FOREIGN_ONLY: "Listing explicitly indicates import status; Türkiye applicability is not independently established.", NOT_FOUND: "No result observed within bounded traversal.", BLOCKED_UNVERIFIABLE: "Exact-looking Amazon identity lacks an independently verified exact Türkiye manufacturer/configuration bridge." }[status]);
const makeAuditRow = ([categoryId, query, resultText, asin, title, price, disposition, sponsored]: typeof seeds[number] | typeof additionalSeeds[number] | typeof pageTwoSeeds[number]): ElectronicsAmazonAuditRow => {
  const category = byId.get(categoryId)!;
  return { categoryId, wave: category.wave, query, resultText, observedAt, asin, title, canonicalAmazonUrl: `https://www.amazon.com.tr/dp/${asin}`, disposition, priceObserved: price ? { display: price, observedAt, authority: "L10_NONE" } : null, seller: null, fulfilment: null, stockState: price ? "OBSERVED_PRICE" : "NO_PRICE_OBSERVED", sponsored, confidence: disposition === "EXACT_ACTIVE" ? "HIGH" : "LOW", reason: reason(disposition) };
};
const auditRows: ElectronicsAmazonAuditRow[] = [...seeds.map(makeAuditRow), ...additionalSeeds.map(makeAuditRow), ...pageTwoSeeds.map(makeAuditRow)];
const queryRuns: ElectronicsAmazonQueryRun[] = ELECTRONICS_CATEGORY_REGISTRY.flatMap(category => {
  const primary = seeds.find(seed => seed[0] === category.categoryId)!;
  const pageOne = [primary[1], ...targetedQueries[category.categoryId]].map((query, index) => ({ categoryId: category.categoryId, wave: category.wave, query, page: 1 as const, resultCap: index === 0 ? 1 : 2, amazonSearchUrl: `https://www.amazon.com.tr/s?k=${encodeURIComponent(query)}`, observedAt, resultText: index === 0 ? primary[2] : "PUBLIC_RESULTS_OBSERVED", access: "PUBLIC_SEARCH_REACHABLE" as const }));
  const pageTwoObserved = pageTwoSeeds.some(seed => seed[0] === category.categoryId);
  return [...pageOne, { categoryId: category.categoryId, wave: category.wave, query: primary[1], page: 2 as const, resultCap: 1, amazonSearchUrl: `https://www.amazon.com.tr/s?k=${encodeURIComponent(primary[1])}&page=2`, observedAt, resultText: pageTwoObserved ? "PAGE_2_RESULT_OBSERVED" : "PAGE_2_NO_RETAINABLE_ROW", access: pageTwoObserved ? "PUBLIC_SEARCH_REACHABLE" as const : "PAGE_UNAVAILABLE" as const }];
});
const candidates: ElectronicsAmazonCandidate[] = [
  { exactProductId: "electronics:smartphone:samsung:sm-a266bzkctur", categoryId: "SMARTPHONE", wave: 1, brand: "Samsung", commercialModel: "Galaxy A26 5G", manufacturerModelCode: "SM-A266BZKCTUR", configurationIdentity: "Samsung|Galaxy A26 5G|SM-A266BZKCTUR|8GB|256GB|Black|TR", asin: "B0F1FNX644", amazonSourceId: "amazon-tr:B0F1FNX644:2026-09-05", trApplicabilitySourceId: "samsung-tr:SM-A266BZKCTUR", lifecycle: "RESEARCH_CATALOG_ADMISSIBLE", technicalAuthorityFromAmazon: false, decisionAuthority: "NONE" },
  { exactProductId: "electronics:television:next:ye-55gfsg8-qled", categoryId: "TELEVISION", wave: 1, brand: "Next", commercialModel: "YE-55GFSG8-QLED", manufacturerModelCode: "YE-55GFSG8-QLED", configurationIdentity: "Next|YE-55GFSG8-QLED|55in|4K|Google TV|TR", asin: "B0G6MCRHB6", amazonSourceId: "amazon-tr:B0G6MCRHB6:2026-09-05", trApplicabilitySourceId: "next-tr:YE-55GFSG8-QLED", lifecycle: "RESEARCH_CATALOG_ADMISSIBLE", technicalAuthorityFromAmazon: false, decisionAuthority: "NONE" },
  { exactProductId: "electronics:digital-camera:sony:zve10m2kb-cec", categoryId: "DIGITAL_CAMERA", wave: 2, brand: "Sony", commercialModel: "ZV-E10 II 16-50 Kit", manufacturerModelCode: "ZVE10M2KB.CEC", configurationIdentity: "Sony|ZV-E10 II|ZVE10M2KB.CEC|SELP16502|Black|TR", asin: "B0D8QRHQNL", amazonSourceId: "amazon-tr:B0D8QRHQNL:2026-09-05", trApplicabilitySourceId: "sony-tr:ZVE10M2KB.CEC", lifecycle: "RESEARCH_CATALOG_ADMISSIBLE", technicalAuthorityFromAmazon: false, decisionAuthority: "NONE" },
  { exactProductId: "electronics:external-storage:samsung:mu-pc1t0t-ww", categoryId: "EXTERNAL_STORAGE", wave: 3, brand: "Samsung", commercialModel: "Portable SSD T7 1TB Gray", manufacturerModelCode: "MU-PC1T0T/WW", configurationIdentity: "Samsung|T7|MU-PC1T0T/WW|1TB|USB 3.2 Gen2|Gray|TR", asin: "B087DFLF9S", amazonSourceId: "amazon-tr:B087DFLF9S:2026-09-05", trApplicabilitySourceId: "samsung-tr:MU-PC1T0T/WW", lifecycle: "RESEARCH_CATALOG_ADMISSIBLE", technicalAuthorityFromAmazon: false, decisionAuthority: "NONE" },
  { exactProductId: "electronics:printer:hp:1f3y4a", categoryId: "PRINTER", wave: 3, brand: "HP", commercialModel: "Smart Tank 585 All-in-One", manufacturerModelCode: "1F3Y4A", configurationIdentity: "HP|Smart Tank 585|1F3Y4A|Color Ink Tank|All-in-One|TR", asin: "B0CF2NQL8K", amazonSourceId: "amazon-tr:B0CF2NQL8K:2026-09-05", trApplicabilitySourceId: "hp-tr:1F3Y4A", lifecycle: "RESEARCH_CATALOG_ADMISSIBLE", technicalAuthorityFromAmazon: false, decisionAuthority: "NONE" },
  { exactProductId: "electronics:ups:eaton:5e1600ud", categoryId: "UNINTERRUPTIBLE_POWER_SUPPLY", wave: 4, brand: "Eaton", commercialModel: "5E Gen2 1600 USB DIN", manufacturerModelCode: "5E1600UD", configurationIdentity: "Eaton|5E Gen2|5E1600UD|1600VA|900W|4 Schuko|TR", asin: "B0CCNX39JZ", amazonSourceId: "amazon-tr:B0CCNX39JZ:2026-09-05", trApplicabilitySourceId: "eaton-tr:5E1600UD", lifecycle: "RESEARCH_CATALOG_ADMISSIBLE", technicalAuthorityFromAmazon: false, decisionAuthority: "NONE" },
];
const sources = [
  { sourceId: "amazon-tr-search-observation:2026-09-05", kind: "COMMERCE_DISCOVERY", uri: "https://www.amazon.com.tr/", market: "TR", observedAt, technicalAuthority: "NONE", decisionAuthority: "NONE", limitations: ["Bounded public first-page observations; not exhaustive.", "Seller, fulfilment and stock were not reliably exposed in search cards."] },
  { sourceId: "samsung-tr:SM-A266BZKCTUR", kind: "OFFICIAL_TR_MANUFACTURER", uri: "https://www.samsung.com/tr/smartphones/galaxy-a/galaxy-a26-5g-black-256gb-sm-a266bzkctur/", market: "TR", observedAt, applicability: "EXACT_CONFIGURATION", limitations: [] },
  { sourceId: "next-tr:YE-55GFSG8-QLED", kind: "OFFICIAL_TR_MANUFACTURER", uri: "https://www.next.com.tr/Data/EditorFiles/katalog/Next_Katalog_2026.pdf", market: "TR", observedAt, applicability: "EXACT_CONFIGURATION", limitations: [] },
  { sourceId: "sony-tr:ZVE10M2KB.CEC", kind: "OFFICIAL_TR_MANUFACTURER", uri: "https://www.sony.com.tr/electronics/degistirilebilir-lensli-fotograf-makineleri/zv-e10m2/buy/zve10m2kb.cec", market: "TR", observedAt, applicability: "EXACT_CONFIGURATION", limitations: [] },
  { sourceId: "samsung-tr:MU-PC1T0T/WW", kind: "OFFICIAL_TR_MANUFACTURER", uri: "https://www.samsung.com/tr/memory-storage/portable-ssd/portable-ssd-t7-1tb-gray-mu-pc1t0t-ww/", market: "TR", observedAt, applicability: "EXACT_CONFIGURATION", limitations: ["Amazon listing currently had no observed price; commerce state is unavailable/unknown."] },
  { sourceId: "hp-tr:1F3Y4A", kind: "OFFICIAL_TR_SUPPORT", uri: "https://support.hp.com/tr-tr/drivers/hp-smart-tank-580-all-in-one-printer/model/2101277338?sku=1F3Y4A", market: "TR", observedAt, applicability: "EXACT_CONFIGURATION", limitations: [] },
  { sourceId: "eaton-tr:5E1600UD", kind: "OFFICIAL_TR_MANUFACTURER", uri: "https://www.eaton.com/tr/tr-tr/skuPage.5E1600UD.html", market: "TR", observedAt, applicability: "EXACT_CONFIGURATION", limitations: [] },
];

const issues = validateAmazonPrimaryResearch({ auditRows, candidates, categoryIds: ELECTRONICS_CATEGORY_REGISTRY.map(category => category.categoryId) });
if (issues.length) throw new Error(`ELECTRONICS_AMAZON_PRIMARY_INVALID:${issues.join(",")}`);
const canonical = (value: unknown): string => value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b, "en")).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
const digest = (value: unknown) => `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
const coverage = ELECTRONICS_CATEGORY_REGISTRY.map(category => { const rows = auditRows.filter(item => item.categoryId === category.categoryId); return { categoryId: category.categoryId, wave: category.wave, queryRuns: queryRuns.filter(run => run.categoryId === category.categoryId).length, discoveredAsins: rows.length, plausibleExactInvestigated: rows.filter(row => !["ACCESSORY_OR_BUNDLE", "AMBIGUOUS_OR_FAMILY_ONLY"].includes(row.disposition)).length, dispositions: Object.fromEntries([...new Set(rows.map(row => row.disposition))].map(disposition => [disposition, rows.filter(row => row.disposition === disposition).length])), catalogAdmissibleCandidates: candidates.filter(candidate => candidate.categoryId === category.categoryId).length }; });
const candidateAsins = new Set(candidates.map(candidate => candidate.asin));
const payload = { schemaVersion: ELECTRONICS_AMAZON_PRIMARY_SCHEMA_VERSION, workUnit: "WU-ELECTRONICS-AMAZON-TR-PRIMARY-CATALOG-01B", authorityStatus: "RESEARCH_ONLY_NOT_ACTIVE", scope: { departmentId: "ELECTRONICS", market: "TR", categoryCount: 24, exhaustiveCoverageClaim: false }, method: { queryFamiliesPerCategory: 3, genericQueryPagesAttempted: 2, retainedResultCap: { genericPage1: 1, targetedPage1: 2, genericPage2: 1 }, retainedCandidateInvestigations: auditRows.length, deduplication: "ASIN_THEN_EXACT_MANUFACTURER_CONFIGURATION", admission: "EXACT_AMAZON_IDENTITY_PLUS_EXACT_TR_MANUFACTURER_OR_AUTHORIZED_CORROBORATION", limitations: ["Public search ordering is volatile and sponsored.", "Three deterministic query families plus a second generic result page per category form a bounded acquisition release, not exhaustive Amazon coverage.", "Second pages that exposed no retainable card are explicitly PAGE_UNAVAILABLE; no rows were invented.", "Audit rows are deduplicated candidate-level investigations within the declared retained cap, not a copy of unlimited noisy raw cards."] }, queryRuns, sources, auditRows, rejectionLedger: auditRows.filter(row => !candidateAsins.has(row.asin ?? "")), candidates, coverage, boundaries: { amazonTechnicalAuthority: "NONE", amazonDecisionAuthority: "NONE", priceStockSellerAffiliateSponsorship: "L10_NONE", mediaCopied: false, activePointersMutated: false } };
const manifest = { schemaVersion: "electronics-amazon-tr-primary-manifest/v1", generatedAt: observedAt, payloadFile: "amazon-primary-research.json", payloadDigest: digest(payload), counts: { categories: 24, queryRuns: queryRuns.length, auditRows: auditRows.length, candidates: candidates.length, rejections: auditRows.length - candidates.length }, activation: { permitted: false, productionAuthority: false } };
const output = path.join(process.cwd(), "data/research/electronics/amazon-tr-primary-catalog-01"); mkdirSync(output, { recursive: true });
writeFileSync(path.join(output, "amazon-primary-research.json"), `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(path.join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ output, ...manifest.counts, payloadDigest: manifest.payloadDigest }));
