import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { canonicalJson } from "../features/vehicle-data/ownerManualEvidence";
import { validateExactTrManualPromotion, type ExactTrCatalogIdentity, type ExactTrManualPromotion } from "../features/vehicle-data/ownerManualExactTrPromotion";

const ROOT = process.cwd();
const RELEASE = "v4.1.0-exact-tr-pilot-01";
const OUT_RELATIVE = `data/research/owner-manual-evidence-v4/releases/${RELEASE}`;
const OUT = path.join(ROOT, OUT_RELATIVE);
const GENERATED_AT = "2026-09-04T00:00:00.000Z";
const CATALOG_RELEASE = "v0.55.4";
const CATALOG_FINGERPRINT = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9";
const BASELINE_PATH = "data/research/owner-manual-evidence-v4/exact-tr-bridge-decisions.json";
const PILOT_PATH = "data/research/owner-manual-evidence-v4/pilot-assertions.json";
const REGISTRY_PATH = "data/research/owner-manual-evidence-v4/source-registry.json";
const CATALOG_PATH = "data/production/catalog/releases/v0.55.4/catalog.json";
const CATALOG_MANIFEST_PATH = "data/production/catalog/releases/v0.55.4/manifest.json";
const EQUIPMENT_PATH = "data/production/equipment-evidence/releases/v1.5.5-catalog-v0.55.4-2026-08-20/equipment-evidence.json";
const EQUIPMENT_MANIFEST_PATH = "data/production/equipment-evidence/releases/v1.5.5-catalog-v0.55.4-2026-08-20/manifest.json";
const DOLPHIN_METADATA_PATH = "data/cars/vehicle_evidence/source_snapshots/SRC-000092/2026-08-19/metadata.json";
const REVIEW_PATH = "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-SCALE-WAVE-001/corrections/EE-PILOT-002-SCALE-WAVE-001-R1/second-review/independent-review-events.json";
const APPROVAL_PATH = "data/production/equipment-evidence/releases/v1.5.2-catalog-v0.55.3-2026-08-19/owner-approval-events.json";

const TARGETS = [
  { requestedId: "11382bb9-bf71-52bf-9de8-81b6828e13d2", brand: "BYD", model: "SEAL U EV", sourceId: "OM-ART-BYD-SEAL-U-EV-TR" },
  { requestedId: "4c22cb31-e980-4dc8-8525-c47363783d96", brand: "Toyota", model: "Yaris", sourceId: "OM-ART-TOYOTA-YARIS-HEV-2026-TR" },
  { requestedId: "6cb56615-37ef-51a8-9202-a73e59d4e14b", brand: "BYD", model: "DOLPHIN", sourceId: "OM-ART-BYD-DOLPHIN-TR" },
  { requestedId: "733e13d4-f0d1-5ad0-9eac-a158d23e58c7", brand: "Togg", model: "T10X", sourceId: "OM-ART-TOGG-T10X-TR" },
  { requestedId: "8332f9df-5df5-5626-9d5f-22fbed616a56", brand: "Hyundai", model: "INSTER", sourceId: "OM-ART-HYUNDAI-INSTER-2025-TR" },
  { requestedId: "cf63bfb6-d503-5669-9799-6593f4b3f96b", brand: "Toyota", model: "Hilux", sourceId: "OM-ART-TOYOTA-HILUX-2024-TR" },
  { requestedId: "a6c5b4df-f0ce-5dd6-aa9a-3dcd770f6e0b", brand: "Togg", model: "T10F", sourceId: "OM-ART-TOGG-T10F-TR" },
  { requestedId: "17059c89-031e-542a-90dd-83be8c972960", brand: "Toyota", model: "Corolla Hatchback", sourceId: "OM-ART-TOYOTA-COROLLA-HB-2026-TR" },
] as const;

type Json = Record<string, unknown>;
const readJson = async <T>(relative: string): Promise<T> => JSON.parse(await readFile(path.join(ROOT, relative), "utf8")) as T;
const sha256 = (value: string | Buffer): `sha256:${string}` => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stableId = (prefix: string, ...parts: string[]) => `${prefix}-${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 20).toUpperCase()}`;
const writeCanonical = async (name: string, value: unknown) => writeFile(path.join(OUT, name), `${canonicalJson(value)}\n`, "utf8");
const record = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const value = (subject: unknown, key: string): unknown => record(record(subject)[key]).value;
const text = (subject: unknown, key: string): string => String(record(subject)[key] ?? "");

function catalogIdentity(catalogRecord: Json): ExactTrCatalogIdentity {
  const variant = record(catalogRecord.variant);
  const powertrain = record(variant.powertrain);
  return {
    exactVariantId: text(variant, "id"),
    market: text(variant, "market"),
    modelYear: Number(value(variant, "modelYear")),
    trim: String(value(variant, "trim") ?? ""),
    body: String(value(variant, "bodyStyle") ?? ""),
    powertrain: String(value(powertrain, "fuelType") ?? ""),
  };
}

async function main(): Promise<void> {
  const [baseline, pilot, registry, catalog, catalogManifest, equipment, equipmentManifest, dolphinMetadata, reviews, approvals] = await Promise.all([
    readJson<Json>(BASELINE_PATH),
    readJson<{ artifacts: Json[]; assertions: Json[] }>(PILOT_PATH),
    readJson<{ entries: Json[] }>(REGISTRY_PATH),
    readJson<{ records: Json[] }>(CATALOG_PATH),
    readJson<Json>(CATALOG_MANIFEST_PATH),
    readJson<Json>(EQUIPMENT_PATH),
    readJson<Json>(EQUIPMENT_MANIFEST_PATH),
    readJson<Json>(DOLPHIN_METADATA_PATH),
    readJson<Json[]>(REVIEW_PATH),
    readJson<Json[]>(APPROVAL_PATH),
  ]);
  if (text(baseline, "catalogRelease") !== CATALOG_RELEASE || text(baseline, "catalogFingerprint") !== CATALOG_FINGERPRINT) throw new Error("BASELINE_CATALOG_MISMATCH");
  if (text(equipment, "compatibleCatalogRelease") !== CATALOG_RELEASE || text(equipment, "compatibleCatalogFingerprint") !== CATALOG_FINGERPRINT) throw new Error("EQUIPMENT_CATALOG_MISMATCH");
  if (`sha256:${text(catalogManifest, "catalog_payload_hash").replace(/^sha256:/u, "")}` !== CATALOG_FINGERPRINT) throw new Error("CATALOG_MANIFEST_FINGERPRINT_MISMATCH");
  if (text(equipmentManifest, "payloadSha256") !== sha256(await readFile(path.join(ROOT, EQUIPMENT_PATH)))) throw new Error("EQUIPMENT_MANIFEST_DIGEST_MISMATCH");
  if (text(dolphinMetadata, "artifactSha256") !== sha256(await readFile(path.join(ROOT, text(dolphinMetadata, "artifactReference"))))) throw new Error("DOLPHIN_SNAPSHOT_DIGEST_MISMATCH");

  const catalogById = new Map(catalog.records.map((item) => [text(record(item.variant), "id"), item]));
  const catalogByLabel = new Map(catalog.records.map((item) => {
    const variant = record(item.variant);
    return [`${String(value(variant, "brand"))}|${String(value(variant, "model"))}`, item];
  }));
  const artifactById = new Map(pilot.artifacts.map((item) => [text(item, "sourceId"), item]));
  const assertionsBySource = new Map<string, Json[]>();
  for (const assertion of pilot.assertions) assertionsBySource.set(text(assertion, "sourceId"), [...(assertionsBySource.get(text(assertion, "sourceId")) ?? []), assertion]);
  const registryByBrand = new Map(registry.entries.map((entry) => [text(entry, "brand"), entry]));
  const verified = (Array.isArray(equipment.verifiedAssertions) ? equipment.verifiedAssertions : []) as Json[];
  const exactByPair = new Map(verified.map((item) => [`${text(item, "exactVariantId")}|${text(item, "featureCode")}`, item]));
  const reviewById = new Map(reviews.map((item) => [text(item, "eventId"), item]));
  const approvalById = new Map(approvals.map((item) => [text(item, "eventId"), item]));
  const promotions = new Map<string, ExactTrManualPromotion>();

  const dolphinTarget = TARGETS.find((item) => item.model === "DOLPHIN")!;
  const dolphinRecord = catalogById.get(dolphinTarget.requestedId);
  if (!dolphinRecord) throw new Error("DOLPHIN_CATALOG_ID_MISSING");
  const dolphinIdentity = catalogIdentity(dolphinRecord);
  for (const assertion of assertionsBySource.get(dolphinTarget.sourceId) ?? []) {
    const featureCode = text(assertion, "featureCode");
    const exact = exactByPair.get(`${dolphinTarget.requestedId}|${featureCode}`);
    if (!exact) continue;
    const sourceReference = record((Array.isArray(exact.sourceReferences) ? exact.sourceReferences : [])[0]);
    const review = reviewById.get(text(exact, "independentReviewEventId"));
    const approval = approvalById.get(text(exact, "ownerApprovalEventId"));
    if (!review || !approval) throw new Error(`REVIEW_AUTHORITY_MISSING:${featureCode}`);
    const provenance = record(assertion.provenance);
    const applicability = record(assertion.applicability);
    const locator = record(exact.locator);
    const promotion: ExactTrManualPromotion = {
      authorityLevel: "EXACT_VARIANT_VERIFIED",
      exactVariantId: dolphinIdentity.exactVariantId,
      featureCode,
      polarity: text(exact, "availabilityStatus") === "NOT_AVAILABLE" ? "NEGATIVE" : "POSITIVE",
      confidence: "HIGH",
      status: "VERIFIED",
      applicability: { market: "TR", modelYear: dolphinIdentity.modelYear, trim: dolphinIdentity.trim, body: dolphinIdentity.body, powertrain: dolphinIdentity.powertrain },
      manualSource: {
        sourceId: text(assertion, "sourceId"), artifactReference: text(provenance, "rawArtifactReference"), artifactSha256: text(provenance, "rawSha256"), language: "tr", market: "TR", observedAt: text(applicability, "observedAt"),
        locator: { physicalPdfPage: Number(provenance.physicalPdfPage), sectionHeading: text(provenance, "sectionHeading") },
      },
      exactApplicabilitySource: {
        sourceId: text(sourceReference, "sourceId"), sourceType: "OFFICIAL_EQUIPMENT_MATRIX", artifactReference: text(dolphinMetadata, "artifactReference"), originalUrl: text(dolphinMetadata, "originalUrl"), artifactSha256: text(sourceReference, "artifactSha256"), observedAt: text(dolphinMetadata, "capturedAt"), reviewedAt: text(review, "reviewedAt"),
        locator: { pageNumber: Number(locator.pageNumber), row: text(locator, "row"), column: text(locator, "column") },
      },
      reviewerAuthority: {
        ownerActorId: text(approval, "actorId"), ownerApprovalEventId: text(exact, "ownerApprovalEventId"), independentReviewerActorId: text(review, "actorInstanceId"), independentReviewEventId: text(exact, "independentReviewEventId"), approvalManifestId: text(exact, "approvalManifestId"), approvalManifestChecksum: text(exact, "approvalManifestChecksum"),
      },
      limitations: [
        "The owner manual remains read-only L9 knowledge and does not authorize candidate selection, ranking, filtering, question generation, or L1/L8 facts.",
        "Conditional manual wording is not used as equipment proof; exact presence or absence comes only from the separately governed Türkiye equipment-matrix cell.",
        "The equipment evidence release is compatibility-bound to catalog v0.55.4 while preserving its v0.55.2 subject provenance and stable exact identity.",
      ],
      manualConditionalEquipment: applicability.conditionalEquipment === true,
      familyInheritance: false,
      conditionalPromotedToStandard: false,
      missingMentionTreatedAsNegative: false,
    };
    const issues = validateExactTrManualPromotion(promotion, dolphinIdentity);
    if (issues.length) throw new Error(`PROMOTION_INVALID:${featureCode}:${issues.join(",")}`);
    promotions.set(`${promotion.exactVariantId}|${promotion.featureCode}`, promotion);
  }
  if (promotions.size !== 5) throw new Error(`EXPECTED_FIVE_DOLPHIN_PROMOTIONS_GOT_${promotions.size}`);

  const baselineVariants = (Array.isArray(baseline.variants) ? baseline.variants : []) as Json[];
  const variants = baselineVariants.map((variant) => {
    const exactVariantId = text(variant, "exactVariantId");
    const decisions = (Array.isArray(variant.decisions) ? variant.decisions : []).map((decision) => {
      const promotion = promotions.get(`${exactVariantId}|${text(decision, "featureCode")}`);
      if (!promotion) return decision;
      return {
        decisionId: stableId("OM-TR-PILOT", exactVariantId, promotion.featureCode),
        exactVariantId,
        featureCode: promotion.featureCode,
        decision: "EXACT_VARIANT_VERIFIED",
        authorityLevel: "EXACT_VARIANT_VERIFIED",
        normalizedValue: promotion.polarity === "POSITIVE",
        polarity: promotion.polarity,
        availabilityStatus: promotion.polarity === "POSITIVE" ? "STANDARD" : "NOT_AVAILABLE",
        confidence: promotion.confidence,
        status: promotion.status,
        conflictState: "CLEAR",
        observedAt: promotion.exactApplicabilitySource.observedAt,
        reviewedAt: promotion.exactApplicabilitySource.reviewedAt,
        applicability: promotion.applicability,
        manualSource: promotion.manualSource,
        exactApplicabilitySource: promotion.exactApplicabilitySource,
        reviewerAuthority: promotion.reviewerAuthority,
        limitations: promotion.limitations,
        manualConditionalEquipment: promotion.manualConditionalEquipment,
        familyInheritance: false,
        conditionalPromotedToStandard: false,
        missingMentionTreatedAsNegative: false,
        decisionAuthority: "READ_ONLY_L9_NONE_FOR_L1_L8_Y_OR_CANDIDATE_SELECTION",
      };
    });
    const exactCount = decisions.filter((decision) => text(decision, "decision") === "EXACT_VARIANT_VERIFIED").length;
    return { ...variant, bridgeStatus: exactCount ? "PARTIALLY_EXACT_VARIANT_VERIFIED" : text(variant, "bridgeStatus"), decisions };
  });
  if (variants.length !== 549 || new Set(variants.map((item) => text(item, "exactVariantId"))).size !== 549) throw new Error("EXACT_VARIANT_CARDINALITY_MISMATCH");

  const dispositionRows = TARGETS.map((target) => {
    const item = catalogById.get(target.requestedId);
    const closest = catalogByLabel.get(`${target.brand}|${target.model}`);
    const assertions = assertionsBySource.get(target.sourceId) ?? [];
    const artifact = artifactById.get(target.sourceId) ?? {};
    const registryEntry = registryByBrand.get(target.brand) ?? null;
    const exactPromotions = [...promotions.values()].filter((promotion) => promotion.exactVariantId === target.requestedId);
    const reasons = item
      ? exactPromotions.length
        ? ["EXACT_TRIM_MODEL_YEAR_POWERTRAIN_AND_MARKET_BRIDGE_VERIFIED", "CONDITIONAL_MANUAL_LANGUAGE_NOT_USED_AS_EQUIPMENT_PROOF"]
        : ["FAMILY_MANUAL_NOT_EXACT_TRIM_AUTHORITY", "CONDITIONAL_EQUIPMENT_LANGUAGE", "MANUAL_MODEL_YEAR_TRIM_BODY_AND_POWERTRAIN_SCOPE_UNSPECIFIED", "NO_CHECKSUM_BOUND_EXACT_TRIM_BRIDGE_IN_BOUNDED_INPUTS", ...(target.model === "Hilux" ? ["CATALOG_MY2026_ARTIFACT_LABEL_MY2024"] : [])]
      : ["REQUESTED_EXACT_VARIANT_ID_NOT_IN_ACTIVE_CATALOG", "LABEL_MATCH_HAS_DIFFERENT_CATALOG_ID", "SILENT_ID_SUBSTITUTION_FORBIDDEN"];
    return {
      requestedExactVariantId: target.requestedId,
      requestedLabel: `${target.brand} ${target.model}`,
      catalogIdentity: item ? { ...catalogIdentity(item), brand: String(value(record(item.variant), "brand")), model: String(value(record(item.variant), "model")) } : null,
      closestLabelCatalogIdentity: !item && closest ? { ...catalogIdentity(closest), brand: String(value(record(closest.variant), "brand")), model: String(value(record(closest.variant), "model")) } : null,
      disposition: !item ? "INVALID_TARGET_ID_UNRESOLVED" : exactPromotions.length ? "PARTIALLY_EXACT_VARIANT_VERIFIED" : "FAMILY_ONLY_EXACT_APPLICABILITY_UNRESOLVED",
      sourceArtifact: { sourceId: target.sourceId, url: text(artifact, "url"), rawSha256: text(artifact, "rawSha256"), language: text(artifact, "language"), market: text(artifact, "market"), modelFamily: text(artifact, "modelFamily") },
      sourceRegistry: registryEntry ? { sourceId: text(registryEntry, "sourceId"), portalUrl: text(registryEntry, "portalUrl"), exactVariantAuthorityCapacity: text(registryEntry, "exactVariantAuthorityCapacity"), status: text(registryEntry, "status") } : null,
      candidateAssertionCount: assertions.length,
      exactPromotedAssertionCount: exactPromotions.length,
      unresolvedExactApplicabilityCount: assertions.length - exactPromotions.length,
      candidateLocators: assertions.map((assertion) => ({ assertionId: text(assertion, "assertionId"), featureCode: text(assertion, "featureCode"), physicalPdfPage: Number(record(assertion.provenance).physicalPdfPage), sectionHeading: text(record(assertion.provenance), "sectionHeading"), conditionalEquipment: record(assertion.applicability).conditionalEquipment === true })),
      reasonCodes: reasons,
      before: item ? { exactManualAssertionCount: 0, ownerManual: "UNKNOWN_UNRESOLVED", advisor: "PARTIAL", comparison: "PARTIAL" } : { exactManualAssertionCount: null, ownerManual: "TARGET_NOT_IN_CATALOG", advisor: "NOT_APPLICABLE", comparison: "NOT_APPLICABLE" },
      after: item ? { exactManualAssertionCount: exactPromotions.length, ownerManual: exactPromotions.length ? "EXACT_TR_VERIFIED" : "UNKNOWN_UNRESOLVED", advisor: "PARTIAL", comparison: "PARTIAL" } : { exactManualAssertionCount: null, ownerManual: "TARGET_NOT_IN_CATALOG", advisor: "NOT_APPLICABLE", comparison: "NOT_APPLICABLE" },
    };
  });
  if (dispositionRows.length !== 8 || new Set(dispositionRows.map((item) => item.requestedExactVariantId)).size !== 8) throw new Error("PILOT_TARGET_CARDINALITY_MISMATCH");

  const decisions = variants.flatMap((variant) => variant.decisions as Json[]);
  const exact = decisions.filter((decision) => text(decision, "decision") === "EXACT_VARIANT_VERIFIED");
  const unresolved = decisions.filter((decision) => text(decision, "decision") === "RESEARCHED_INCONCLUSIVE");
  const exactVariantIds = new Set(exact.map((decision) => text(decision, "exactVariantId")));
  const resultCore = {
    schemaVersion: "4.1.0-exact-tr-pilot.1",
    releaseVersion: RELEASE,
    generatedAt: GENERATED_AT,
    catalogRelease: CATALOG_RELEASE,
    catalogFingerprint: CATALOG_FINGERPRINT,
    parentRelease: { path: BASELINE_PATH, sha256: sha256(await readFile(path.join(ROOT, BASELINE_PATH))) },
    authorityPolicy: "OWNER_MANUAL_EXACT_TR_BRIDGE_V4_FAIL_CLOSED",
    promotionBoundary: "EXACT_MANUAL_KNOWLEDGE_READ_ONLY_L9_NO_L1_L8_OR_DECISION_AUTHORITY",
    sourceBindings: {
      pilotAssertions: { path: PILOT_PATH, sha256: sha256(await readFile(path.join(ROOT, PILOT_PATH))) },
      sourceRegistry: { path: REGISTRY_PATH, sha256: sha256(await readFile(path.join(ROOT, REGISTRY_PATH))) },
      catalog: { path: CATALOG_PATH, sha256: sha256(await readFile(path.join(ROOT, CATALOG_PATH))) },
      equipmentEvidence: { path: EQUIPMENT_PATH, release: text(equipment, "releaseVersion"), sha256: sha256(await readFile(path.join(ROOT, EQUIPMENT_PATH))) },
    },
    variants,
  };
  const result = { ...resultCore, contentSha256: sha256(canonicalJson(resultCore)) };
  const pilotDispositions = { schemaVersion: "OWNER_MANUAL_EXACT_TR_PILOT_DISPOSITIONS/v1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, requestedTargetCount: 8, dispositions: dispositionRows };
  const report = {
    schemaVersion: "OWNER_MANUAL_EXACT_TR_PILOT_REPORT/v1",
    releaseVersion: RELEASE,
    generatedAt: GENERATED_AT,
    verdict: "PARTIAL",
    catalogRelease: CATALOG_RELEASE,
    catalogFingerprint: CATALOG_FINGERPRINT,
    counts: {
      requestedTargets: 8,
      validCatalogTargets: dispositionRows.filter((item) => item.catalogIdentity).length,
      invalidTargetIds: dispositionRows.filter((item) => !item.catalogIdentity).length,
      candidateAssertionsReviewed: dispositionRows.reduce((sum, item) => sum + item.candidateAssertionCount, 0),
      acceptedExactAssertions: exact.length,
      acceptedPositiveExactAssertions: exact.filter((item) => text(item, "polarity") === "POSITIVE").length,
      acceptedNegativeExactAssertions: exact.filter((item) => text(item, "polarity") === "NEGATIVE").length,
      familyOnlyAssertions: dispositionRows.reduce((sum, item) => sum + item.unresolvedExactApplicabilityCount, 0),
      unresolvedExactApplicabilityAssertions: dispositionRows.reduce((sum, item) => sum + item.unresolvedExactApplicabilityCount, 0),
      rejectedAssertions: 0,
      conflicts: 0,
      globalExactVariantsBefore: 0,
      globalExactVariantsAfter: exactVariantIds.size,
      globalExactAssertionsBefore: 0,
      globalExactAssertionsAfter: exact.length,
      globalUnresolvedDecisionsAfter: unresolved.length,
      advisorReadyVariantsBefore: 0,
      advisorReadyVariantsAfter: 0,
      comparisonReadyVariantsBefore: 0,
      comparisonReadyVariantsAfter: 0,
    },
    exactVariantIds: [...exactVariantIds].sort(),
    perTarget: dispositionRows.map(({ requestedExactVariantId, requestedLabel, disposition, candidateAssertionCount, exactPromotedAssertionCount, unresolvedExactApplicabilityCount, reasonCodes, before, after }) => ({ requestedExactVariantId, requestedLabel, disposition, candidateAssertionCount, exactPromotedAssertionCount, unresolvedExactApplicabilityCount, reasonCodes, before, after })),
    compatibility: { xpyCatalog: "XPY_CATALOG/v0.1", runtime: "UNCHANGED", semanticAuthority: "UNCHANGED", domainPack: "CARS_CURRENT_COMPATIBLE", catalogSelectionBehavior: "UNCHANGED", yAuthorization: "UNCHANGED" },
    decisionNeutrality: { l1GovernedPromotionsEmitted: 0, l8GovernedPromotionsEmitted: 0, filtering: false, ranking: false, questionGeneration: false, activation: false, productionPointerChanged: false },
    limitations: ["Seven requested IDs exist in catalog v0.55.4; the supplied SEAL U EV ID does not and was not silently corrected.", "Only DOLPHIN Comfort MY2025 has a checksum-bound exact Türkiye trim bridge in the bounded repository inputs.", "The other manual assertions remain conditional family capability and unresolved for exact trim/body/powertrain applicability."],
    nextBoundedWorkUnit: { workUnitId: "WU-XPY-CARS-EQUIPMENT-EVIDENCE-BATCH-01", objective: "Acquire and independently review exact Türkiye trim equipment/configurator bindings for the six valid unresolved pilot variants plus the corrected catalog SEAL U EV identity, then rerun the same fail-closed bridge." },
  };

  await mkdir(OUT, { recursive: true });
  await writeCanonical("exact-tr-bridge-decisions.json", result);
  await writeCanonical("pilot-dispositions.json", pilotDispositions);
  await writeCanonical("coverage-report.json", report);
  const files = await Promise.all(["exact-tr-bridge-decisions.json", "pilot-dispositions.json", "coverage-report.json"].map(async (name) => ({ path: name, sha256: sha256(await readFile(path.join(OUT, name))) })));
  await writeCanonical("manifest.json", { schemaVersion: "OWNER_MANUAL_EXACT_TR_PILOT_MANIFEST/v1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, files, historicalFilesOverwritten: false, activationPerformed: false, productionPointerChanged: false, decisionEngineEffect: "ZERO" });
  console.log(`${RELEASE}: ${exactVariantIds.size}/549 exact variants, ${exact.length} exact assertions, ${unresolved.length} unresolved decisions`);
}

void main();
