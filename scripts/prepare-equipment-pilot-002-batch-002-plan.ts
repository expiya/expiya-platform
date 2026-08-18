import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const canonical = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
type PilotVariant = { exactVariantId: string; canonicalBrand: string; canonicalModel: string; trim: string; modelYear: number; fuelType: string; bodyStyle: string; priceSegment: string; selectionReason: string; pairedFamilyId?: string };
type CatalogRecord = { variant: { id: string; trim?: { provenance?: Array<{ sourceUrl?: string }> } } };
type Candidate = { canonicalBrand: string; canonicalModel: string; trim: string; fuelType: string; bodyStyle: string; exactTrimVerifiability: string; collectionDifficulty: string; batchSuitability: string };

async function main() {
  const root = process.cwd();
  const pilotPath = path.join(root, "data/production/equipment-evidence/pilots/pilot-v1.0.2-catalog-v0.55.2-2026-08-18/pilot-manifest.json");
  const catalogPath = path.join(root, "data/production/catalog/releases/v0.55.2/catalog.json");
  const pilot = JSON.parse(await readFile(pilotPath, "utf8"));
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const completed = new Set(["1a3cc01d-3bfa-56f3-817f-4cc77e723ef8", "5a64b246-3b05-52b6-9f24-b8f52ccc2305"]);
  const records = new Map<string, CatalogRecord>((catalog.records as CatalogRecord[]).map((record) => [record.variant.id, record]));
  const remaining = (pilot.variants as PilotVariant[]).filter((variant) => !completed.has(variant.exactVariantId));
  const selectedIds = ["bdf54f5b-2c18-5505-8875-0157f5bd1db7", "f954d7a8-b69b-5ee2-b3ad-a4638772725a"];

  const candidates = remaining.map((variant) => {
    const record = records.get(variant.exactVariantId);
    const provenance = record?.variant?.trim?.provenance?.[0];
    const paired = Boolean(variant.pairedFamilyId);
    const selected = selectedIds.includes(variant.exactVariantId);
    const isTonale = variant.canonicalModel === "Tonale";
    return {
      exactVariantId: variant.exactVariantId, canonicalBrand: variant.canonicalBrand, canonicalModel: variant.canonicalModel,
      trim: variant.trim, modelYear: variant.modelYear, fuelType: variant.fuelType, bodyStyle: variant.bodyStyle,
      priceSegment: variant.priceSegment, pilotSelectionReason: variant.selectionReason,
      officialTurkeySourceVisibility: provenance?.sourceUrl ? "CATALOG_PROVENANCE_URL_PRESENT_NOT_RECHECKED" : "NO_CATALOG_PROVENANCE_URL",
      knownCatalogProvenanceUrl: provenance?.sourceUrl ?? null,
      exactTrimVerifiability: selected ? "PROMISING_BUT_IDENTITY_GATE_REQUIRED" : paired ? "REQUIRES_EXACT_IDENTITY_GATE" : "UNASSESSED_UNTIL_COLLECTION_PLAN",
      probableSourceTypes: ["OFFICIAL_TR_CONFIGURATOR", "OFFICIAL_TR_PRICE_LIST", "OFFICIAL_TR_EQUIPMENT_PAGE", "OFFICIAL_TR_BROCHURE"],
      crossTrimPowertrainProjectionRisk: paired ? "HIGH" : "MEDIUM",
      collectionDifficulty: selected ? "MEDIUM_HIGH" : isTonale ? "MEDIUM" : "UNKNOWN_WITHOUT_WEB_RESEARCH",
      batchSuitability: selected ? "SELECTED_CONDITIONALLY" : isTonale ? "STRONG_FALLBACK_SAME_MANUFACTURER_AS_BATCH_001" : paired ? "ALTERNATE_PAIRED_FAMILY" : "LATER_STRATIFIED_BATCH",
      limitation: "Source visibility is derived only from versioned catalog provenance; no live URL or document availability check was performed.",
    };
  });

  const sourcePlan = {
    status: "PLANNED_NOT_ACQUIRED", sourceIdReservationPolicy: "RESERVE_ON_COLLECTION_START_AFTER_REGISTRY_COLLISION_CHECK",
    proposedReservations: [
      { proposedSourceId: "SRC-000087", variantRole: "A110_S", url: "https://www.alpinecars.com.tr/modeller/a110-s.html", sourceType: "OFFICIAL_TR_PRODUCT_CONFIGURATION_PAGE", market: "TR", captureDate: null,
        rawImmutableSnapshot: "REQUIRED", sha256: "TO_BE_COMPUTED", locatorMethod: "UNIQUE_HEADING_BOUNDARY_PLUS_SOURCE_ROW_EXTRACTION", exactApplicability: "A110 + S heading and configuration boundary", modelYearApplicability: "Must be established by dated official price/configuration source; product page alone is insufficient", expectedLimitations: ["Catalog provenance says model is absent from current public official price list", "Product page may be model/trim marketing content rather than equipment matrix"] },
      { proposedSourceId: "SRC-000088", variantRole: "A110_GT", url: "https://www.alpinecars.com.tr/modeller/a110-gt.html", sourceType: "OFFICIAL_TR_PRODUCT_CONFIGURATION_PAGE", market: "TR", captureDate: null,
        rawImmutableSnapshot: "REQUIRED", sha256: "TO_BE_COMPUTED", locatorMethod: "UNIQUE_HEADING_BOUNDARY_PLUS_SOURCE_ROW_EXTRACTION", exactApplicability: "A110 + GT heading and configuration boundary", modelYearApplicability: "Must be established by dated official price/configuration source; product page alone is insufficient", expectedLimitations: ["Catalog provenance says model is absent from current public official price list", "Product page may not distinguish standard/optional equipment"] },
      { proposedSourceId: "SRC-000089", variantRole: "SHARED_IDENTITY_MATRIX", url: null, sourceType: "OFFICIAL_TR_PRICE_OR_CONFIGURATION_LIST", market: "TR", captureDate: null,
        rawImmutableSnapshot: "REQUIRED_IF_DISCOVERED_DURING_APPROVED_COLLECTION", sha256: "TO_BE_COMPUTED", locatorMethod: "PDF_PAGE_TABLE_ROW_COLUMN_OR_CONFIGURATOR_PATH", exactApplicability: "Separate rows/paths for S and GT", modelYearApplicability: "Explicit 2025 effective period required", expectedLimitations: ["Not yet discovered or checked; collection must stop if unavailable"] },
      { proposedSourceId: "SRC-000090", variantRole: "EQUIPMENT_MATRIX", url: null, sourceType: "OFFICIAL_TR_EQUIPMENT_LIST_OR_BROCHURE", market: "TR", captureDate: null,
        rawImmutableSnapshot: "REQUIRED_IF_DISCOVERED_DURING_APPROVED_COLLECTION", sha256: "TO_BE_COMPUTED", locatorMethod: "PDF_PAGE_TABLE_ROW_COLUMN", exactApplicability: "S and GT columns must be distinct", modelYearApplicability: "Explicit 2025 or matching effective interval required", expectedLimitations: ["No existence claim is made in this planning phase"] },
    ],
  };
  const manifest = {
    status: "DRAFT_AWAITING_COLLECTION_APPROVAL", batchId: "EE-PILOT-002-BATCH-002", pilotId: "EE-PILOT-002",
    catalogRelease: "v0.55.2", catalogFingerprint: pilot.catalogFingerprint, selectedExactVariantIds: selectedIds,
    familyId: "family-a74ac31b81cfdd76", selectionPolicyVersion: "BATCH_SELECTION_V1.0.0", expectedFeatureCount: 51,
    expectedResearchLedgerRows: 102, expectedAssertionCount: "0_TO_102_EVIDENCE_DEPENDENT", expectedTrimLinkCount: "0_TO_2_IDENTITY_EVIDENCE_DEPENDENT",
    sourceAcquisitionPlan: "See source-acquisition-plan.json", exactIdentityVerificationPlan: ["Prove TR market", "Prove MY2025 applicability", "Resolve A110 S and A110 GT independently", "Require dated price/configurator/configuration evidence before equipment assertions"],
    crossTrimIsolationPlan: ["No S-to-GT inheritance", "Each feature requires separate locator chain", "Silence on either trim remains UNKNOWN"],
    crossPowertrainIsolationPlan: ["Both catalog records are gasoline, but no shared powertrain evidence may establish equipment", "Configuration applicability remains exact-trim scoped"],
    reviewActorSeparation: { collector: "EQUIPMENT_COLLECTOR_PRIMARY", secondReviewer: "EQUIPMENT_REVIEWER_SECONDARY", owner: "EQUIPMENT_OWNER_APPROVER", sameActorForbidden: true },
    stopConditions: ["EXACT_TRIM_OR_MODEL_YEAR_UNVERIFIED", "OFFICIAL_SOURCE_EXACT_APPLICABILITY_MISSING", "CATALOG_IDENTITY_CONFLICT", "FAMILY_PAGE_INHERITANCE_REQUIRED", "SNAPSHOT_NOT_DETERMINISTIC", "CATALOG_IDENTITY_QUALITY_ISSUE"],
  };
  const risk = {
    recommendation: "PROCEED_TO_COLLECTION_ONLY_AFTER_EXACT_IDENTITY_PRECHECK_PASSES", selectedPair: "Alpine A110 S + A110 GT",
    reasons: ["Only remaining paired family from a manufacturer different from Alfa Romeo", "Same model and model year with distinct trims", "Catalog has separate official Turkey model-page provenance URLs", "Tests cross-trim isolation on a different page structure"],
    materialRisks: ["Catalog provenance states both variants are absent from the current public official price list", "MY2025 applicability must not be inferred from undated product pages", "Separate pages may contain marketing text rather than a standard/optional equipment matrix"],
    fallback: "If identity precheck fails, stop and open Catalog Evidence Audit; do not silently switch to Tonale. A new approved batch draft would be required.",
    semanticInvariants: ["UNKNOWN != NOT_AVAILABLE", "OPTIONAL != STOCK_PRESENT", "PACKAGE_DEPENDENT != STANDARD", "NO_FAMILY_INHERITANCE", "NO_SILENCE_AS_NEGATIVE_EVIDENCE", "RAW_EXTRACTION_SEPARATE_FROM_SEMANTIC_MAPPING", "COLLECTOR_REVIEWER_SEPARATION", "PROVISIONAL_HAS_NO_PRODUCTION_AUTHORITY", "DECISION_ENGINE_UNAFFECTED"],
  };
  const applicabilityPlan = {
    status: "PRE_COLLECTION_GATE", market: "TR", modelYear: 2025, familyId: "family-a74ac31b81cfdd76",
    variants: selectedIds.map((exactVariantId) => ({ exactVariantId,
      requiredIdentityFields: ["brand", "model", "trim", "modelYear", "market", "powertrain", "transmission"],
      requiredEvidence: ["DATED_OFFICIAL_TR_CONFIGURATION_OR_PRICE_RECORD", "EXACT_TRIM_BOUNDARY", "IMMUTABLE_SNAPSHOT", "DETERMINISTIC_LOCATOR"],
      forbiddenInference: ["MODEL_FAMILY_TO_TRIM", "S_TO_GT", "GT_TO_S", "UNDATED_PAGE_TO_MY2025"] })),
    passCondition: "Both exact identities independently satisfy all required evidence checks",
    failAction: "STOP_COLLECTION_AND_OPEN_CATALOG_EVIDENCE_AUDIT",
  };
  const out = path.join(root, "outputs/equipment-evidence-ee-pilot-002-batch-002-plan");
  await mkdir(out, { recursive: true });
  const outputs: Record<string, unknown> = { "remaining-26-candidate-analysis.json": { count: candidates.length, candidates }, "batch-002-manifest-draft.json": manifest,
    "source-acquisition-plan.json": sourcePlan, "exact-applicability-plan.json": applicabilityPlan, "risk-and-stop-conditions.json": risk,
    "expected-workload.json": { variants: 2, controlledFeatures: 51, researchLedgerRows: 102, maximumPotentialAssertions: 102, expectedTrimLinks: "0_TO_2", reviewSubjects: "ASSERTIONS_PRODUCED_PLUS_TRIM_LINKS_PRODUCED", initialDisposition: "NOT_RESEARCHED", productionImpact: "NONE" } };
  for (const [name, value] of Object.entries(outputs)) await writeFile(path.join(out, name), canonical(value));
  const reportRows = (candidates as Candidate[]).map((item) => `| ${item.canonicalBrand} ${item.canonicalModel} | ${item.trim} | ${item.fuelType} | ${item.bodyStyle} | ${item.exactTrimVerifiability} | ${item.collectionDifficulty} | ${item.batchSuitability} |`).join("\n");
  await writeFile(path.join(out, "candidate-analysis-report.md"), `# EE-PILOT-002 Batch 002 candidate analysis\n\nNo web research was performed. Visibility assessments use catalog provenance only.\n\n| Model | Trim | Fuel | Body | Exact identity | Difficulty | Suitability |\n|---|---|---|---|---|---|---|\n${reportRows}\n`);
  await writeFile(path.join(out, "collection-transition-recommendation.md"), `# Collection transition recommendation\n\n**Conditional proceed:** Alpine A110 S and A110 GT are the strongest different-manufacturer paired batch. Before any 51-feature collection begins, a bounded identity precheck must prove TR + MY2025 + exact S/GT applicability through dated official material. If it cannot, stop and open a Catalog Evidence Audit. Do not replace the pair inside the same immutable batch.\n\nExpected matrix: **2 × 51 = 102** rows. No assertion count is guaranteed.\n`);
  const checksums = Object.fromEntries(await Promise.all([...Object.keys(outputs), "candidate-analysis-report.md", "collection-transition-recommendation.md"].sort().map(async (name) => {
    const content = await readFile(path.join(out, name), "utf8"); return [name, sha(content)];
  })));
  await writeFile(path.join(out, "checksums.json"), canonical(checksums));
  console.log(JSON.stringify({ output: path.relative(root, out), candidates: candidates.length, selectedIds, expectedResearchLedgerRows: 102 }, null, 2));
}

void main();
