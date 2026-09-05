import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ELECTRONICS_CATEGORY_REGISTRY } from "../features/electronics/architectureBaseline";
import {
  ELECTRONICS_COVERAGE_EXPANSION_SCHEMA_VERSION,
  uniqueAsinCount,
  validateListingObservations,
  type AmazonListingObservation,
} from "../features/electronics/catalogCoverageExpansion";

const workUnit = "WU-ELECTRONICS-AMAZON-TR-CATALOG-COVERAGE-EXPANSION-01";
const observedAt = "2026-09-06T00:00:00.000Z";
const root = process.cwd();
const activeCatalogPath = path.join(root, "data/production/electronics/runtime/releases/ELECTRONICS-RUNTIME-CATALOG-TR-v1.0/catalog.json");
const priorResearchPath = path.join(root, "data/research/electronics/amazon-tr-primary-catalog-01/amazon-primary-research.json");
const activeCatalog = JSON.parse(readFileSync(activeCatalogPath, "utf8"));
const priorResearch = JSON.parse(readFileSync(priorResearchPath, "utf8"));

const headphoneRows = [
  ["B0FKN8GTGS", "HUAWEI FreeBuds 7i Kulaklık, Siyah", "3.714,20 TL", true, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0D35JN2JH", "HUAWEI FreeBuds 6i TWS Bluetooth Kulaklık, Beyaz", "3.366,00 TL", true, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0F68YX7TS", "HUAWEI FreeBuds 6 Kablosuz Kulaklık, Mor", "6.949,00 TL", true, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0BYWL962Q", "JBL Tune 720BT Wireless Kulaklık, Beyaz", "2.285,65 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0FQF59PPW", "Apple AirPods Pro 3, USB-C", "12.198,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0C3BSZ56D", "HyperX Cloud III Oyuncu Kulaklığı, Siyah", "3.324,05 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B01DEWVZ2C", "JBL C100SI 3.5 mm Kulak İçi Kulaklık, Siyah", "521,10 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0D7QKV9K4", "Apple EarPods 3.5 mm, MWU53TU/A", "699,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0DMZWD4JP", "UGREEN HiTune S3 Açık Spor Kulaklık, Siyah", "1.499,48 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0CDMB5ZQW", "HUAWEI FreeBuds SE 2, Beyaz", "1.329,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0DGJDW9G4", "Apple AirPods 4 ANC, USB-C", "9.407,04 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0DBHTG7ZX", "Xiaomi Redmi Buds 6 Play, Mavi", "795,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B089SSFV85", "Razer BlackShark V2 X, Siyah", "2.499,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0C6KKQ7ND", "Soundcore Space One A3035, Mavi", "4.464,05 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B09X5G16ZM", "Razer Barracuda X, Siyah", "3.749,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0CRTYZG5C", "Soundcore R50i NC A3959, Siyah", "1.799,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B084S6BCJN", "Philips TAUE101BK 3.5 mm Kulak İçi Kulaklık", "349,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B085RN9GRX", "Samsung EO-IC100B USB-C Kablolu Kulaklık, Siyah", "880,04 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0F93QP4RK", "Razer BlackShark V3 Kablosuz, Beyaz", "6.899,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0DCW94411", "Apple EarPods USB-C, MYQY3TU/A", null, false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0FK9TJZV2", "HUAWEI FreeBuds SE 4 ANC, Beyaz", "2.099,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0F6NZWPTC", "HyperX Cloud III S Wireless, Siyah", "6.599,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B07XC936P8", "Razer Kraken X Lite, Siyah", "1.249,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0D5CZQ31M", "Marshall Major V Bluetooth On-Ear, Cream", "5.849,10 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0DHL93XCN", "JBL Wave Beam 2 TWS, Siyah", "2.733,22 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0BTYCRJSS", "Soundcore P20i A3949, Siyah", "1.199,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0D6NLHV8N", "JBL Quantum 100M2 Kablolu Gaming, Siyah", "1.735,65 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0FR98G8PL", "Samsung Galaxy Buds3 FE, Siyah", "4.849,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0D2XRXNGY", "Soundcore V20i Open-Ear A3876, Siyah", "1.999,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
  ["B0F4884LN3", "Soundcore Q20i A3004 Over-Ear ANC, Pembe", "2.899,00 TL", false, "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"],
] as const;

const observations: AmazonListingObservation[] = headphoneRows.map(([asin, title, priceDisplay, sponsored, disposition]) => ({
  categoryId: "HEADPHONES",
  query: "kulaklık",
  page: 1,
  asin,
  canonicalUrl: `https://www.amazon.com.tr/dp/${asin}`,
  title,
  observedAt,
  sponsored,
  availability: priceDisplay === null ? "NO_FEATURED_OFFER" : "PRICE_OBSERVED",
  priceDisplay,
  seller: null,
  fulfilment: null,
  disposition,
  reason: "Amazon listing is discovery/commerce evidence only; exact manufacturer identity and Türkiye applicability must be independently reconciled before admission.",
}));

const issues = validateListingObservations(observations);
if (issues.length) throw new Error(`INVALID_EXPANSION_OBSERVATIONS:${issues.join(",")}`);

const activeCounts = Object.fromEntries(ELECTRONICS_CATEGORY_REGISTRY.map((category) => [
  category.categoryId,
  activeCatalog.products.filter((product: { categoryId: string }) => product.categoryId === category.categoryId).length,
]));
const priorCoverage = Object.fromEntries(priorResearch.coverage.map((row: { categoryId: string }) => [row.categoryId, row]));
const categoryCoverage = ELECTRONICS_CATEGORY_REGISTRY.map((category) => {
  const isHeadphones = category.categoryId === "HEADPHONES";
  const observedAsinCount = isHeadphones ? uniqueAsinCount(observations) : priorCoverage[category.categoryId].discoveredAsins;
  return {
    categoryId: category.categoryId,
    activeRuntimeProductCount: activeCounts[category.categoryId],
    observedAsinCount,
    plausibleExactCount: isHeadphones ? observations.length : priorCoverage[category.categoryId].plausibleExactInvestigated,
    admittedExactProductCount: activeCounts[category.categoryId],
    status: "COVERAGE_INCOMPLETE",
    blockers: isHeadphones
      ? ["PRIMARY_EVIDENCE_RECONCILIATION_PENDING", "PAGES_2_PLUS_AND_BRAND_QUERIES_PENDING", "NO_EXACT_PRODUCT_ADMISSION_FROM_AMAZON_ONLY"]
      : ["BROAD_AMAZON_ACQUISITION_PENDING", "CATEGORY_ADEQUACY_NOT_ESTABLISHED"],
  };
});

const beforeState = {
  schemaVersion: "electronics-catalog-before-state/v1",
  workUnit,
  capturedAt: observedAt,
  base: { gitHead: "246e4c0", activeCatalogPath: path.relative(root, activeCatalogPath), activeCatalogDigest: activeCatalog.catalogReleaseDigest },
  totals: { categories: ELECTRONICS_CATEGORY_REGISTRY.length, products: activeCatalog.products.length, facts: activeCatalog.products.reduce((sum: number, product: { facts: unknown[] }) => sum + product.facts.length, 0) },
  categoryCounts: ELECTRONICS_CATEGORY_REGISTRY.map((category) => ({ categoryId: category.categoryId, productCount: activeCounts[category.categoryId] })),
  priorAmazonResearch: { observedAsins: priorResearch.auditRows.length, admittedCandidates: priorResearch.candidates.length, queryRuns: priorResearch.queryRuns.length, retainedCaps: priorResearch.method.retainedResultCap },
};
const candidate = {
  schemaVersion: ELECTRONICS_COVERAGE_EXPANSION_SCHEMA_VERSION,
  workUnit,
  authorityStatus: "RESEARCH_IN_PROGRESS_NOT_RELEASE_CANDIDATE",
  observedAt,
  amazonAuthority: { technical: "NONE", decision: "NONE", ranking: "NONE", priceStockSeller: "VOLATILE_COMMERCE_ONLY" },
  acquisition: { exhaustiveClaim: false, completedCategories: ["HEADPHONES"], pendingCategories: ELECTRONICS_CATEGORY_REGISTRY.filter((row) => row.categoryId !== "HEADPHONES").map((row) => row.categoryId), observations },
  categoryCoverage,
  releaseGate: { passed: false, blockers: ["23_CATEGORY_ACQUISITION_WAVES_PENDING", "EXACT_IDENTITY_AND_PRIMARY_EVIDENCE_PENDING", "CATEGORY_ADEQUACY_GAP_24_OF_24", "PRODUCT_OWNER_MANIFEST_NOT_YET_ELIGIBLE"] },
};
const canonical = (value: unknown): string => {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new Error("CANONICALIZATION_REQUIRES_JSON_VALUE");
  }
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b, "en")).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
};
const sha = (value: unknown) => `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
const output = path.join(root, "data/research/electronics/catalog-coverage-expansion-01");
mkdirSync(output, { recursive: true });
writeFileSync(path.join(output, "before-state.json"), `${JSON.stringify(beforeState, null, 2)}\n`);
writeFileSync(path.join(output, "headphones-amazon-observations.json"), `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(path.join(output, "manifest.json"), `${JSON.stringify({ schemaVersion: "electronics-catalog-coverage-expansion-manifest/v1", workUnit, generatedAt: observedAt, authorityStatus: candidate.authorityStatus, files: [{ path: "before-state.json", digest: sha(beforeState) }, { path: "headphones-amazon-observations.json", digest: sha(candidate) }], activationPermitted: false }, null, 2)}\n`);
console.log(JSON.stringify({ products: beforeState.totals.products, headphonesObservedAsins: uniqueAsinCount(observations), releaseGate: candidate.releaseGate }));
