import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type AuditStatus = "EXACT_ACTIVE_LISTING_CONFIRMED" | "EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE" | "AMBIGUOUS_OR_FAMILY_ONLY" | "NOT_FOUND" | "BLOCKED_OR_UNVERIFIABLE";
type Product = { readonly exactProductId: string; readonly categoryId: string; readonly brand: string; readonly model: string };
type Finding = { readonly status: AuditStatus; readonly asin: string | null; readonly observedAmazonUrl: string | null; readonly retrievedAt: string; readonly exactMatchEvidence: readonly string[]; readonly sellerObservation: string | null; readonly availabilityObservation: string; readonly priceObservation: string | null; readonly reviewCountObservation: string | null; readonly sponsorshipObservation: string; readonly confidence: "HIGH" | "MEDIUM" | "LOW" };

const root = process.cwd();
const commerceDirectory = path.join(root, "data/production/appliances/commerce");
const pointer = JSON.parse(readFileSync(path.join(commerceDirectory, "current.json"), "utf8")) as { snapshotFile: string; snapshotDigest: string };
if (!/^snapshots\/[A-Za-z0-9._+-]+\.json$/u.test(pointer.snapshotFile)) throw new Error("INVALID_COMMERCE_POINTER");
const snapshot = JSON.parse(readFileSync(path.join(commerceDirectory, pointer.snapshotFile), "utf8")) as { snapshotDigest: string; productScope: readonly Product[] };
if (snapshot.snapshotDigest !== pointer.snapshotDigest || snapshot.productScope.length !== 97 || new Set(snapshot.productScope.map(item => item.categoryId)).size !== 24) throw new Error("ACTIVE_SCOPE_NOT_97_PRODUCTS_24_CATEGORIES");

const countsByIndex = [11,3,1,2,14,1,8,2,9,1,0,0,2,0,48,3,3,0,8,0,0,0,1,0,1,0,0,0,2,5,11,11,7,2,3,3,48,1,4,0,8,12,1,0,0,48,0,1,1,8,2,14,1,1,48,0,0,0,0,48,0,48,59,0,0,0,3,13,57,52,44,19,29,0,0,1,0,9,9,9,9,0,0,0,1,0,12,12,0,0,0,1,1,0,0,0,0] as const;
if (countsByIndex.length !== 97) throw new Error("SEARCH_COUNT_LEDGER_INCOMPLETE");

const exact = (
  status: Extract<AuditStatus, "EXACT_ACTIVE_LISTING_CONFIRMED" | "EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE">,
  asin: string,
  retrievedAt: string,
  title: string,
  availabilityObservation: string,
  sellerObservation: string | null,
  priceObservation: string | null,
  reviewCountObservation: string | null,
  sponsorshipObservation = "NOT_OBSERVED",
): Finding => ({ status, asin, observedAmazonUrl: `https://www.amazon.com.tr/dp/${asin}`, retrievedAt, exactMatchEvidence: [`Amazon native search result exposed ASIN ${asin}.`, `The directly opened Amazon detail title matched the frozen product model and product type: ${title}`], sellerObservation, availabilityObservation, priceObservation, reviewCountObservation, sponsorshipObservation, confidence: "HIGH" });

const unavailable = "Exact Amazon detail page verified; the bounded logged-out surface exposed no featured offer and no add-to-cart action. Conflicting prices or third-party offer links were not admitted.";
const findings: Record<string, Finding> = {
  PHILIPS_NA350_00_TR: exact("EXACT_ACTIVE_LISTING_CONFIRMED", "B0CQMPH7BJ", "2026-09-05T00:39:58.683Z", "Philips Çift Hazneli Airfryer 3000 Serisi (NA350/00)", "Stokta var; add-to-cart present.", "kolaysepet", "8.837,01 TL", "3.029"),
  PHILIPS_AC1711_10_TR: exact("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "B09QSVG2QS", "2026-09-05T00:39:59.257Z", "Philips 1000 Serisi Hava Temizleyici (AC1711/10)", unavailable, null, null, "556"),
  BOSCH_MMB6172S_TR: exact("EXACT_ACTIVE_LISTING_CONFIRMED", "B08DJ1RKNY", "2026-09-05T00:39:59.082Z", "Bosch MMB6172S VitaPower Series 4 blender", "Stokta sadece 3 adet kaldı; add-to-cart present.", "Asyashowroom", "5.900,00 TL", "230"),
  PHILIPS_HR2291_41_TR: exact("EXACT_ACTIVE_LISTING_CONFIRMED", "B09CTWKTH7", "2026-09-05T00:39:59.164Z", "Philips 3000 Serisi blender (HR2291/41)", "Stokta var; add-to-cart present.", "Dükkan35", "3.399,00 TL", "3.391"),
  ARCELIK_AFC_120_S_TR: exact("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "B0DW9DNXDC", "2026-09-05T00:40:01.221Z", "Arçelik AFC 120 S Ankastre Fırın", unavailable, null, null, null),
  PHILIPS_HD7462_20_TR: exact("EXACT_ACTIVE_LISTING_CONFIRMED", "B00R04CAWA", "2026-09-05T00:40:01.322Z", "Philips Filtre Kahve Makinesi HD7462/20", "Stokta var; add-to-cart present.", null, "2.999,00 TL", "3.247", "SPONSORED_AND_ORGANIC_PLACEMENT_OBSERVED"),
  BOSCH_MCM3501M_TR: exact("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "B015DR863C", "2026-09-05T00:40:01.262Z", "Bosch MultiTalent 3 MCM3501M", unavailable, null, null, "7.013"),
  ARCELIK_2682_NFB_TR: exact("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "B0GTTVYYXV", "2026-09-05T00:40:01.220Z", "Arçelik 2682 NFB Dikey Derin Dondurucu", unavailable, null, null, null),
  DELONGHI_ECAM220_22_GB_TR: exact("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "B0BHMNHHM7", "2026-09-05T00:40:03.058Z", "Delonghi Magnifica Start ECAM220.22.GB", unavailable, null, null, "23"),
  PHILIPS_EP2220_10_TR: exact("EXACT_ACTIVE_LISTING_CONFIRMED", "B07MMSHC4R", "2026-09-05T00:40:03.551Z", "Philips 2200 Serisi EP2220/10", "Stokta var; add-to-cart present.", "Dükkan35", "10.299,00 TL", "25.492"),
  ARNICA_EG54030_HAMMAM_TR: exact("EXACT_ACTIVE_LISTING_CONFIRMED", "B07CJYPSRW", "2026-09-05T00:40:03.262Z", "Arnica EG54030 Hammam Elektrikli Şofben", "Stokta sadece 1 adet kaldı; add-to-cart present.", "TAŞARAVM", "4.999,00 TL", "3"),
  ARZUM_AR012_LAGUNA_TR: exact("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "B079997CZQ", "2026-09-05T00:40:03.019Z", "Arzum AR012 Laguna", unavailable, null, null, "13"),
  DELONGHI_EC685_M_TR: exact("EXACT_ACTIVE_LISTING_CONFIRMED", "B0915K949D", "2026-09-05T00:40:05.394Z", "DeLonghi EC 685 M Dedica Style", "Stokta sadece 2 adet kaldı; add-to-cart present.", "TAŞARAVM", "19.999,00 TL", "85"),
  SMEG_ECF02CREU_TR: exact("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "B0BYMSXD2L", "2026-09-05T00:40:05.581Z", "Smeg ECF02CREU espresso machine", unavailable, null, null, "50"),
  ARCELIK_ADE_6041_B1_TR: exact("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "B0GTRKTB5R", "2026-09-05T00:40:05.283Z", "Arçelik ADE 6041 B1 davlumbaz", unavailable, null, null, null),
  BOSCH_BCRC2W_TR: exact("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "B0G1SYVR81", "2026-09-05T00:40:05.413Z", "Bosch BCRC2W Robot Süpürge", unavailable, null, null, null),
  XIAOMI_X20_PRO_TR: exact("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "B0DFJGKW2L", "2026-09-05T00:40:07.477Z", "Xiaomi Robot Vacuum X20 Pro", unavailable, null, null, "821"),
  ARCELIK_K3300_TFF_TR: exact("EXACT_ACTIVE_LISTING_CONFIRMED", "B0H95F4NSS", "2026-09-05T00:40:07.386Z", "Arçelik K 3300 TFF Türk Kahvesi Makinesi", "Stokta sadece 11 adet kaldı; add-to-cart present.", "UZUNKAYA MAĞAZACILIK", "6.890,00 TL", null),
  BOSCH_BGC21X300_TR: exact("EXACT_ACTIVE_LISTING_CONFIRMED", "B0B7K29T66", "2026-09-05T00:40:07.758Z", "Bosch BGC21X300 vacuum", "Stokta sadece 10 adet kaldı; add-to-cart present.", "EvPlus - Bosch Yetkili Satıcısı", "8.850,00 TL", "4"),
  "appliances:wm:tr:samsung:ww11db8b95gbah": exact("EXACT_ACTIVE_LISTING_CONFIRMED", "B0DFCHC7FT", "2026-09-05T00:40:10.004Z", "Samsung WW11DB8B95GBAH Çamaşır Makinesi", "Stokta sadece 5 adet kaldı; add-to-cart present.", "smartevim", "43.199,00 TL", null),
  "appliances:wm:tr:samsung:ww90cgc04daeah": exact("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "B0DDYDP3K6", "2026-09-05T00:40:10.065Z", "Samsung WW90CGC04DAEAH çamaşır makinesi", unavailable, null, null, "1"),
};

const ambiguousInput: Readonly<Record<string, { readonly asin: string; readonly title: string; readonly reason: string; readonly confidence?: "MEDIUM"; readonly sponsorship?: string }>> = {
  NINJA_AF400EU_TR: { asin: "B0DKY73G2C", title: "Ninja Foodi Max Dual Zone AF400EU Rezeptbuch", reason: "Only recipe books/accessories repeated AF400EU; the appliance itself was not verified." },
  XIAOMI_AC_M16_SC_TR: { asin: "B0CVRVJSVG", title: "Third-party replacement filter compatible with Xiaomi AC-M16-SC", reason: "Compatibility text is not the exact air purifier product." },
  BEKO_BMD200G_TR: { asin: "B0DZ2W143H", title: "Beko BMD 200 G glass tray", reason: "Spare glass tray, not the microwave oven." },
  BEKO_BM4044_TR: { asin: "B0DZ2FCZ1H", title: "Beko BM 4044 cutlery basket", reason: "Spare basket and motors repeated the model; no dishwasher product listing was verified." },
  BEKO_KM_99_TR: { asin: "B0DYVQJ69G", title: "Beko KM 99 cassette filter", reason: "Replacement filter, not the dryer." },
  ARCELIK_CM3940P_TR: { asin: "B0DKJXLZSB", title: "Arçelik CM-3940 P glass pot", reason: "Replacement glass pot, not the filter coffee machine.", sponsorship: "SPONSORED_DERIVATIVE_RESULT_OBSERVED" },
  BOSCH_TKA6A041_TR: { asin: "B07C7SN9N4", title: "Bosch TKA6 A041 replacement glass pot", reason: "Replacement pot/filter holder, not the coffee machine." },
  ARCELIK_8315_TR: { asin: "B0DZ2WN9ZZ", title: "Arçelik 8315 enamel tray", reason: "Spare oven tray/gasket, not the freestanding cooker." },
  BEKO_FE_411_TR: { asin: "B0DZ2X1BMS", title: "Beko FE 411 oven switch", reason: "Spare switch/tray/gasket, not the freestanding cooker." },
  ARCELIK_P_18_YCB_TR: { asin: "B0CQHB8RD5", title: "P 18 YCB hood motor", reason: "Replacement motor, not the range hood." },
  BOSCH_DWP64CC50T_TR: { asin: "B0GQV346VF", title: "Filter compatible with Bosch DWP64CC50T", reason: "Compatible carbon/grease filters, not the range hood." },
  XIAOMI_H40_OV51_TR: { asin: "B0F4JZNGT8", title: "Xiaomi Robot Vacuum H40", reason: "H40 product page did not expose the frozen exact paired H40 / OV51 identity; ASIN or H40 alone cannot cure the missing OV51 evidence.", confidence: "MEDIUM" },
  ARZUM_OK004_0400_TR: { asin: "B01N0Y6D8Z", title: "Arzum OK004 Okka Minio", reason: "Direct detail page matched OK004 but did not expose the exact -0400 configuration identifier.", confidence: "MEDIUM" },
  KARACA_HATIR_HUP_TR: { asin: "B0CKWD9J3R", title: "Karaca Hatır Hüp Duet Aroma", reason: "Duet Aroma is a family/variant listing and cannot establish the frozen Hatır Hüp identity.", confidence: "MEDIUM" },
  PHILIPS_FC9750_07_TR: { asin: "B0GYX64WHB", title: "Filter compatible with Philips FC9750/07", reason: "Compatible filters and heads, not the vacuum." },
};

for (const [productId, item] of Object.entries(ambiguousInput)) {
  findings[productId] = { status: "AMBIGUOUS_OR_FAMILY_ONLY", asin: item.asin, observedAmazonUrl: `https://www.amazon.com.tr/dp/${item.asin}`, retrievedAt: "2026-09-05T00:39:27.147Z", exactMatchEvidence: [`Amazon result title: ${item.title}`, item.reason], sellerObservation: null, availabilityObservation: "No exact-product availability observation admitted.", priceObservation: null, reviewCountObservation: null, sponsorshipObservation: item.sponsorship ?? "NOT_OBSERVED", confidence: item.confidence ?? "HIGH" };
}

const rows = snapshot.productScope.map((product, index) => {
  const searchUrl = `https://www.amazon.com.tr/s?k=${encodeURIComponent(`${product.brand} ${product.model}`).replaceAll("%20", "+")}`;
  const finding = findings[product.exactProductId] ?? { status: "NOT_FOUND" as const, asin: null, observedAmazonUrl: null, retrievedAt: "2026-09-05T00:39:27.147Z", exactMatchEvidence: [`Amazon.com.tr was queried with the frozen brand and manufacturer model: ${product.brand} ${product.model}.`, `${countsByIndex[index]} result card(s) were inspected; none exposed the same exact model identity and product type.`], sellerObservation: null, availabilityObservation: "No exact listing was verified; this is a bounded observation, not an exhaustive inventory claim.", priceObservation: null, reviewCountObservation: null, sponsorshipObservation: "NOT_OBSERVED", confidence: "MEDIUM" as const };
  return { productId: product.exactProductId, categoryId: product.categoryId, brand: product.brand, model: product.model, searchUrl, searchResultCount: countsByIndex[index], ...finding };
});

const statuses: readonly AuditStatus[] = ["EXACT_ACTIVE_LISTING_CONFIRMED", "EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE", "AMBIGUOUS_OR_FAMILY_ONLY", "NOT_FOUND", "BLOCKED_OR_UNVERIFIABLE"];
const overall = Object.fromEntries(statuses.map(status => [status, rows.filter(row => row.status === status).length]));
const categories = [...new Set(rows.map(row => row.categoryId))].sort().map(categoryId => {
  const statusCounts = Object.fromEntries(statuses.map(status => [status, rows.filter(row => row.categoryId === categoryId && row.status === status).length])) as Record<AuditStatus, number>;
  return { categoryId, productCount: rows.filter(row => row.categoryId === categoryId).length, ...statusCounts };
});
const payload = { schemaVersion: "appliances-amazon-availability-audit/v1", workUnit: "WU-APPL-AMAZON-COMMERCE-READINESS-01", market: "TR", marketplace: "www.amazon.com.tr", auditWindow: { startedAt: "2026-09-05T00:38:06.127Z", completedAt: "2026-09-05T00:40:10.065Z", accessContext: "Logged-out Amazon.com.tr web surface; Istanbul 34096 delivery context shown by Amazon." }, scopeAuthority: { productCount: 97, categoryCount: 24, commerceSnapshotFile: pointer.snapshotFile, commerceSnapshotDigest: pointer.snapshotDigest, technicalPointersMutated: false }, method: { discovery: "One exact brand + frozen manufacturer-model query per product on Amazon.com.tr.", directVerification: "Plausible same-product cards were opened at their ASIN detail target; title/model, product type, offer action, seller, and visible availability were inspected.", rejection: "ASIN, title similarity, accessories, replacement parts, family variants, and partial model tokens were not enough.", boundedness: "Observed coverage only. Amazon inventory is dynamic, delivery-context dependent, and not claimed exhaustive." }, hypothesisVerdict: { hypothesis: "Nearly all 97 frozen Appliances products exist on Amazon.com.tr.", verdict: "REJECTED", reason: "Only 21/97 exact listing pages were confirmed, and only 10/97 exposed a current add-to-cart/stock observation in the bounded audit." }, overall, categories, rows };
const artifact = { ...payload, auditDigest: createHash("sha256").update(JSON.stringify(payload)).digest("hex") };

const output = path.join(root, "data/research/appliances-amazon-commerce-readiness-01");
mkdirSync(output, { recursive: true });
writeFileSync(path.join(output, "availability-audit.json"), `${JSON.stringify(artifact, null, 2)}\n`);
const csvCell = (value: unknown) => JSON.stringify(value ?? "");
writeFileSync(path.join(output, "availability-audit.csv"), `productId,categoryId,brand,model,status,asin,observedAmazonUrl,retrievedAt,confidence,searchResultCount\n${rows.map(row => [row.productId,row.categoryId,row.brand,row.model,row.status,row.asin,row.observedAmazonUrl,row.retrievedAt,row.confidence,row.searchResultCount].map(csvCell).join(",")).join("\n")}\n`);
const table = categories.map(item => `| ${item.categoryId} | ${item.productCount} | ${item.EXACT_ACTIVE_LISTING_CONFIRMED} | ${item.EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE} | ${item.AMBIGUOUS_OR_FAMILY_ONLY} | ${item.NOT_FOUND} | ${item.BLOCKED_OR_UNVERIFIABLE} |`).join("\n");
const list = (status: AuditStatus) => rows.filter(row => row.status === status).map(row => `- ${row.productId} — ${row.brand} ${row.model}${row.asin ? ` — ${row.asin}` : ""}`).join("\n") || "- None";
writeFileSync(path.join(output, "summary.md"), `# Amazon.com.tr exact-product availability audit\n\nBounded live audit: 2026-09-05 00:38:06–00:40:10 UTC, logged-out Amazon.com.tr surface with Istanbul 34096 delivery context. This is observed coverage, not an exhaustive Amazon inventory claim.\n\nThe hypothesis that nearly all 97 frozen products exist on Amazon.com.tr is **rejected**. Exact listing pages were confirmed for 21/97 products (21.6%); only 10/97 (10.3%) exposed a current stock/add-to-cart observation. Unavailable, ambiguous, and not-found products remain fully valid technical candidates.\n\n| Category | Products | Exact active | Exact unavailable | Ambiguous/family | Not found | Blocked |\n|---|---:|---:|---:|---:|---:|---:|\n${table}\n\n## Exact active listings\n\n${list("EXACT_ACTIVE_LISTING_CONFIRMED")}\n\n## Exact listings currently unavailable\n\n${list("EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE")}\n\n## Ambiguous, family-only, accessory, or spare-part results\n\n${list("AMBIGUOUS_OR_FAMILY_ONLY")}\n\n## Not found in the bounded exact search\n\n${list("NOT_FOUND")}\n\n## Blocked or unverifiable\n\n${list("BLOCKED_OR_UNVERIFIABLE")}\n`);
console.log(JSON.stringify({ output, overall, categoryCount: categories.length, rowCount: rows.length }));
