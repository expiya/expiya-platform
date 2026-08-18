import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const canonical = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const hash = (value: string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const generatedAt = "2026-08-18T22:15:00.000Z";

async function main() {
  const root = process.cwd();
  const pilotPath = path.join(root, "data/production/equipment-evidence/pilots/pilot-v1.0.2-catalog-v0.55.2-2026-08-18/pilot-manifest.json");
  const pilot = JSON.parse(await readFile(pilotPath, "utf8"));
  const tonale = pilot.variants.filter((variant: { canonicalBrand: string; canonicalModel: string }) => variant.canonicalBrand === "Alfa Romeo" && variant.canonicalModel === "Tonale");
  if (tonale.length !== 2) throw new Error(`Expected two Tonale pilot variants, found ${tonale.length}`);
  const diesel = tonale.find((variant: { fuelType: string }) => variant.fuelType === "DIESEL");
  const hybrid = tonale.find((variant: { fuelType: string }) => variant.fuelType === "MHEV");
  if (!diesel || !hybrid) throw new Error("Tonale Diesel/Hybrid pair could not be resolved from pilot manifest");

  const sources = [
    { plannedSourceId: "ALLOCATE_AT_COLLECTION_START", sourceKey: "ALFA_TR_PRICE_LIST_2026_07_02", authorityUse: "EXACT_IDENTITY_AND_PRICE_ONLY",
      url: "https://arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo&hidebutton=true", type: "OFFICIAL_TR_PRICE_LIST", market: "TR",
      observedAt: generatedAt, effectiveAt: "2026-07-02", snapshotStatus: "NOT_COLLECTED_PLANNING_ONLY",
      supports: ["TONALE DIESEL 130 + Ti + DCT + Diesel + MY2026", "TONALE HYBRID 175 + Speciale + DCT + Benzinli Hibrit + MY2026"],
      limitations: ["Direct open returned HTTP 403 in this planning session; indexed official content was available", "Price authority is not equipment authority"] },
    { plannedSourceId: "ALLOCATE_AT_COLLECTION_START", sourceKey: "ALFA_TR_TONALE_CURRENT_PRODUCT", authorityUse: "EXACT_TRIM_POWERTRAIN_AND_EQUIPMENT_SECTION",
      url: "https://www.alfaromeo.com.tr/arac-modelleri/yeni-tonale", type: "OFFICIAL_TR_PRODUCT_EQUIPMENT_PAGE", market: "TR",
      observedAt: generatedAt, effectiveAt: null, snapshotStatus: "NOT_COLLECTED_PLANNING_ONLY",
      supports: ["Ti + 1.6 Diesel 130 BG TCT6", "Speciale + 1.5 Hybrid 175 BG TCT7", "Separately bounded Ti and Speciale equipment sections"],
      limitations: ["Page date/effective interval must be captured during collection", "Narrative rows require explicit included/optional interpretation policy"] },
    { plannedSourceId: "ALLOCATE_AT_COLLECTION_START", sourceKey: "ALFA_TR_TONALE_2025_02_BROCHURE", authorityUse: "HISTORICAL_EQUIPMENT_MATRIX_SUPPORT_ONLY",
      url: "https://www.alfaromeo.com.tr/content/dam/alfa/tr/katalog/2025/eylul/tonale/AR_TONALE_BROSUR_2025_02.pdf", type: "OFFICIAL_TR_BROCHURE", market: "TR",
      observedAt: generatedAt, effectiveAt: "2025", snapshotStatus: "NOT_COLLECTED_PLANNING_ONLY",
      supports: ["Ti/Speciale equipment matrix with S and explicit absence markers", "Diesel 130 Ti"],
      limitations: ["Hybrid is 160 HP, not current 175 HP", "Must not establish MY2026 Hybrid 175 equipment applicability"] },
    { plannedSourceId: "ALLOCATE_AT_COLLECTION_START", sourceKey: "ALFA_TR_TONALE_CURRENT_TECH_PDF", authorityUse: "SUPPORTING_MATRIX_ONLY_AFTER_TEMPORAL_RECONCILIATION",
      url: "https://www.alfaromeo.com.tr/content/dam/alfa/tr/katalog/tonale-yeni/TONALE-e-brosur-TR.pdf", type: "OFFICIAL_TR_TECHNICAL_EQUIPMENT_PDF", market: "TR",
      observedAt: generatedAt, effectiveAt: null, snapshotStatus: "NOT_COLLECTED_PLANNING_ONLY",
      supports: ["Equipment S/O/-/LP/DAP semantics"], limitations: ["Uses Sprint/Ti/Veloce/Edizione Speciale taxonomy", "Cannot be mapped to current Speciale 175 without exact applicability proof"] },
    { plannedSourceId: "ALLOCATE_AT_COLLECTION_START", sourceKey: "ALFA_TR_EMISSIONS", authorityUse: "POWERTRAIN_AND_TEMPORAL_SUPPORT",
      url: "https://www.alfaromeo.com.tr/yakit-ekonomisi-ve-co2-emisyonu", type: "OFFICIAL_TR_TECHNICAL_INDEX", market: "TR",
      observedAt: generatedAt, effectiveAt: null, snapshotStatus: "NOT_COLLECTED_PLANNING_ONLY",
      supports: ["Diesel Ti 1.6 130", "Diesel Ti 1.6 130 MY25", "Hybrid Speciale 1.5 175"], limitations: ["Not equipment authority"] },
  ];
  const alpineDeferral = {
    recordType: "BATCH_RESELECTION_DISPOSITION", originalDraftBatchId: "EE-PILOT-002-BATCH-002", disposition: "DEFERRED_IDENTITY_AUDIT",
    exactVariantIds: ["bdf54f5b-2c18-5505-8875-0157f5bd1db7", "f954d7a8-b69b-5ee2-b3ad-a4638772725a"],
    reasons: ["ORDER_CONFIGURATION_CLOSED", "LAST_STOCK_VEHICLES_ONLY", "CURRENT_OFFICIAL_PRICE_LIST_MISSING", "MY2025_EXACT_APPLICABILITY_UNRESOLVED", "CATALOG_EVIDENCE_AUDIT_RECOMMENDED"],
    catalogMutation: false, quarantineApplied: false, webCollectionStarted: false,
    priorArtifacts: "outputs/equipment-evidence-ee-pilot-002-batch-002-plan", generatedAt,
  };
  const identities = [
    { exactVariantId: diesel.exactVariantId, catalogIdentity: { brand: "Alfa Romeo", model: "Tonale", trim: "Ti", powertrain: "1.6 Diesel", power: "130 PS", transmission: "TCT6", modelYear: 2026, market: "TR" },
      disposition: "EXACT_IDENTITY_CONFIRMED", currentSaleScope: "CURRENT_MY2026_PRICE_LIST", supportingSourceKeys: ["ALFA_TR_PRICE_LIST_2026_07_02", "ALFA_TR_TONALE_CURRENT_PRODUCT", "ALFA_TR_EMISSIONS"],
      notes: ["Official price list calls transmission DCT; current product page specifies TCT6", "Identity is independently scoped to Ti and Diesel"] },
    { exactVariantId: hybrid.exactVariantId, catalogIdentity: { brand: "Alfa Romeo", model: "Tonale", trim: "Speciale", powertrain: "1.5 Hybrid", power: "175 PS combined", transmission: "TCT7", modelYear: 2026, market: "TR" },
      disposition: "EXACT_IDENTITY_CONFIRMED", currentSaleScope: "CURRENT_MY2026_PRICE_LIST", supportingSourceKeys: ["ALFA_TR_PRICE_LIST_2026_07_02", "ALFA_TR_TONALE_CURRENT_PRODUCT", "ALFA_TR_EMISSIONS"],
      notes: ["Current product page explains 175 PS as combined output", "2025 brochure's 160 HP Hybrid is temporally different and excluded from current identity authority"] },
  ];
  const applicability = {
    result: "PASS", catalogRelease: "v0.55.2", catalogFingerprint: pilot.catalogFingerprint,
    rows: identities.map((identity) => ({ exactVariantId: identity.exactVariantId, brandModel: "CONFIRMED", exactTrim: "CONFIRMED", powertrain: "CONFIRMED", power: "CONFIRMED", transmission: "CONFIRMED_WITH_DCT_TCT_NOMENCLATURE_NOTE", modelYear: "CONFIRMED_MY2026_BY_PRICE_LIST", market: "CONFIRMED_TR", saleScope: "CURRENT", catalogIdMatch: "MATCHED" })),
    crossApplicabilityForbidden: ["TI_TO_SPECIALE", "SPECIALE_TO_TI", "DIESEL_TO_HYBRID", "HYBRID_TO_DIESEL", "HYBRID_160_TO_HYBRID_175", "FAMILY_TO_EXACT_TRIM"],
  };
  const suitability = {
    result: "SUITABLE_WITH_SOURCE_SCOPING", exactTrimEquipmentSectionAvailable: true, deterministicLocatorPotential: "HIGH_ON_PRODUCT_HTML_AND_PDF_MATRIX",
    tiAndSpecialeSeparated: true, dieselHybridIsolationPossible: true, familyInheritanceRequired: false,
    standardOptionalClarity: { currentProductPage: "PARTIAL_INCLUDED_LIST_WITHOUT_FULL_MATRIX_SEMANTICS", historicalBrochure: "EXPLICIT_S_AND_ABSENCE_BUT_TEMPORALLY_LIMITED", currentTechnicalPdf: "EXPLICIT_S_O_PACKAGE_MARKERS_BUT_TAXONOMY_RECONCILIATION_REQUIRED" },
    rawRowsCanBeSeparatedFromSemanticMapping: true,
    policy: ["Current product page may support positive exact-trim rows only after immutable capture", "Historical 160 HP brochure cannot support Hybrid 175 assertions", "Explicit negative assertions require a temporally applicable exact matrix", "Unresolved standard/optional state remains RESEARCHED_INCONCLUSIVE"] ,
  };
  const risks = {
    overall: "MEDIUM_CONTROLLED", risks: [
      { code: "HISTORICAL_HYBRID_POWER_MISMATCH", severity: "HIGH", mitigation: "Exclude 160 HP brochure from Hybrid 175 exact assertion authority" },
      { code: "DCT_TCT_NOMENCLATURE_DIFFERENCE", severity: "LOW", mitigation: "Preserve source wording; use product page for gear count" },
      { code: "SPECIALE_TAXONOMY_VARIATION", severity: "MEDIUM", mitigation: "Do not equate Speciale with Edizione Speciale" },
      { code: "TI_BASE_FOR_SPECIALE_TEXT", severity: "MEDIUM", mitigation: "Materialize inherited rows only if current source explicitly states Speciale includes Ti and review accepts applicability" },
    ], stopConditions: ["CURRENT_MY2026_PRICE_IDENTITY_DISAPPEARS_OR_CONFLICTS", "PRODUCT_PAGE_CANNOT_BE_SNAPSHOTTED_DETERMINISTICALLY", "TI_SPECIALE_BOUNDARIES_NOT_UNIQUE", "HYBRID_175_EQUIPMENT_REQUIRES_160_HP_BROCHURE", "STANDARD_OPTIONAL_SEMANTICS_CANNOT_BE_ESTABLISHED", "NEW_CATALOG_IDENTITY_CONFLICT"],
  };
  const manifest = {
    recordType: "IMMUTABLE_FINAL_BATCH_MANIFEST", status: "READY_FOR_BOUNDED_COLLECTION", batchId: "EE-PILOT-002-BATCH-002", pilotId: "EE-PILOT-002",
    catalogRelease: "v0.55.2", catalogFingerprint: pilot.catalogFingerprint, selectedExactVariantIds: [diesel.exactVariantId, hybrid.exactVariantId],
    familyId: diesel.pairedFamilyId, selectionPolicyVersion: "BATCH_RESELECTION_V1.0.0", expectedFeatureCount: 51, expectedResearchLedgerRows: 102,
    sourceAllocation: "ALLOCATE_NEW_SOURCE_IDS_AFTER_REGISTRY_COLLISION_CHECK", priorJuniorSourcesReusableAsAuthority: false,
    extractionPolicy: "NEW_VERSION_REQUIRED_UNLESS_CAPTURED_DOM_STRUCTURE_PROVES_BYTE_AND_BOUNDARY_COMPATIBILITY",
    independentChains: ["TI_DIESEL_130_TCT6", "SPECIALE_HYBRID_175_TCT7"], inheritanceForbidden: true,
    reviewActors: { collector: "EQUIPMENT_COLLECTOR_PRIMARY", reviewer: "EQUIPMENT_REVIEWER_SECONDARY", owner: "EQUIPMENT_OWNER_APPROVER", separationRequired: true },
    generatedAt,
  };
  const collectionPlan = {
    status: "NOT_STARTED", batchId: manifest.batchId, matrixRows: 102,
    sequence: ["REGISTRY_COLLISION_CHECK", "CAPTURE_CURRENT_PRICE_IDENTITY_SOURCE", "CAPTURE_CURRENT_PRODUCT_PAGE", "CAPTURE_ONLY_APPLICABLE_PDFS", "VERIFY_ARTIFACT_SHA256", "VERIFY_EXACT_TRIM_BOUNDARIES", "EXTRACT_RAW_SOURCE_ROWS", "CREATE_SEPARATE_SEMANTIC_MAPPINGS", "POPULATE_102_DISPOSITIONS", "SECOND_REVIEW"],
    assertionPolicy: "ONLY_EXPLICIT_EXACT_AND_TEMPORALLY_APPLICABLE_EVIDENCE", negativeEvidencePolicy: "ONLY_EXPLICIT_MATRIX_ABSENCE_IN_APPLICABLE_SOURCE",
    decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", productionMutation: false,
  };
  const disposition = { decision: "APPROVE_TONALE_FOR_BATCH_002_COLLECTION", alpineDisposition: "DEFERRED_IDENTITY_AUDIT", identityGate: "PASSED_FOR_BOTH_VARIANTS", equipmentSuitability: suitability.result,
    collectionRecommendation: "PROCEED_WITH_BOUNDED_COLLECTION", caveat: "Capture-time validation may still stop the batch under declared stop conditions." };

  const out = path.join(root, "outputs/equipment-evidence-ee-pilot-002-batch-002-reselection");
  await mkdir(out, { recursive: true });
  const files: Record<string, unknown> = { "alpine-deferral-reselection.json": alpineDeferral, "tonale-exact-identity-precheck.json": { generatedAt, variants: identities },
    "official-source-inventory.json": { generatedAt, snapshotCollectionPerformed: false, sources }, "exact-applicability-matrix.json": applicability,
    "equipment-source-suitability.json": suitability, "cross-trim-powertrain-risk.json": risks, "batch-002-disposition.json": disposition,
    "batch-002-final-manifest.json": manifest, "collection-plan.json": collectionPlan };
  for (const [name, value] of Object.entries(files)) await writeFile(path.join(out, name), canonical(value));
  const report = `# EE-PILOT-002 Batch 002 reselection\n\n## Decision\n\n**APPROVE_TONALE_FOR_BATCH_002_COLLECTION**\n\n- Diesel Ti: ${diesel.exactVariantId}\n- Hybrid Speciale: ${hybrid.exactVariantId}\n- Identity gate: PASS / PASS\n- Planned matrix: 2 × 51 = 102\n- Collection started: no\n- Snapshots captured: no\n- Assertions produced: no\n\nAlpine S/GT remains unchanged in the catalog and is recorded as DEFERRED_IDENTITY_AUDIT.\n`;
  await writeFile(path.join(out, "reselection-report.md"), report);
  const names = [...Object.keys(files), "reselection-report.md"].sort();
  const checksums = Object.fromEntries(await Promise.all(names.map(async (name) => [name, hash(await readFile(path.join(out, name), "utf8"))])));
  await writeFile(path.join(out, "checksums.json"), canonical(checksums));
  console.log(JSON.stringify({ out: path.relative(root, out), selected: manifest.selectedExactVariantIds, disposition: disposition.decision }, null, 2));
}

void main();
