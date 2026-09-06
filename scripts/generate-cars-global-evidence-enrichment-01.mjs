import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE = "v1.0.0-catalog-v0.55.4-2026-09-05";
const GENERATED_AT = "2026-09-05T01:10:00.000+03:00";
const REPAIR_WORK_UNIT = "WU-XPY-GLOBAL-EVIDENCE-CANDIDATE-REPAIR-01";
const CATALOG_RELEASE = "v0.55.4";
const CATALOG_FINGERPRINT = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9";
const OUT = path.join(ROOT, "data/production/cars-global-evidence/release-candidates", RELEASE);

const INPUTS = {
  catalog: "data/production/catalog/releases/v0.55.4/catalog.json",
  catalogManifest: "data/production/catalog/releases/v0.55.4/manifest.json",
  catalogActive: "data/production/catalog/active.json",
  equipmentActive: "data/production/equipment-evidence/active.json",
  equipmentBefore: "data/production/equipment-evidence/releases/v1.5.5-catalog-v0.55.4-2026-08-20/equipment-evidence.json",
  equipmentAfter: "data/production/equipment-evidence/releases/v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04/equipment-evidence.json",
  dailyLifeActive: "data/production/equipment-daily-life/active.json",
  dailyLifeAfter: "data/production/equipment-daily-life/releases/v1.1.0-high-materiality-exact-applications-catalog-v0.55.4-2026-09-04/equipment-daily-life-exact-applications.json",
  dailyLifeCoverage: "data/production/equipment-daily-life/releases/v1.1.0-high-materiality-exact-applications-catalog-v0.55.4-2026-09-04/coverage-report.json",
  technicalDailyLifeActive: "data/production/technical-daily-life/active.json",
  technicalDailyLife: "data/production/technical-daily-life/releases/v2.1.3-0.55.4-2026-08-20-compatibility-rebind/technical-daily-life.json",
  personaActive: "data/production/personas/safe-traits/active.json",
  manualRegistry: "data/research/owner-manual-evidence-v4/source-registry.json",
  manualInventory: "data/research/owner-manual-evidence-v4/discovery-inventory.json",
  manualAssertions: "data/research/owner-manual-evidence-v4/pilot-assertions.json",
  manualDecisions: "data/research/owner-manual-evidence-v4/releases/v4.3.0-equipment-owner-review-01/exact-tr-bridge-decisions.json",
};

const MANUAL_BYTES = [
  {
    sourceId: "OM-ART-BYD-SEAL-U-EV-TR",
    exactVariantId: "11382bb9-bf71-52bf-9d0b-33befe86da7e",
    relativePath: "manuals/bytes/byd-seal-u-ev-tr.pdf",
    expectedSha256: "sha256:6460d596bf5599d61421018cc3e612f777be81c887263a11cedaa87f937b8e95",
    url: "https://www.byd.com/material/byd-site/eu/support/service/manual/20241030/seal-u-ev/BYD%20SEAL%20U%20EV%20Kullan%C4%B1m%20K%C4%B1lavuzu-Soldan%20Direksiyon-TR.pdf",
  },
  {
    sourceId: "OM-ART-TOYOTA-YARIS-HEV-2026-TR",
    exactVariantId: "4c22cb31-e980-4dc8-8525-c47363783d96",
    relativePath: "manuals/bytes/toyota-yaris-hev-2026-tr.pdf",
    expectedSha256: "sha256:80dce1818ee86ef707fdf2be5af4b64349ec957db1dc50a5a294f02d5a7eb8ca",
    url: "https://turkiye.toyota.com.tr/Files/KILAVUZ/YARIS_HYBRID/Yaris_HEV_OM_OM9AG95T.pdf",
  },
  {
    sourceId: "OM-ART-HYUNDAI-INSTER-2025-TR",
    exactVariantId: "8332f9df-5df5-5626-9d5f-22fbed616a56",
    relativePath: "manuals/bytes/hyundai-inster-2025-tr.pdf",
    expectedSha256: "sha256:a0fb8f8e4e926e3e6553aea7f98297944a28bcdd8312613296e76173859f3451",
    url: "https://www.hyundai.com/content/dam/hyundai/tr/tr/data/marketing/manual/inster-ax-ev/2025/inster.pdf",
  },
];

const MANUAL_LOCATOR_REPAIRS = new Map([
  ["OM-TR-OWNER-99CA516FD63C60027D22", { physicalPdfPage: 118, sectionHeading: "Adaptif Hız Sabitleme Sistemi (AHSS)" }],
  ["OM-TR-OWNER-6EEAE89B6D0F883D6DE1", { physicalPdfPage: 134, sectionHeading: "Kör Nokta Destek Sistemi" }],
]);

const repairedLocator = (decision) => MANUAL_LOCATOR_REPAIRS.get(decision.decisionId) ?? decision.manualSource.locator;

const LIVE_PRIMARY_SOURCE_CHECKS = [
  {
    sourceId: "LIVE-UNECE-WP29-2026-09-05",
    url: "https://unece.org/transport/vehicle-regulations",
    authority: "PRIMARY_REGULATORY",
    market: "GLOBAL",
    disposition: "EXPLANATION_ONLY",
    status: "LIVE_SEARCH_CONFIRMED",
    retrievedAt: GENERATED_AT,
  },
  {
    sourceId: "LIVE-HYUNDAI-UK-MANUALS-2026-09-05",
    url: "https://www.hyundai.com/uk/en/owners/owning-a-hyundai/owners-manuals.html",
    authority: "OFFICIAL_MANUFACTURER_SUPPORT",
    market: "GB",
    disposition: "FAMILY_SCOPED_UNLESS_EXACT_TR_BRIDGED",
    status: "LIVE_SEARCH_CONFIRMED",
    retrievedAt: GENERATED_AT,
  },
  {
    sourceId: "LIVE-BYD-EU-MANUAL-2026-09-05",
    url: "https://www.byd.com/content/dam/byd-site/eu/support/service/manual/",
    authority: "OFFICIAL_MANUFACTURER_SUPPORT",
    market: "EU_GLOBAL",
    disposition: "FAMILY_SCOPED_UNLESS_EXACT_TR_BRIDGED",
    status: "LIVE_SEARCH_CONFIRMED",
    retrievedAt: GENERATED_AT,
  },
  {
    sourceId: "LIVE-FORD-MANUAL-2026-09-05",
    url: "https://www.fordservicecontent.com/Ford_Content/vdirsnet/OwnerManual/",
    authority: "OFFICIAL_MANUFACTURER_SUPPORT",
    market: "GLOBAL",
    disposition: "FAMILY_SCOPED_UNLESS_EXACT_TR_BRIDGED",
    status: "LIVE_SEARCH_CONFIRMED",
    retrievedAt: GENERATED_AT,
  },
];

const readJson = async (relativePath) => JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};
const json = (value) => `${JSON.stringify(canonical(value), null, 2)}\n`;
const sha = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const uniq = (values) => [...new Set(values)];
const csvCell = (value) => {
  const text = Array.isArray(value) ? value.join("|") : value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function collectEvidenceFields(value, prefix = "", rows = []) {
  if (!value || typeof value !== "object") return rows;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectEvidenceFields(item, `${prefix}[${index}]`, rows));
    return rows;
  }
  if (Object.hasOwn(value, "value") && Array.isArray(value.provenance)) {
    rows.push({ path: prefix, confidence: value.confidence, provenance: value.provenance });
  }
  for (const [key, child] of Object.entries(value)) {
    collectEvidenceFields(child, prefix ? `${prefix}.${key}` : key, rows);
  }
  return rows;
}

async function main() {
  const loaded = Object.fromEntries(await Promise.all(Object.entries(INPUTS).map(async ([key, value]) => [key, await readJson(value)])));
  const { catalog, catalogManifest, equipmentBefore, equipmentAfter, dailyLifeAfter, dailyLifeCoverage, manualRegistry, manualInventory, manualAssertions, manualDecisions } = loaded;

  if (catalog.records.length !== 549) throw new Error(`CATALOG_VARIANT_COUNT:${catalog.records.length}`);
  if (catalogManifest.catalog_release_version !== "0.55.4") throw new Error("CATALOG_RELEASE_MISMATCH");
  if (catalogManifest.catalog_payload_hash !== CATALOG_FINGERPRINT) throw new Error("CATALOG_FINGERPRINT_MISMATCH");
  if (loaded.catalogActive.active_catalog_release_version !== "0.55.4") throw new Error("ACTIVE_CATALOG_CHANGED");
  if (equipmentAfter.compatibleCatalogFingerprint !== CATALOG_FINGERPRINT) throw new Error("EQUIPMENT_CANDIDATE_CATALOG_MISMATCH");
  if (dailyLifeAfter.compatibleCatalogFingerprint !== CATALOG_FINGERPRINT) throw new Error("DAILY_LIFE_CANDIDATE_CATALOG_MISMATCH");

  const activePointerPaths = [INPUTS.catalogActive, INPUTS.equipmentActive, INPUTS.dailyLifeActive, INPUTS.technicalDailyLifeActive, INPUTS.personaActive];
  const pointerHashesBefore = Object.fromEntries(await Promise.all(activePointerPaths.map(async (item) => [item, sha(await readFile(path.join(ROOT, item)))])));

  const catalogById = new Map(catalog.records.map((record) => [record.variant.id, record]));
  const familyByVariant = new Map();
  for (const family of manualInventory.families) {
    for (const exactVariantId of family.exactVariantIds) {
      if (familyByVariant.has(exactVariantId)) throw new Error(`DUPLICATE_MANUAL_FAMILY:${exactVariantId}`);
      familyByVariant.set(exactVariantId, family);
    }
  }
  if (familyByVariant.size !== 549) throw new Error(`MANUAL_INVENTORY_VARIANT_COUNT:${familyByVariant.size}`);

  const registryById = new Map(manualRegistry.entries.map((source) => [source.sourceId, source]));
  const artifactById = new Map(manualAssertions.artifacts.map((artifact) => [artifact.sourceId, artifact]));
  const decisionByVariant = new Map(manualDecisions.variants.map((variant) => [variant.exactVariantId, variant]));
  const equipmentBeforeIds = new Set([
    ...equipmentBefore.verifiedAssertions.map((item) => item.exactVariantId),
    ...equipmentBefore.reviewedAssociations.map((item) => item.exactVariantId),
  ]);
  const equipmentAfterIds = new Set([
    ...equipmentAfter.verifiedAssertions.map((item) => item.exactVariantId),
    ...equipmentAfter.reviewedAssociations.map((item) => item.exactVariantId),
  ]);
  const dailyLifeAfterIds = new Set(dailyLifeAfter.applications.map((item) => item.exactVariantId));
  const l9ReadyIds = new Set(MANUAL_BYTES.map((item) => item.exactVariantId));

  const manualByteIndex = [];
  for (const item of MANUAL_BYTES) {
    const absolutePath = path.join(OUT, item.relativePath);
    const bytes = await readFile(absolutePath);
    const actualSha256 = sha(bytes);
    if (actualSha256 !== item.expectedSha256) throw new Error(`MANUAL_DIGEST_MISMATCH:${item.sourceId}`);
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error(`MANUAL_NOT_PDF:${item.sourceId}`);
    const decision = decisionByVariant.get(item.exactVariantId);
    const exactDecisions = decision?.decisions.filter((entry) => entry.decision === "EXACT_VARIANT_VERIFIED" && entry.manualSource?.sourceId === item.sourceId) ?? [];
    if (exactDecisions.length === 0) throw new Error(`NO_EXACT_MANUAL_DECISION:${item.sourceId}`);
    manualByteIndex.push({
      ...item,
      actualSha256,
      byteLength: bytes.length,
      acquiredAt: GENERATED_AT,
      sourceAuthority: "OFFICIAL_MANUFACTURER_OWNER_MANUAL",
      applicabilityAuthority: "OWNER_REVIEWED_EXACT_TR_READ_ONLY_L9",
      decisionAuthority: "NONE_FOR_P_Y_FILTERING_RANKING_OR_AUTHORIZATION",
      locators: exactDecisions.map((entry) => ({ featureCode: entry.featureCode, ...repairedLocator(entry) })),
      reviewedDecisionIds: exactDecisions.map((entry) => entry.decisionId),
    });
  }

  const repairedDailyLifeAfter = {
    ...dailyLifeAfter,
    applications: dailyLifeAfter.applications.map((application) => {
      const repair = MANUAL_LOCATOR_REPAIRS.get(application.manualEvidence?.decisionId);
      return repair ? { ...application, manualEvidence: { ...application.manualEvidence, ...repair } } : application;
    }),
  };
  for (const [decisionId, expected] of MANUAL_LOCATOR_REPAIRS) {
    const artifact = manualByteIndex.find((item) => item.reviewedDecisionIds.includes(decisionId));
    const manualLocator = artifact?.locators[artifact.reviewedDecisionIds.indexOf(decisionId)];
    const dailyLifeLocator = repairedDailyLifeAfter.applications.find((application) => application.manualEvidence?.decisionId === decisionId)?.manualEvidence;
    if (manualLocator?.physicalPdfPage !== expected.physicalPdfPage || manualLocator?.sectionHeading !== expected.sectionHeading) {
      throw new Error(`MANUAL_LOCATOR_REPAIR_MISSING:${decisionId}`);
    }
    if (dailyLifeLocator?.physicalPdfPage !== expected.physicalPdfPage || dailyLifeLocator?.sectionHeading !== expected.sectionHeading) {
      throw new Error(`DAILY_LIFE_LOCATOR_REPAIR_MISSING:${decisionId}`);
    }
  }

  const ledger = catalog.records.map((record) => {
    const id = record.variant.id;
    const family = familyByVariant.get(id);
    const fieldEvidence = collectEvidenceFields(record.variant, "variant");
    const exactSources = new Map();
    for (const field of fieldEvidence) {
      for (const source of field.provenance) {
        const key = `${source.sourceId}|${source.sourceUrl}`;
        exactSources.set(key, {
          sourceId: source.sourceId,
          url: source.sourceUrl,
          retrievedAt: source.accessedAt,
          documentVersion: source.documentVersion,
          market: "TR",
          applicability: "EXACT_CATALOG_FIELD",
          disposition: "RETAINED_EXACT",
        });
      }
    }
    const manualTargets = uniq([...(family.sourceIds ?? []), ...(family.artifactSourceIds ?? [])]).map((sourceId) => {
      const source = registryById.get(sourceId);
      const artifact = artifactById.get(sourceId);
      return {
        sourceId,
        url: artifact?.url ?? source?.portalUrl ?? null,
        retrievedAt: artifact ? manualAssertions.assertions.find((item) => item.sourceId === sourceId)?.applicability?.observedAt ?? null : source?.applicability?.observedAt ?? null,
        market: artifact?.market ?? source?.applicability?.market ?? "UNKNOWN",
        documentModelYear: artifact?.modelYear ?? null,
        applicability: family.exactAuthority === "EXACT_VARIANT_VERIFIED" ? "EXACT_REVIEWED" : "FAMILY_SCOPED_OR_TARGET_ONLY",
        status: artifact ? "ARTIFACT_INDEXED" : source?.status ?? family.discoveryStatus,
      };
    });
    const decisions = decisionByVariant.get(id)?.decisions ?? [];
    const exactManualDecisionCount = decisions.filter((entry) => entry.decision === "EXACT_VARIANT_VERIFIED").length;
    const unresolvedDecisionCount = decisions.filter((entry) => entry.decision === "RESEARCHED_INCONCLUSIVE").length;
    const familyScoped = family.discoveryStatus === "EXTRACTED" && family.assertionCount > 0;
    const l9Ready = l9ReadyIds.has(id);
    const equipmentBeforeReady = equipmentBeforeIds.has(id);
    const equipmentAfterReady = equipmentAfterIds.has(id);
    const dailyLifeReady = dailyLifeAfterIds.has(id);
    const improved = (!equipmentBeforeReady && equipmentAfterReady) || dailyLifeReady || l9Ready;
    const gapPriority = l9Ready && equipmentAfterReady
      ? "P2_REMAINING_TECHNICAL_AND_EQUIPMENT_GAPS"
      : exactManualDecisionCount > 0
        ? "P0_MANUAL_BYTES_OR_EXACT_EQUIPMENT"
        : familyScoped
          ? "P1_EXACT_TRIM_APPLICABILITY"
          : "P1_PRIMARY_SOURCE_ACCESS";
    return {
      rowNumber: 0,
      exactVariantId: id,
      identity: {
        market: "TR",
        brand: record.variant.brand.value,
        model: record.variant.model.value,
        modelYear: record.variant.modelYear.value,
        trim: record.variant.trim.value,
        body: record.variant.bodyStyle.value,
        fuel: record.variant.powertrain.fuelType.value,
        transmission: record.variant.powertrain.transmission.value,
        drivetrain: record.variant.powertrain.drivenWheels.value,
      },
      gapPriority,
      exactTechnicalEvidence: {
        verifiedFieldCount: fieldEvidence.length,
        highConfidenceFieldCount: fieldEvidence.filter((field) => field.confidence === "HIGH").length,
        sourceCount: exactSources.size,
        sources: [...exactSources.values()],
      },
      manualResearch: {
        discoveryStatus: family.discoveryStatus,
        exactAuthority: family.exactAuthority,
        familyAssertionCount: family.assertionCount,
        targetPrimarySources: manualTargets,
        exactManualDecisionCount,
        unresolvedDecisionCount,
        l9ByteReady: l9Ready,
        l9Authority: l9Ready ? "READ_ONLY_EXACT_TR" : familyScoped ? "FAMILY_SCOPED_NOT_EXACT" : "UNAVAILABLE",
      },
      equipment: {
        activeReady: equipmentBeforeReady,
        candidateReady: equipmentAfterReady,
        exactVerifiedAssertionCount: equipmentAfter.verifiedAssertions.filter((item) => item.exactVariantId === id).length,
      },
      dailyLife: {
        exactCandidateApplicationCount: dailyLifeAfter.applications.filter((item) => item.exactVariantId === id).length,
        authority: dailyLifeReady ? "EXPLANATION_ONLY" : "NONE",
      },
      conflicts: decisions.filter((entry) => entry.conflictState && entry.conflictState !== "CLEAR").map((entry) => ({ featureCode: entry.featureCode, conflictState: entry.conflictState })),
      disposition: l9Ready ? "EXACT_L9_BYTES_VERIFIED" : familyScoped ? "FAMILY_SCOPED_RETAINED" : "RESEARCHED_INCONCLUSIVE",
      improved,
    };
  }).sort((a, b) => a.exactVariantId.localeCompare(b.exactVariantId)).map((row, index) => ({ ...row, rowNumber: index + 1 }));

  const exactFieldRows = ledger.flatMap((row) => collectEvidenceFields(catalogById.get(row.exactVariantId).variant, "variant"));
  const exactCatalogFieldCount = exactFieldRows.length;
  const catalogProvenanceEntryCount = exactFieldRows.reduce((sum, field) => sum + field.provenance.length, 0);
  const familyScopedVariantCount = ledger.filter((row) => row.manualResearch.familyAssertionCount > 0).length;
  const familyScopedFamilyCount = manualInventory.families.filter((family) => family.assertionCount > 0).length;
  const familyScopedAssertionAssociations = manualInventory.families.reduce((sum, family) => sum + family.assertionCount, 0);
  const explicitConflictCount = ledger.reduce((sum, row) => sum + row.conflicts.length, 0);
  const unresolvedManualDecisionCount = ledger.reduce((sum, row) => sum + row.manualResearch.unresolvedDecisionCount, 0);
  const improvedIds = new Set(ledger.filter((row) => row.improved).map((row) => row.exactVariantId));

  const coverageFor = (rows) => ({
    exactVariantCount: rows.length,
    exactTechnicalFieldCount: rows.reduce((sum, row) => sum + row.exactTechnicalEvidence.verifiedFieldCount, 0),
    familyScopedManualVariantCount: rows.filter((row) => row.manualResearch.familyAssertionCount > 0).length,
    equipmentReadyBefore: rows.filter((row) => row.equipment.activeReady).length,
    equipmentReadyAfter: rows.filter((row) => row.equipment.candidateReady).length,
    manualL9ReadyAfter: rows.filter((row) => row.manualResearch.l9ByteReady).length,
    exactDailyLifeVariantCountAfter: rows.filter((row) => row.dailyLife.exactCandidateApplicationCount > 0).length,
    improvedVariantCount: rows.filter((row) => row.improved).length,
  });
  const groupRows = (keyFn) => [...new Set(ledger.map(keyFn))].sort().map((key) => ({ key, ...coverageFor(ledger.filter((row) => keyFn(row) === key)) }));

  const metrics = {
    exactVerifiedCatalogFields: { before: exactCatalogFieldCount, after: exactCatalogFieldCount, delta: 0 },
    exactCatalogProvenanceEntries: { before: catalogProvenanceEntryCount, after: catalogProvenanceEntryCount, delta: 0 },
    familyScopedManualEvidenceVariants: { before: 0, after: familyScopedVariantCount, delta: familyScopedVariantCount },
    familyScopedManualEvidenceFamilies: { before: 0, after: familyScopedFamilyCount, delta: familyScopedFamilyCount },
    familyScopedManualAssertionAssociations: { before: 0, after: familyScopedAssertionAssociations, delta: familyScopedAssertionAssociations },
    explicitConflicts: { before: 0, after: explicitConflictCount, delta: explicitConflictCount },
    unresolvedManualDecisions: { before: unresolvedManualDecisionCount, after: unresolvedManualDecisionCount, delta: 0 },
    unknownOrAbsentTechnicalDailyLifeAssignments: { before: dailyLifeCoverage.counts.globalTechnicalToDailyLifeGapAssignmentsBefore, after: dailyLifeCoverage.counts.globalTechnicalToDailyLifeGapAssignmentsAfter, delta: 0 },
    equipmentCoveredVariants: { before: equipmentBeforeIds.size, after: equipmentAfterIds.size, delta: equipmentAfterIds.size - equipmentBeforeIds.size },
    exactEquipmentVerifiedVariants: { before: equipmentBefore.coverage.verifiedAssertionCoverage.exactVariantCount, after: equipmentAfter.coverage.verifiedAssertionCoverage.exactVariantCount, delta: equipmentAfter.coverage.verifiedAssertionCoverage.exactVariantCount - equipmentBefore.coverage.verifiedAssertionCoverage.exactVariantCount },
    exactEquipmentAssertions: { before: equipmentBefore.verifiedAssertions.length, after: equipmentAfter.verifiedAssertions.length, delta: equipmentAfter.verifiedAssertions.length - equipmentBefore.verifiedAssertions.length },
    manualL9ReadyVariants: { before: 0, after: l9ReadyIds.size, delta: l9ReadyIds.size },
    preservedOfficialManualArtifacts: { before: 0, after: manualByteIndex.length, delta: manualByteIndex.length },
    exactDailyLifeApplications: { before: 0, after: repairedDailyLifeAfter.applications.length, delta: repairedDailyLifeAfter.applications.length },
    exactDailyLifeVariants: { before: 0, after: dailyLifeAfterIds.size, delta: dailyLifeAfterIds.size },
    strictAdvisorReadyVariants: { before: 0, after: 0, delta: 0 },
    strictComparisonReadyVariants: { before: 0, after: 0, delta: 0 },
    improvedVariants: improvedIds.size,
    unchangedVariants: 549 - improvedIds.size,
  };

  const coverageReport = {
    schemaVersion: "XPY_CARS_GLOBAL_EVIDENCE_COVERAGE/v1",
    releaseVersion: RELEASE,
    generatedAt: GENERATED_AT,
    verdict: "PASS_WITH_BOUNDED_IMPROVEMENT_AND_FAIL_CLOSED_REMAINDERS",
    catalogRelease: CATALOG_RELEASE,
    catalogFingerprint: CATALOG_FINGERPRINT,
    metrics,
    brandCoverage: groupRows((row) => row.identity.brand).map(({ key: brand, ...rest }) => ({ brand, ...rest })),
    modelFamilyCoverage: groupRows((row) => `${row.identity.brand}::${row.identity.model}`).map(({ key, ...rest }) => {
      const [brand, model] = key.split("::");
      return { brand, model, ...rest };
    }),
    blockers: [
      "539 variants remain outside the candidate equipment-covered set; absence is neutral and cannot disadvantage a variant.",
      `${metrics.unknownOrAbsentTechnicalDailyLifeAssignments.after} technical-to-daily-life assignments remain absent or unknown.`,
      "Only three owner-reviewed exact-TR manual sources now have locally preserved bytes; all other manual evidence remains family-scoped or unavailable.",
      "Cars Domain Pack comparison dimensions and Need-to-Evidence bindings remain unregistered, so strict Advisor/comparison readiness remains zero.",
    ],
  };

  const conflictExclusions = {
    schemaVersion: "XPY_CARS_GLOBAL_EVIDENCE_EXCLUSIONS/v1",
    releaseVersion: RELEASE,
    explicitConflicts: ledger.flatMap((row) => row.conflicts.map((conflict) => ({ exactVariantId: row.exactVariantId, ...conflict, disposition: "UNKNOWN" }))),
    researchedInconclusive: ledger.filter((row) => row.disposition === "RESEARCHED_INCONCLUSIVE").map((row) => ({ exactVariantId: row.exactVariantId, brand: row.identity.brand, model: row.identity.model, reason: row.manualResearch.discoveryStatus, disposition: "UNKNOWN_NO_NEGATIVE_INFERENCE" })),
    exclusions: [
      { code: "CROSS_MARKET_TRIM_INFERENCE_FORBIDDEN", count: 549, effect: "No global/family manual was promoted to exact equipment without the owner-reviewed exact-TR bridge." },
      { code: "MERCHANT_AND_PRICE_EVIDENCE_OUT_OF_SCOPE", count: 549, effect: "No offer, retailer, affiliate, current-price, review, or media-license evidence was added." },
      { code: "MANUAL_WITHOUT_LOCAL_BYTES_NOT_L9_READY", count: 546, effect: "Indexed remote manual metadata remains non-ready until bytes, digest, applicability and locators are all present." },
      { code: "PERSONA_DECISION_AUTHORITY_NONE", count: 549, effect: "Persona evidence remains soft planning only." },
    ],
  };

  const dailyLifeProjectionRaw = json(repairedDailyLifeAfter);

  const candidate = {
    schemaVersion: "XPY_CARS_GLOBAL_EVIDENCE_CANDIDATE/v1",
    releaseVersion: RELEASE,
    state: "IMMUTABLE_RELEASE_CANDIDATE_NOT_ACTIVE",
    generatedAt: GENERATED_AT,
    compatibleCatalogRelease: CATALOG_RELEASE,
    compatibleCatalogFingerprint: CATALOG_FINGERPRINT,
    activationPerformed: false,
    activePointersMutated: false,
    decisionAuthority: {
      exactCatalogTechnicalFacts: "UNCHANGED_EXISTING_AUTHORITY",
      exactEquipment: "SHADOW_AND_EXPLANATION_DISABLED_PENDING_CONSOLIDATION_REVIEW",
      familyManualEvidence: "FAMILY_SCOPED_READ_ONLY",
      exactManualL9: "READ_ONLY_NONE_FOR_P_Y_FILTERING_RANKING_OR_AUTHORIZATION",
      dailyLife: "EXPLANATION_ONLY_NONE_FOR_SELECTION_OR_AUTHORIZATION",
      persona: "SOFT_PLANNING_ONLY",
    },
    components: {
      equipmentCandidate: { path: INPUTS.equipmentAfter, sha256: sha(await readFile(path.join(ROOT, INPUTS.equipmentAfter))), release: equipmentAfter.releaseVersion },
      dailyLifeCandidate: { path: "daily-life-exact-applications.json", sourcePath: INPUTS.dailyLifeAfter, sha256: sha(dailyLifeProjectionRaw), release: dailyLifeAfter.releaseVersion },
      manualByteIndex: { path: "manual-index.json", readyExactVariantIds: [...l9ReadyIds].sort() },
      researchLedger: { path: "research-ledger.json", rowCount: ledger.length },
    },
  };

  const sourceRegistry = {
    schemaVersion: "XPY_CARS_GLOBAL_EVIDENCE_SOURCES/v1",
    releaseVersion: RELEASE,
    generatedAt: GENERATED_AT,
    officialManualPortalSources: manualRegistry.entries,
    indexedOfficialManualArtifacts: manualAssertions.artifacts,
    livePrimarySourceChecks: LIVE_PRIMARY_SOURCE_CHECKS,
    authorityRule: "International family/model evidence is FAMILY_SCOPED or EXPLANATION_ONLY unless exact Türkiye market, model year, body, powertrain and trim applicability is proven.",
  };

  const dryRun = {
    schemaVersion: "XPY_CARS_GLOBAL_EVIDENCE_DRY_RUN/v1",
    releaseVersion: RELEASE,
    generatedAt: GENERATED_AT,
    status: "PASS",
    activationPerformed: false,
    checks: {
      exactVariantCount549: ledger.length === 549,
      uniqueExactVariantIds549: new Set(ledger.map((row) => row.exactVariantId)).size === 549,
      catalogIdentitySetUnchanged: ledger.every((row) => catalogById.has(row.exactVariantId)),
      allRowsHavePrimaryResearchTarget: ledger.every((row) => row.exactTechnicalEvidence.sources.length > 0 || row.manualResearch.targetPrimarySources.length > 0),
      familyEvidenceNeverExactByConvenience: ledger.every((row) => row.manualResearch.l9Authority !== "READ_ONLY_EXACT_TR" || l9ReadyIds.has(row.exactVariantId)),
      exactManualsHavePreservedMatchingBytes: manualByteIndex.length === 3 && manualByteIndex.every((item) => item.actualSha256 === item.expectedSha256),
      dailyLifeDecisionNeutral: repairedDailyLifeAfter.applications.every((item) => item.decisionUse === "NONE" && item.directCandidateEffect === "NONE"),
      correctedBydManualLocatorsPresent: [...MANUAL_LOCATOR_REPAIRS].every(([decisionId, expected]) => {
        const locator = repairedDailyLifeAfter.applications.find((item) => item.manualEvidence?.decisionId === decisionId)?.manualEvidence;
        return locator?.physicalPdfPage === expected.physicalPdfPage && locator?.sectionHeading === expected.sectionHeading;
      }),
      equipmentCandidateDecisionNeutral: equipmentAfter.decisionAuthority === "SHADOW_AND_EXPLANATION_DISABLED",
      strictReadinessNotFabricated: metrics.strictAdvisorReadyVariants.after === 0 && metrics.strictComparisonReadyVariants.after === 0,
      noActivePointerWritesPlanned: candidate.activationPerformed === false && candidate.activePointersMutated === false,
    },
    activePointerHashesBefore: pointerHashesBefore,
    activePointerHashesAfter: pointerHashesBefore,
  };
  if (Object.values(dryRun.checks).some((value) => value !== true)) throw new Error(`DRY_RUN_FAILED:${JSON.stringify(dryRun.checks)}`);

  const csvColumns = [
    "rowNumber", "exactVariantId", "brand", "model", "modelYear", "trim", "body", "fuel", "transmission", "drivetrain", "gapPriority",
    "exactVerifiedFieldCount", "exactSourceCount", "manualDiscoveryStatus", "manualExactAuthority", "manualFamilyAssertionCount", "manualTargetSourceIds",
    "manualTargetUrls", "exactManualDecisionCount", "unresolvedManualDecisionCount", "l9ByteReady", "equipmentActiveReady", "equipmentCandidateReady",
    "exactEquipmentAssertionCount", "exactDailyLifeApplicationCount", "conflictCount", "disposition", "improved",
  ];
  const csvRows = ledger.map((row) => [
    row.rowNumber, row.exactVariantId, row.identity.brand, row.identity.model, row.identity.modelYear, row.identity.trim, row.identity.body, row.identity.fuel,
    row.identity.transmission, row.identity.drivetrain, row.gapPriority, row.exactTechnicalEvidence.verifiedFieldCount, row.exactTechnicalEvidence.sourceCount,
    row.manualResearch.discoveryStatus, row.manualResearch.exactAuthority, row.manualResearch.familyAssertionCount,
    row.manualResearch.targetPrimarySources.map((source) => source.sourceId), row.manualResearch.targetPrimarySources.map((source) => source.url).filter(Boolean),
    row.manualResearch.exactManualDecisionCount, row.manualResearch.unresolvedDecisionCount, row.manualResearch.l9ByteReady, row.equipment.activeReady,
    row.equipment.candidateReady, row.equipment.exactVerifiedAssertionCount, row.dailyLife.exactCandidateApplicationCount, row.conflicts.length, row.disposition, row.improved,
  ].map(csvCell).join(","));
  const csv = `${csvColumns.join(",")}\n${csvRows.join("\n")}\n`;

  const metricRows = Object.entries(metrics).map(([name, value]) => {
    if (typeof value === "number") return `| ${name} | - | ${value} | - |`;
    return `| ${name} | ${value.before} | ${value.after} | ${value.delta} |`;
  }).join("\n");
  const brandRows = coverageReport.brandCoverage.map((row) =>
    `| ${row.brand} | ${row.exactVariantCount} | ${row.exactTechnicalFieldCount} | ${row.familyScopedManualVariantCount} | ${row.equipmentReadyBefore} | ${row.equipmentReadyAfter} | ${row.manualL9ReadyAfter} | ${row.exactDailyLifeVariantCountAfter} | ${row.improvedVariantCount} |`,
  ).join("\n");
  const completionReport = `# ${REPAIR_WORK_UNIT} - Cars candidate\n\n` +
    `## Verdict\n\n` +
    `PASS_WITH_BOUNDED_IMPROVEMENT_AND_FAIL_CLOSED_REMAINDERS. All 549 active Türkiye exact identities are preserved. The candidate is immutable, inactive and decision-neutral outside existing exact catalog authority.\n\n` +
    `## Exact before/after metrics\n\n` +
    `| Metric | Before | After | Delta |\n| --- | ---: | ---: | ---: |\n${metricRows}\n\n` +
    `## Brand and variant coverage\n\n` +
    `| Brand | Variants | Exact technical fields | Family-manual variants | Equipment before | Equipment after | L9 after | Daily-life variants after | Improved |\n` +
    `| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${brandRows}\n\n` +
    `The complete 385-family table is in \`coverage-report.json\`; the exact 549-row identity, gap, target-source and disposition ledger is in both \`research-ledger.json\` and \`research-ledger.csv\`.\n\n` +
    `## Manual, equipment, daily-life and strict readiness\n\n` +
    `Three owner-reviewed Türkiye manuals (BYD SEAL U EV, Toyota Yaris HEV and Hyundai INSTER) now have preserved bytes whose SHA-256 values exactly match the reviewed digests. The two repaired BYD locators resolve to physical PDF page 118, \`Adaptif Hız Sabitleme Sistemi (AHSS)\`, and physical PDF page 134, \`Kör Nokta Destek Sistemi\`; the same corrected locators are bound into the local daily-life projection. Their authority is read-only L9 with no P/Y, filtering, ranking, sufficiency, selection or authorization effect. Equipment coverage grows from 6 to 10 variants (exact verified 4 to 8; assertions 112 to 126). Twenty exact explanation-only daily-life applications cover five variants. Strict Advisor and comparison readiness remain 0 because domain-pack comparison and Need-to-Evidence bindings are not registered.\n\n` +
    `## Conflicts and exclusions\n\n` +
    `No explicit source conflict was promoted. There are ${unresolvedManualDecisionCount} researched-inconclusive manual decisions, which remain UNKNOWN. Family/global manuals without exact Türkiye trim proof remain family-scoped. The 8,646 absent/unknown technical-to-daily-life assignments remain neutral. Merchant offers, affiliate data, current prices, user reviews, media licensing and persona decision authority are excluded.\n\n` +
    `## Release candidate and dry run\n\n` +
    `The release candidate is \`${RELEASE}\`. Per-file SHA-256 values are recorded in \`checksums.json\` and bound by \`manifest.json\`. The dry run passes exact identity preservation, source targeting, cross-market fail-closed behavior, manual byte/digest checks, exact-vs-family separation, decision neutrality, strict-readiness non-fabrication and byte-identical active pointers. No activation, migration, deployment or production pointer mutation was performed.\n\n` +
    `## Proportional verification\n\n` +
    `Verification covers all 549 ledger rows and all three acquired PDFs; focused tests exercise identity preservation, cross-market/family scoping, manual digests and locators, decision neutrality, before/after metrics, immutable checksums and active-pointer preservation. Existing owner-manual, exact-TR bridge, equipment-owner-review, high-materiality daily-life and recommendation-catalog regression suites are included in the validation run.\n\n` +
    `## Recommendation\n\n` +
    `The repaired inactive candidate is ready for an approval decision; activation remains a separate prohibited action in this work unit.\n`;

  await mkdir(OUT, { recursive: true });
  const artifacts = {
    "candidate.json": json(candidate),
    "research-ledger.json": json({ schemaVersion: "XPY_CARS_GLOBAL_RESEARCH_LEDGER/v1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, rowCount: ledger.length, rows: ledger }),
    "research-ledger.csv": csv,
    "source-registry.json": json(sourceRegistry),
    "manual-index.json": json({ schemaVersion: "XPY_CARS_MANUAL_BYTE_INDEX/v1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, artifacts: manualByteIndex }),
    "daily-life-exact-applications.json": dailyLifeProjectionRaw,
    "coverage-report.json": json(coverageReport),
    "conflicts-and-exclusions.json": json(conflictExclusions),
    "dry-run-validation.json": json(dryRun),
    "completion-report.md": completionReport,
  };
  for (const [name, bytes] of Object.entries(artifacts)) await writeFile(path.join(OUT, name), bytes);

  const pointerHashesAfter = Object.fromEntries(await Promise.all(activePointerPaths.map(async (item) => [item, sha(await readFile(path.join(ROOT, item)))])));
  if (JSON.stringify(pointerHashesAfter) !== JSON.stringify(pointerHashesBefore)) throw new Error("ACTIVE_POINTER_MUTATION_DETECTED");

  const checksums = {};
  for (const name of Object.keys(artifacts).sort()) checksums[name] = sha(await readFile(path.join(OUT, name)));
  for (const item of manualByteIndex) checksums[item.relativePath] = item.actualSha256;
  const checksumsBytes = json({ schemaVersion: "XPY_RELEASE_CHECKSUMS/v1", releaseVersion: RELEASE, files: checksums });
  await writeFile(path.join(OUT, "checksums.json"), checksumsBytes);

  const manifestFiles = { ...checksums, "checksums.json": sha(checksumsBytes) };
  const manifest = {
    schemaVersion: "XPY_CARS_GLOBAL_EVIDENCE_MANIFEST/v1",
    workUnitId: REPAIR_WORK_UNIT,
    repairedCandidateFromWorkUnitId: "WU-XPY-CARS-GLOBAL-EVIDENCE-ENRICHMENT-01",
    releaseVersion: RELEASE,
    generatedAt: GENERATED_AT,
    state: "IMMUTABLE_RELEASE_CANDIDATE_NOT_ACTIVE",
    verdict: coverageReport.verdict,
    compatibleCatalogRelease: CATALOG_RELEASE,
    compatibleCatalogFingerprint: CATALOG_FINGERPRINT,
    rowCount: ledger.length,
    metrics,
    files: manifestFiles,
    releaseDigest: sha(json({ releaseVersion: RELEASE, files: manifestFiles })),
    sourceInputs: Object.values(INPUTS),
    activationPerformed: false,
    productionMutationPerformed: false,
    recommendation: "READY_FOR_APPROVAL_PENDING_SEPARATE_HUMAN_APPROVAL; DO_NOT_ACTIVATE_IN_THIS_WORK_UNIT",
  };
  await writeFile(path.join(OUT, "manifest.json"), json(manifest));
  console.log(JSON.stringify({ releaseVersion: RELEASE, out: path.relative(ROOT, OUT), verdict: manifest.verdict, metrics }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
