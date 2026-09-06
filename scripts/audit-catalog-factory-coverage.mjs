import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const lineageRef = process.env.CATALOG_FACTORY_LINEAGE_REF ?? "codex/catalog-factory-awin-admitad-readiness";
const outDir = process.argv[2] ?? "outputs/catalog-factory-coverage-audit-2026-09-07";
const showJson = (file, ref = lineageRef) => JSON.parse(execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
const localJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const pct = (n, d) => d ? Number((100 * n / d).toFixed(1)) : null;
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

function summarize(categoryId, products, evidence, options = {}) {
  const brandOf = p => p.brand ?? p.manufacturer ?? p.identity?.manufacturer;
  const factsOf = p => p.facts ?? Object.entries(p.technicalFacts ?? {}).map(([key, value]) => ({ key, value }));
  const factRows = products.map(factsOf);
  const keys = [...new Set(factRows.flat().map(f => f.key))];
  const filledCells = factRows.reduce((n, facts) => n + keys.filter(k => facts.some(f => f.key === k && f.value !== null && f.value !== "UNKNOWN")).length, 0);
  const discriminating = keys.filter(k => new Set(factRows.flatMap(f => f.key === k && f.value !== null && f.value !== "UNKNOWN" ? [JSON.stringify(f.value)] : [])).size > 1).length;
  const unknownProducts = products.filter(p => (p.unknownCodes?.length ?? p.runtimeBlockers?.length ?? 0) > 0).length;
  return {
    categoryId,
    lifecycle: options.lifecycle ?? "ACTIVE",
    exactVariantCount: products.length,
    brandDiversity: new Set(products.map(brandOf).filter(Boolean)).size,
    productClassDiversity: options.productClassDiversity ?? 1,
    segmentDiversity: options.segmentDiversity ?? null,
    hardFilterCoverage: {
      basis: "OBSERVED_TECHNICAL_FACT_KEYS_NOT_A_DECLARED_REQUIRED_FILTER_REGISTRY",
      observedFieldCount: keys.length,
      fillRatePct: pct(filledCells, products.length * keys.length),
      discriminatingFieldRatePct: pct(discriminating, keys.length),
      limitation: keys.length ? null : "NO_MACHINE_AUDITABLE_FACT_MAP_IN_ACTIVE_ARTIFACT"
    },
    softPersonaCoverage: options.persona ?? "NOT_MACHINE_AUDITABLE",
    dailyLifeSemantics: options.dailyLife ?? "NOT_MACHINE_AUDITABLE",
    primaryEvidenceCoverage: options.primaryEvidence ?? (products.every(p => (p.evidenceRefs?.length ?? p.facts?.length ?? 0) > 0) ? "ALL_RECORDS_HAVE_EVIDENCE_REFS" : "PARTIAL_OR_UNAUDITABLE"),
    mediaCoverage: options.media ?? "NOT_MACHINE_AUDITABLE",
    turkeyCommerceCoverage: options.commerce ?? "IDENTITY_TR_SCOPED_COMMERCE_NOT_PROVEN",
    unknownRatePct: pct(unknownProducts, products.length),
    authorityEvidence: evidence
  };
}

const carPointer = localJson("data/production/catalog/active.json");
const carCatalog = localJson(`data/production/catalog/releases/v${carPointer.active_catalog_release_version}/catalog.json`);
const carRecords = carCatalog.records ?? carCatalog.vehicles ?? [];
const carRow = summarize("PASSENGER_CAR", carRecords, "data/production/catalog/active.json", {
  productClassDiversity: new Set(carRecords.map(r => r.bodyType ?? r.identity?.bodyType).filter(Boolean)).size,
  segmentDiversity: new Set(carRecords.map(r => r.segment ?? r.identity?.segment).filter(Boolean)).size,
  persona: "ACTIVE_SEPARATE_PERSONA_AUTHORITY",
  dailyLife: "ACTIVE_SEPARATE_TECHNICAL_DAILY_LIFE_AUTHORITY",
  media: "GOVERNED_SEPARATE_MEDIA_AUTHORITY",
  commerce: "TR_ACTIVE_CATALOG_PRICE_PROVENANCE_MIXED"
});

const electronicsPath = "data/production/electronics/runtime/releases/ELECTRONICS-RUNTIME-CATALOG-TR-v1.2-ALL-CATEGORY-93/catalog.json";
const electronics = showJson(electronicsPath);
const electronicsRows = [...new Set(electronics.products.map(p => p.categoryId))].sort().map(categoryId =>
  summarize(categoryId, electronics.products.filter(p => p.categoryId === categoryId), electronicsPath, {
    persona: "DECLARED_PER_RECORD_EFFECT; MOSTLY_NONE",
    dailyLife: "CATEGORY_POLICY_PRESENT; PER_RECORD COVERAGE NOT PROVEN",
    commerce: "TR_IDENTITY_SCOPED; commerceEffect MOSTLY_NONE"
  })
);

const applianceSlugs = ["air-fryers","air-purifiers","blenders","built-in-microwave-ovens","built-in-ovens","countertop-microwave-ovens","dishwashers","dryers","electric-storage-water-heaters","filter-coffee-machines","food-processors","freestanding-cookers","freezers","fully-automatic-espresso-machines","hobs","instantaneous-electric-water-heaters","manual-espresso-machines","range-hoods","refrigerators","robot-vacuums","split-air-conditioners","turkish-coffee-machines","vacuums","washing-machines"];
const applianceRows = applianceSlugs.map(slug => {
  const pointerPath = `data/production/appliances/${slug}/active.json`;
  const pointer = showJson(pointerPath);
  let artifactPath;
  let artifact;
  if (["washing-machines","refrigerators","dishwashers","dryers"].includes(slug)) {
    artifactPath = `data/production/appliances/catalog-adoption/releases/APPLIANCES-MAJOR-CATALOG-ADOPTION-TR-v0.1-candidate/${slug}/catalog-release.json`;
    artifact = showJson(artifactPath);
  } else {
    artifactPath = `data/production/appliances/${slug}/releases/${pointer.releaseVersion}/domain-pack.json`;
    artifact = showJson(artifactPath);
  }
  const products = artifact.products ?? artifact.offerings ?? [];
  const categoryId = artifact.categoryId ?? artifact.productType ?? slug.replaceAll("-", "_").toUpperCase();
  return summarize(categoryId, products, `${pointerPath} -> ${artifactPath}`, {
    persona: "CATEGORY_SEMANTICS_PRESENT; PERSONA RATE NOT DECLARED",
    dailyLife: "CATEGORY_CONCEPTS/POLICY PRESENT; RECORD RATE NOT DECLARED",
    commerce: "TR_IDENTITY_ACTIVE; VOLATILE OFFER COVERAGE NOT PROVEN"
  });
});

const babyActivationPath = "data/production/baby/strollers/governance/activation-events/BABY-STROLLER-ACT-E0F9A3BD92488849/activation.json";
const baby = showJson(babyActivationPath);
const babyRow = summarize("STROLLER", baby.membership.map(id => ({ id })), babyActivationPath, { dailyLife: "AUTHORITY DIGEST ONLY; RATE NOT DECLARED" });
const mobilityManifestPath = "data/production/mobility/release-candidates/MOBILITY-TR-v0.1-owner-review-candidate/manifest.json";
const mobility = showJson(mobilityManifestPath);
const mobilityRows = Object.entries(mobility.categoryCounts).map(([categoryId, count]) => summarize(categoryId, Array.from({ length: count }, (_, i) => ({ id: `${categoryId}:${i}` })), mobilityManifestPath, { persona: mobility.personaState, dailyLife: "NOT_DECLARED_IN_MANIFEST" }));
const drillPath = "data/production/cordless-drill/releases/CORDLESS-DRILL-TR-v1.0-2026-09-07/activation-event.json";
const drill = showJson(drillPath);
const drillRow = summarize("CORDLESS_DRILL", Array.from({ length: drill.exactProductCount }, (_, i) => ({ id: `CORDLESS_DRILL:${i}`, unknownCodes: i < drill.unknownCount ? ["DECLARED_UNKNOWN"] : [] })), drillPath, { persona: "FACTORY_PACKAGE_NOT_EMBEDDED_IN_ACTIVE_POINTER", dailyLife: "FACTORY_PACKAGE_NOT_EMBEDDED_IN_ACTIVE_POINTER" });

const smartphonePending = {
  categoryId: "SMARTPHONE", lifecycle: "PENDING_NOT_ACTIVE", exactVariantCount: 33,
  activeCountImpact: 0, lineageRef: "codex/smartphone-amazon-tr-coverage-expansion-02", lineageCommit: "2adb6cb",
  rule: "DO_NOT_ADD_TO_ELECTRONICS_V1_2_ACTIVE_93_UNTIL_SEPARATE_INTEGRATION_AND_ACTIVATION"
};
const rows = [carRow, ...applianceRows, ...electronicsRows, babyRow, ...mobilityRows, drillRow];
const byDepartment = {
  CARS: [carRow], APPLIANCES: applianceRows, ELECTRONICS: electronicsRows,
  BABY_AND_CHILD: [babyRow], MOBILITY: mobilityRows, TOOLS: [drillRow]
};
const departmentSummary = Object.entries(byDepartment).map(([departmentId, departmentRows]) => ({
  departmentId, categoryCount: departmentRows.length,
  activeExactVariantCount: departmentRows.reduce((n, r) => n + r.exactVariantCount, 0),
  categories: departmentRows.map(r => r.categoryId)
}));
const expansionWave = [
  ["CHILD_CAR_SEAT","BABY_AND_CHILD",12,4,4,"NO_AFFILIATE_REQUIRED"],
  ["BABY_MONITOR","BABY_AND_CHILD",12,4,3,"NO_AFFILIATE_REQUIRED_FOR_EVIDENCE; AFFILIATE_OPTIONAL_FOR_COMMERCE"],
  ["DOCUMENT_SCANNER","ELECTRONICS",15,5,4,"NO_AFFILIATE_REQUIRED"],
  ["TYRE","CARS",20,5,5,"AFFILIATE_OR_SPECIALIST_RETAILER_NEEDED_FOR_COMMERCE_DISCOVERY"],
  ["OFFICE_CHAIR","HOME_AND_PROJECTS",15,5,4,"RETAILER_NEEDED; AWIN_ADMITAD_OPTIONAL_ACCELERATOR"],
  ["LAWN_MOWER","HOME_AND_PROJECTS",15,5,4,"NO_AFFILIATE_REQUIRED_FOR_PRIMARY_EVIDENCE; AFFILIATE_USEFUL_FOR_COMMERCE"]
].map(([categoryId,departmentId,targetExactVariants,targetBrands,targetSegments,sourceBoundary], i) => ({priority:i+1,categoryId,departmentId,targetExactVariants,targetBrands,targetSegments,sourceBoundary}));

const ledger = {
  schemaVersion: "catalog-factory-coverage-ledger/v1", generatedFromRepositoryOnly: true,
  generatedAtPolicy: "FIXED_AUDIT_DATE_NO_WALL_CLOCK_INPUT", auditDate: "2026-09-07",
  lineage: { auditSourceRef: lineageRef, carsSource: "CURRENT_CHECKOUT_PRODUCTION_POINTER", smartphonePending },
  invariants: { externalResearchPerformed:false, admissionPerformed:false, activationPerformed:false, pointerMutationPerformed:false, deploymentPerformed:false, databaseMutationPerformed:false, xpyRootMigrationTouched:false },
  departmentSummary, rows, expansionWave,
  admitadAwinBoundary: {
    canProceedWithoutAffiliate: ["CHILD_CAR_SEAT","BABY_MONITOR","DOCUMENT_SCANNER","LAWN_MOWER_PRIMARY_EVIDENCE"],
    discoveryOrCommerceGap: ["TYRE_CURRENT_TR_OFFER_BREADTH","OFFICE_CHAIR_MULTI_RETAILER_DISCOVERY","LAWN_MOWER_VOLATILE_OFFERS","ALL_CATEGORY_PRICE_STOCK_DELIVERY_REFRESH"],
    rule: "AFFILIATE_FEEDS_ARE_DISCOVERY_AND_VOLATILE_COMMERCE_INPUTS_ONLY; NEVER_PRIMARY_TECHNICAL_OR_IDENTITY_AUTHORITY"
  }
};
mkdirSync(outDir, { recursive: true });
const canonical = `${JSON.stringify(ledger, null, 2)}\n`;
writeFileSync(path.join(outDir, "coverage-ledger.json"), canonical);
writeFileSync(path.join(outDir, "coverage-ledger.sha256"), `${sha(canonical)}\n`);
console.log(JSON.stringify({ outDir, rowCount: rows.length, departmentSummary, digest: sha(canonical) }, null, 2));
