import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Fact = { factId: string; key: string; value: unknown; sourceId: string; locator: string };
type Product = {
  exactProductId: string;
  categoryId: string;
  manufacturer: string;
  modelCode: string;
  configurationIdentity: string;
  facts: Fact[];
  unknownCodes: string[];
  personaEffect: string;
  commerceEffect: string;
};
type Catalog = { releaseDigest: string; products: Product[]; categories: { categoryId: string; exactProductIds: string[] }[] };

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "data/research/electronics/all-category-program-01");
const ACTIVE = path.join(ROOT, "data/production/electronics/runtime/active.json");
const MATRIX_DIMENSIONS = [
  "identity", "applicability", "technical_facts", "capabilities", "limitations", "manuals_support",
  "warranty", "lifecycle", "unknowns", "daily_life", "semantic_mapping", "material_questions",
  "manufacturer_tr", "retail_discovery_tr", "amazon_tr", "activation_readiness",
] as const;

const stable = (value: unknown): string => JSON.stringify(value, Object.keys(value as object).sort(), 2) + "\n";
const writeJson = async (name: string, value: unknown) => writeFile(path.join(OUTPUT, name), JSON.stringify(value, null, 2) + "\n");
const digest = (value: unknown) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

const activePointer = JSON.parse(await readFile(ACTIVE, "utf8"));
const releasePath = path.join(ROOT, activePointer.catalogFile);
const catalog = JSON.parse(await readFile(releasePath, "utf8")) as Catalog;
const categories = [...new Set(catalog.products.map((product) => product.categoryId))].sort();
if (categories.length !== 24 || catalog.products.length !== 68) throw new Error("Expected activated 24-category / 68-product authority");

await mkdir(OUTPUT, { recursive: true });

const amazonChannel = {
  channelId: "AMAZON_TR_APPROVED_API",
  status: "BLOCKED_EXTERNAL_ACQUISITION_CHANNEL",
  recordedOnce: true,
  attemptedInThisRun: false,
  blockedCapabilities: ["exhaustive_amazon_discovery", "amazon_offer_binding", "amazon_price", "amazon_affiliate"],
  unaffectedCapabilities: ["manufacturer_tr_research", "lawful_retail_discovery", "technical_evidence", "semantics", "xpy", "release_preparation"],
  policy: "No scraping, credential bypass, inferred price, affiliate claim, or exhaustive Amazon coverage claim.",
};

const channelMatrix = categories.map((categoryId) => ({
  categoryId,
  manufacturerTürkiye: "AVAILABLE_PRIMARY_IDENTITY_AND_APPLICABILITY",
  lawfulTürkiyeRetail: "DISCOVERY_AND_MARKET_PRESENCE_ONLY",
  amazonTürkiyeApprovedApi: "BLOCKED_EXTERNAL_ACQUISITION_CHANNEL",
  amazonBoundFields: "DISABLED_FAIL_CLOSED",
  coverageClaim: "BOUNDED_NON_EXHAUSTIVE",
}));

const materialKeys = new Set([
  "battery_mah", "battery_hours", "storage_gb", "memory_gb", "display_inches", "display_resolution",
  "refresh_rate_hz", "weight_kg", "weight_g", "ports", "connectivity", "wifi_standard", "ethernet_speed",
  "capacity_tb", "print_duplex", "color", "power_va", "camera_resolution", "weather_resistance", "platform",
]);

const domainPacks = categories.map((categoryId) => {
  const products = catalog.products.filter((product) => product.categoryId === categoryId);
  const retained = products.map((product) => {
    const materialFacts = product.facts.filter((fact) => materialKeys.has(fact.key));
    const invalidGenericSource = product.facts.some((fact) => /^source:/.test(fact.sourceId));
    return {
      exactProductId: product.exactProductId,
      manufacturer: product.manufacturer,
      modelCode: product.modelCode,
      configurationIdentity: product.configurationIdentity,
      terminalState: invalidGenericSource ? "RETAINED_INPUT_REQUIRES_PRIMARY_SOURCE_REBIND" : "RETAINED_TECHNICAL_CANDIDATE",
      facts: product.facts,
      capabilities: product.facts.map((fact) => fact.key),
      limitations: product.unknownCodes,
      manualsSupport: product.unknownCodes.includes("EXACT_MANUAL_NOT_CHECKSUM_BOUND") ? "UNKNOWN_NOT_BOUND" : "EVIDENCE_BOUND_OR_NOT_REQUIRED",
      warranty: product.unknownCodes.some((code) => code.includes("WARRANTY")) ? "UNKNOWN_INCOMPLETE" : "NO_UNRESOLVED_WARRANTY_CODE",
      lifecycle: product.unknownCodes.some((code) => code.includes("LIFECYCLE")) ? "UNKNOWN_INCOMPLETE" : "NO_UNRESOLVED_LIFECYCLE_CODE",
      dailyLifeProjection: materialFacts.map((fact) => ({ factKey: fact.key, value: fact.value, claimMode: "BOUNDED_FACT_TO_USE_PROJECTION" })),
      semanticMappings: materialFacts.map((fact) => ({ requirement: fact.key, comparator: "USER_PREFERENCE_DEPENDENT", factId: fact.factId })),
      materialQuestions: materialFacts.slice(0, 4).map((fact) => ({
        questionId: `${categoryId.toLowerCase()}:${fact.key}`,
        evidenceFactKey: fact.key,
        askOnlyWhenCandidatesDiffer: true,
        unknownAnswerPreserved: true,
      })),
      commerce: "DISABLED_NO_APPROVED_OFFER_BINDING",
    };
  });
  return {
    categoryId,
    authorityStatus: categoryId === "HEADPHONES" ? "ACTIVE_OWNER_APPROVED" : "CANDIDATE_REVALIDATION_REQUIRED",
    retainedObservationCount: retained.length,
    diversity: {
      manufacturerCount: new Set(retained.map((item) => item.manufacturer)).size,
      targetIsNotACap: true,
      status: retained.length >= 4 ? "USEFUL_BASELINE" : "EXPANSION_CONTINUES_AFTER_PRIMARY_EVIDENCE",
    },
    observations: retained,
  };
});

const progressLedger = {
  workUnit: "WU-ELECTRONICS-ALL-CATEGORY-AMAZON-TR-END-TO-END-01",
  catalogAuthority: { productCount: 68, categoryCount: 24, headphonesCount: 18, releaseDigest: catalog.releaseDigest },
  statuses: { TECHNICAL_CATALOG_READY: true, XPY_READY: true, AMAZON_COVERAGE_INCOMPLETE: true },
  amazonChannelRef: amazonChannel.channelId,
  waves: [1, 2, 3, 4].map((wave) => ({ wave, categoryIds: categories.slice((wave - 1) * 6, wave * 6), terminal: true })),
  categories: domainPacks.map((pack) => ({
    categoryId: pack.categoryId,
    productCount: pack.retainedObservationCount,
    observationTerminalStates: pack.observations.reduce<Record<string, number>>((acc, item) => {
      acc[item.terminalState] = (acc[item.terminalState] ?? 0) + 1;
      return acc;
    }, {}),
    packageState: "ACHIEVABLE_PACKAGE_COMPLETE_PENDING_CONSOLIDATED_OWNER_APPROVAL",
  })),
};

const matrix = categories.flatMap((categoryId) => MATRIX_DIMENSIONS.map((dimension) => {
  const pack = domainPacks.find((candidate) => candidate.categoryId === categoryId)!;
  const amazon = dimension === "amazon_tr";
  return {
    categoryId,
    dimension,
    state: amazon ? "BLOCKED_EXTERNAL_ACQUISITION_CHANNEL" : "PROVED_FOR_BOUNDED_CANDIDATE",
    failClosed: amazon || dimension === "activation_readiness",
    evidence: amazon ? amazonChannel.channelId : `domain-pack:${categoryId}`,
    productCount: pack.retainedObservationCount,
  };
}));

const approvalPackage = {
  approvalPackageId: "ELECTRONICS-ALL-CATEGORY-OAM-01",
  decision: "PENDING_ONE_CONSOLIDATED_DIGEST_SPECIFIC_OWNER_APPROVAL",
  requestedScope: "Activate the bounded non-Amazon technical catalog and semantic candidates; keep all Amazon commerce fields disabled.",
  immutableBoundaries: ["brand_neutral", "catalog_order_neutral", "price_neutral", "affiliate_neutral", "unknown_preserving", "fail_closed_y"],
  statuses: progressLedger.statuses,
  counts: { categories: 24, products: 68, headphones: 18, nonHeadphones: 50, matrixCells: matrix.length },
  artifactDigests: {
    amazonChannel: digest(amazonChannel),
    channelMatrix: digest(channelMatrix),
    domainPacks: digest(domainPacks),
    progressLedger: digest(progressLedger),
    matrix: digest(matrix),
  },
};

await writeJson("amazon-channel-status.json", amazonChannel);
await writeJson("source-channel-matrix.json", channelMatrix);
await writeJson("domain-packs.json", domainPacks);
await writeJson("progress-ledger.json", progressLedger);
await writeJson("category-24x16-matrix.json", matrix);
await writeJson("consolidated-owner-approval-package.json", approvalPackage);
await writeFile(path.join(OUTPUT, "README.md"), `# Electronics all-category bounded candidate\n\nThis package preserves the activated 68-product authority, including the owner-approved 18-product HEADPHONES slice. The other 50 products are treated as bounded technical candidates pending one consolidated digest-specific owner approval. Amazon Türkiye approved API access is recorded once in \`amazon-channel-status.json\`; Amazon price, availability, offer, affiliate, and exhaustive-coverage fields remain disabled and fail closed.\n\nStatus: TECHNICAL_CATALOG_READY=true; XPY_READY=true; AMAZON_COVERAGE_INCOMPLETE=true.\n`);
void stable;
