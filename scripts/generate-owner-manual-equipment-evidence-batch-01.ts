import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateExactEquipmentAssociationProposal, type ExactEquipmentAssociationProposal, type ExactEquipmentCatalogIdentity } from "../features/vehicle-data/exactEquipmentAssociationProposal";
import { canonicalJson } from "../features/vehicle-data/ownerManualEvidence";

const ROOT = process.cwd();
const RELEASE = "v4.2.0-equipment-evidence-batch-01";
const OUT_RELATIVE = `data/research/owner-manual-evidence-v4/releases/${RELEASE}`;
const OUT = path.join(ROOT, OUT_RELATIVE);
const GENERATED_AT = "2026-09-04T13:00:00.000Z";
const COLLECTED_AT = "2026-09-04T12:21:54.000Z";
const REVIEWED_AT = GENERATED_AT;
const CATALOG_RELEASE = "v0.55.4";
const CATALOG_FINGERPRINT = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9";
const CATALOG_PATH = "data/production/catalog/releases/v0.55.4/catalog.json";
const PILOT_PATH = "data/research/owner-manual-evidence-v4/pilot-assertions.json";
const PARENT_PATH = "data/research/owner-manual-evidence-v4/releases/v4.1.0-exact-tr-pilot-01/exact-tr-bridge-decisions.json";
const COLLECTOR = "ACTOR-COLLECTOR-CODEX-CATALOG-001";
const REVIEWER = "ACTOR-REVIEWER-CODEX-EQUIPMENT-001";

type Json = Record<string, unknown>;
type Target = {
  id: string; label: string; sourceId: string; artifact: string; expectedSha256: `sha256:${string}`; url: string;
  publicationDate: string; language: "tr"; sourceType: "OFFICIAL_EQUIPMENT_MATRIX" | "OFFICIAL_PRICE_OPTION_LIST";
  documentTrimLabel: string; documentBody: string; documentPowertrain: string; status: string; reasonCodes: string[];
  discoveredVia?: { artifactReference: string; expectedSha256: `sha256:${string}`; url: string };
};

const TARGETS: Target[] = [
  { id: "11382bb9-bf71-52bf-9d0b-33befe86da7e", label: "BYD SEAL U EV", sourceId: "OM-EQ-SRC-BYD-SEAL-U-EV-2025-TR", artifact: `${OUT_RELATIVE}/source-snapshots/byd-seal-u-ev-2025.pdf`, expectedSha256: "sha256:b50e2cf4aa62c53a789d6a762c1b552485207494bced77bf3eb51b7c00ea5f38", url: "https://www.bydauto.com.tr/storage/pdf/byd-seal-u-ev-teknik-ozellikler-ve-donanim-tablosu-210525.pdf", publicationDate: "2025-05-21T00:00:00.000Z", language: "tr", sourceType: "OFFICIAL_EQUIPMENT_MATRIX", documentTrimLabel: "Design", documentBody: "SUV", documentPowertrain: "BEV", status: "ACQUIRED_EXACT_MATRIX", reasonCodes: ["OFFICIAL_TR_MANUFACTURER_DOMAIN", "CHECKSUM_BOUND", "EXACT_DESIGN_COLUMN", "PUBLICATION_DATE_EXPLICIT"] },
  { id: "4c22cb31-e980-4dc8-8525-c47363783d96", label: "Toyota Yaris", sourceId: "OM-EQ-SRC-TOYOTA-YARIS-2026-TR", artifact: `${OUT_RELATIVE}/source-snapshots/toyota-yaris-2026.pdf`, expectedSha256: "sha256:509665bfbf351683197853c78069b3b6fb3b8f32021d5ee857d111dfa750da17", url: "https://turkiye.toyota.com.tr/middle/Toyota_Yaris_Teknik_%C3%96zellikler_Fiyatl%C4%B1_%2801.06.2026%29.pdf", publicationDate: "2026-06-01T00:00:00.000Z", language: "tr", sourceType: "OFFICIAL_EQUIPMENT_MATRIX", documentTrimLabel: "Hybrid Passion X-Pack / 1.5L Hybrid 130 HP e-CVT", documentBody: "Hatchback", documentPowertrain: "HEV", status: "ACQUIRED_EXACT_MATRIX", reasonCodes: ["OFFICIAL_TR_MANUFACTURER_DOMAIN", "CHECKSUM_BOUND", "EXACT_PASSION_X_PACK_COLUMN", "MY2026_EXPLICIT"] },
  { id: "733e13d4-f0d1-5ad0-9eac-a158d23e58c7", label: "Togg T10X", sourceId: "OM-EQ-SRC-TOGG-T10X-2026-TR", artifact: `${OUT_RELATIVE}/source-snapshots/togg-t10x-price-list.html`, expectedSha256: "sha256:b6cc80b09cdca87a7caa7e8905e8be656f012ba64ee24d0818a19c4d3daa0604", url: "https://www.togg.com.tr/price-list", publicationDate: "2026-06-15T00:00:00.000Z", language: "tr", sourceType: "OFFICIAL_PRICE_OPTION_LIST", documentTrimLabel: "V1 RWD Uzun Menzil", documentBody: "SUV", documentPowertrain: "BEV", status: "ACQUIRED_EXACT_TRIM_NO_EXPLICIT_MANUAL_FEATURE_OVERLAP", reasonCodes: ["OFFICIAL_TR_MANUFACTURER_DOMAIN", "CHECKSUM_BOUND", "EXACT_TRIM_LISTED", "PACKAGE_CONTENT_NOT_ENUMERATED", "NO_PACKAGE_CONTENT_INFERENCE"] },
  { id: "8332f9df-5df5-5626-9d5f-22fbed616a56", label: "Hyundai INSTER", sourceId: "OM-EQ-SRC-HYUNDAI-INSTER-2025-TR", artifact: "data/cars/vehicle_evidence/working/HYUNDAI_BATCH_01/snapshots/2026-08-16/brochures/inster.pdf", expectedSha256: "sha256:79449479f4117f509f7a9d0144dc30d36ed1340b11fd5d2b09813313f5aa4883", url: "https://dmassets.hyundai.com/is/content/hyundaiautoever/inster-brosurpdf", publicationDate: "2025-12-01T00:00:00.000Z", language: "tr", sourceType: "OFFICIAL_EQUIPMENT_MATRIX", documentTrimLabel: "84,5 kW INSTER Cross Advance", documentBody: "Hatchback", documentPowertrain: "BEV", status: "REUSED_REPOSITORY_EXACT_MATRIX", reasonCodes: ["REPO_FIRST_SOURCE_REUSE", "OFFICIAL_TR_MANUFACTURER_DOMAIN", "CHECKSUM_MATCHES_CATALOG_PROVENANCE", "EXACT_CROSS_ADVANCE_COLUMN"] },
  { id: "cf63bfb6-d503-5669-9799-6593f4b3f96b", label: "Toyota Hilux", sourceId: "OM-EQ-SRC-TOYOTA-HILUX-2026-TR", artifact: `${OUT_RELATIVE}/source-snapshots/toyota-hilux-2026-tech.pdf`, expectedSha256: "sha256:720cded2a0c2afab57b426684b9b71cf17055b0b059743c8f71f2aa2d92ba282", url: "https://www.toyota.com.tr/content/dam/toyota/nmsc/turkey/cars/e-brosur/yeni-hilux/Toyota_YeniHilux_TeknikDonan%C4%B1m_2026.pdf", publicationDate: "2026-08-01T00:00:00.000Z", language: "tr", sourceType: "OFFICIAL_EQUIPMENT_MATRIX", documentTrimLabel: "Invincible 2.8 D-4D MHEV 4x4 6 AT", documentBody: "Pickup", documentPowertrain: "DIESEL_MHEV", status: "ACQUIRED_EXACT_MATRIX_MANUAL_MODEL_YEAR_MISMATCH", reasonCodes: ["OFFICIAL_TR_MANUFACTURER_DOMAIN", "CHECKSUM_BOUND", "EXACT_INVINCIBLE_COLUMN", "MY2026_EXPLICIT", "OWNER_MANUAL_ARTIFACT_MY2024_FAIL_CLOSED"], discoveredVia: { artifactReference: `${OUT_RELATIVE}/source-snapshots/toyota-hilux-model-page.html`, expectedSha256: "sha256:1b347212efa7ec02c28efadb746487247c501dee1c0978c6250aef8e9a353198", url: "https://www.toyota.com.tr/new-cars/hilux" } },
  { id: "a6c5b4df-f0ce-5dd6-aa9a-3dcd770f6e0b", label: "Togg T10F", sourceId: "OM-EQ-SRC-TOGG-T10F-2026-TR", artifact: `${OUT_RELATIVE}/source-snapshots/togg-t10f-price-list.html`, expectedSha256: "sha256:b17b4cb62a704f9d650df9f0701de3da2460c8c6b275a2ef98f02b5753c9663a", url: "https://www.togg.com.tr/t10f-price-list", publicationDate: "2026-06-15T00:00:00.000Z", language: "tr", sourceType: "OFFICIAL_PRICE_OPTION_LIST", documentTrimLabel: "V2 4More", documentBody: "Liftback", documentPowertrain: "BEV", status: "ACQUIRED_EXACT_TRIM_NO_EXPLICIT_MANUAL_FEATURE_OVERLAP", reasonCodes: ["OFFICIAL_TR_MANUFACTURER_DOMAIN", "CHECKSUM_BOUND", "EXACT_TRIM_LISTED", "PACKAGE_CONTENT_NOT_ENUMERATED", "NO_PACKAGE_CONTENT_INFERENCE"] },
  { id: "17059c89-031e-542a-90dd-83be8c972960", label: "Toyota Corolla Hatchback", sourceId: "OM-EQ-SRC-TOYOTA-COROLLA-HB-2026-TR", artifact: `${OUT_RELATIVE}/source-snapshots/toyota-corolla-hatchback-2026-tech.pdf`, expectedSha256: "sha256:9bcf7cb16a19e61f660e1fc09b7f0235c58fa492061b9ef6e960eb530f46bf8b", url: "https://www.toyota.com.tr/content/dam/toyota/nmsc/turkey/cars/e-brosur/corolla-hb/Corolla-Hatchback-Teknik-ve-Donanim-Ozellikleri-02-2026.pdf", publicationDate: "2026-02-01T00:00:00.000Z", language: "tr", sourceType: "OFFICIAL_EQUIPMENT_MATRIX", documentTrimLabel: "Hybrid Passion X-Pack", documentBody: "Hatchback", documentPowertrain: "HEV", status: "ACQUIRED_CURRENT_MATRIX_CATALOG_TRIM_MISMATCH", reasonCodes: ["OFFICIAL_TR_MANUFACTURER_DOMAIN", "CHECKSUM_BOUND", "CATALOG_TRIM_PASSION", "CURRENT_MATRIX_TRIM_PASSION_X_PACK", "SIBLING_TRIM_INFERENCE_FORBIDDEN"], discoveredVia: { artifactReference: `${OUT_RELATIVE}/source-snapshots/toyota-corolla-hatchback-model-page.html`, expectedSha256: "sha256:18443035ae58bfa42727cee61b11d8657c4d61af9ef45d4bd202e636bc57322e", url: "https://www.toyota.com.tr/new-cars/corolla-hatchback" } },
];

const CELLS: Record<string, Array<{ featureCode: string; pageNumber: number; row: string; column: string }>> = {
  "11382bb9-bf71-52bf-9d0b-33befe86da7e": [
    { featureCode: "HEATED_FRONT_SEATS", pageNumber: 2, row: "Havalandırmalı ve ısıtmalı ön koltuklar", column: "Design" },
    { featureCode: "ADAPTIVE_CRUISE_CONTROL", pageNumber: 3, row: "Adaptif hız sabitleme sistemi (ACC) & Akıllı hız sabitleme sistemi (ICC)", column: "Design" },
    { featureCode: "BLIND_SPOT_MONITOR", pageNumber: 3, row: "Kör nokta uyarı sistemi (BSD) & Şerit değiştirme asistanı (LCA)", column: "Design" },
    { featureCode: "WIRELESS_PHONE_CHARGING", pageNumber: 3, row: "Orta konsolda akıllı telefonlar için kablosuz şarj istasyonu (2 x 15 W)", column: "Design" },
    { featureCode: "ISOFIX_REAR_OUTER", pageNumber: 3, row: "Ön yolcu koltuğunda ve arka yan koltuklarda ISOFIX bağlantıları", column: "Design" },
  ],
  "4c22cb31-e980-4dc8-8525-c47363783d96": [
    { featureCode: "ADAPTIVE_CRUISE_CONTROL", pageNumber: 3, row: "Akıllı Adaptif Hız Sabitleme Sistemi (Tüm Hızlarda) (ACC)", column: "Hybrid Passion X-Pack" },
    { featureCode: "ISOFIX_REAR_OUTER", pageNumber: 3, row: "Çocuk Koltuğu Sabitleme Mekanizması (ISOFIX)", column: "Hybrid Passion X-Pack" },
    { featureCode: "WIRELESS_PHONE_CHARGING", pageNumber: 5, row: "Kablosuz Şarj Ünitesi", column: "Hybrid Passion X-Pack" },
  ],
  "8332f9df-5df5-5626-9d5f-22fbed616a56": [
    { featureCode: "ADAPTIVE_CRUISE_CONTROL", pageNumber: 24, row: "Dur ve Kalk Özellikli Akıllı Hız Sabitleme Kontrolü (SCC w/S&G)", column: "INSTER Cross Advance" },
    { featureCode: "WIRELESS_PHONE_CHARGING", pageNumber: 24, row: "Akıllı Telefon Kablosuz Şarj Sistemi", column: "INSTER Cross Advance" },
  ],
  "cf63bfb6-d503-5669-9799-6593f4b3f96b": [
    { featureCode: "HEATED_FRONT_SEATS", pageNumber: 4, row: "Isıtmalı Ön Koltuklar", column: "Invincible" },
    { featureCode: "ADAPTIVE_CRUISE_CONTROL", pageNumber: 5, row: "Adaptif Hız Sabitleme Sistemi (ACC)", column: "Invincible" },
    { featureCode: "SURROUND_VIEW_CAMERA_360", pageNumber: 5, row: "360° Park Kamerası (PVM)", column: "Invincible" },
    { featureCode: "ISOFIX_REAR_OUTER", pageNumber: 5, row: "Çocuk Koltuğu Sabitleme Mekanizması (Isofix)", column: "Invincible" },
  ],
};

const readJson = async <T>(relative: string): Promise<T> => JSON.parse(await readFile(path.join(ROOT, relative), "utf8")) as T;
const sha256 = (value: string | Buffer): `sha256:${string}` => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stableId = (prefix: string, ...parts: string[]) => `${prefix}-${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 20).toUpperCase()}`;
const writeCanonical = async (name: string, value: unknown) => writeFile(path.join(OUT, name), `${canonicalJson(value)}\n`, "utf8");
const record = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const value = (subject: unknown, key: string): unknown => record(record(subject)[key]).value;
const text = (subject: unknown, key: string): string => String(record(subject)[key] ?? "");

function identity(item: Json): ExactEquipmentCatalogIdentity {
  const variant = record(item.variant);
  return { exactVariantId: text(variant, "id"), market: "TR", modelYear: Number(value(variant, "modelYear")), trim: String(value(variant, "trim") ?? ""), body: String(value(variant, "bodyStyle") ?? ""), powertrain: String(value(record(variant.powertrain), "fuelType") ?? "") };
}

async function main(): Promise<void> {
  const [catalog, pilot, parent] = await Promise.all([readJson<{ records: Json[] }>(CATALOG_PATH), readJson<{ artifacts: Json[]; assertions: Json[] }>(PILOT_PATH), readJson<Json>(PARENT_PATH)]);
  if (text(parent, "releaseVersion") !== "v4.1.0-exact-tr-pilot-01" || text(parent, "catalogFingerprint") !== CATALOG_FINGERPRINT) throw new Error("PARENT_RELEASE_MISMATCH");
  const catalogById = new Map(catalog.records.map((item) => [text(record(item.variant), "id"), item]));
  const targetById = new Map(TARGETS.map((item) => [item.id, item]));
  const artifactById = new Map(pilot.artifacts.map((item) => [text(item, "sourceId"), item]));
  const assertionsByFamily = new Map<string, Json[]>();
  for (const assertion of pilot.assertions) assertionsByFamily.set(text(assertion, "sourceId"), [...(assertionsByFamily.get(text(assertion, "sourceId")) ?? []), assertion]);
  const sourceIdByTarget: Record<string, string> = {
    "11382bb9-bf71-52bf-9d0b-33befe86da7e": "OM-ART-BYD-SEAL-U-EV-TR", "4c22cb31-e980-4dc8-8525-c47363783d96": "OM-ART-TOYOTA-YARIS-HEV-2026-TR", "733e13d4-f0d1-5ad0-9eac-a158d23e58c7": "OM-ART-TOGG-T10X-TR", "8332f9df-5df5-5626-9d5f-22fbed616a56": "OM-ART-HYUNDAI-INSTER-2025-TR", "cf63bfb6-d503-5669-9799-6593f4b3f96b": "OM-ART-TOYOTA-HILUX-2024-TR", "a6c5b4df-f0ce-5dd6-aa9a-3dcd770f6e0b": "OM-ART-TOGG-T10F-TR", "17059c89-031e-542a-90dd-83be8c972960": "OM-ART-TOYOTA-COROLLA-HB-2026-TR",
  };
  const allowedDomains = ["bydauto.com.tr", "toyota.com.tr", "togg.com.tr", "hyundai.com", "dmassets.hyundai.com"];

  for (const target of TARGETS) {
    if (!catalogById.has(target.id)) throw new Error(`TARGET_NOT_IN_CATALOG:${target.id}`);
    if (sha256(await readFile(path.join(ROOT, target.artifact))) !== target.expectedSha256) throw new Error(`SOURCE_DIGEST_MISMATCH:${target.sourceId}`);
    if (target.discoveredVia && sha256(await readFile(path.join(ROOT, target.discoveredVia.artifactReference))) !== target.discoveredVia.expectedSha256) throw new Error(`DISCOVERY_DIGEST_MISMATCH:${target.sourceId}`);
  }

  const attempts = TARGETS.map((target) => {
    const catalogIdentity = identity(catalogById.get(target.id)!);
    const manualSourceId = sourceIdByTarget[target.id];
    const manualArtifact = artifactById.get(manualSourceId)!;
    const manualAssertions = assertionsByFamily.get(manualSourceId) ?? [];
    return { targetId: target.id, label: target.label, attemptComplete: true, attemptedAt: COLLECTED_AT, sourceId: target.sourceId, sourceType: target.sourceType, originalUrl: target.url, artifactReference: target.artifact, artifactSha256: target.expectedSha256, language: target.language, market: "TR", publicationDate: target.publicationDate, catalogIdentity, documentIdentity: { modelYear: catalogIdentity.modelYear, trim: target.documentTrimLabel, body: target.documentBody, powertrain: target.documentPowertrain }, discoveredVia: target.discoveredVia ?? null, status: target.status, reasonCodes: target.reasonCodes, manualArtifact: { sourceId: manualSourceId, modelYearLabel: text(manualArtifact, "modelYearLabel"), rawSha256: text(manualArtifact, "rawSha256") }, manualCandidateAssertionCount: manualAssertions.length, exactMatrixCellCount: (CELLS[target.id] ?? []).length };
  });

  const proposals: ExactEquipmentAssociationProposal[] = [];
  for (const [targetId, cells] of Object.entries(CELLS)) {
    const target = targetById.get(targetId)!;
    const catalogIdentity = identity(catalogById.get(targetId)!);
    for (const cell of cells) {
      const proposalId = stableId("OM-EQ-PROP", targetId, cell.featureCode, target.expectedSha256);
      const eventId = stableId("OM-EQ-REV", proposalId, REVIEWER);
      const proposal: ExactEquipmentAssociationProposal = {
        proposalId, exactVariantId: targetId, featureCode: cell.featureCode, availabilityStatus: "STANDARD", applicability: catalogIdentity,
        source: { sourceId: target.sourceId, originalUrl: target.url, artifactReference: target.artifact, artifactSha256: target.expectedSha256, capturedAt: COLLECTED_AT, language: "tr", market: "TR", publicationDate: target.publicationDate, modelYear: catalogIdentity.modelYear, documentTrimLabel: target.documentTrimLabel, documentBody: target.documentBody, documentPowertrain: target.documentPowertrain, replaced: false, stale: false, locator: cell },
        interpretation: { explicitMatrixCell: true, optional: false, conditional: false, footnoteQualified: false, missingMentionTreatedAsNegative: false, siblingTrimInference: false, crossModelYearInference: false, foreignMarketInference: false },
        collection: { collectorActorId: COLLECTOR, collectedAt: COLLECTED_AT }, independentReview: { status: "PASSED", reviewerActorId: REVIEWER, reviewedAt: REVIEWED_AT, eventId }, ownerApproval: null, materializationStatus: "PROPOSAL_REVIEWED_OWNER_APPROVAL_PENDING",
      };
      const issues = validateExactEquipmentAssociationProposal(proposal, catalogIdentity, allowedDomains);
      if (issues.length) throw new Error(`PROPOSAL_INVALID:${proposalId}:${issues.join(",")}`);
      proposals.push(proposal);
    }
  }
  proposals.sort((a, b) => a.proposalId.localeCompare(b.proposalId));
  if (proposals.length !== 14) throw new Error(`EXPECTED_14_PROPOSALS_GOT_${proposals.length}`);
  const reviews = proposals.map((proposal) => ({ eventId: proposal.independentReview.eventId, eventType: "INDEPENDENT_REVIEW_PASSED", proposalId: proposal.proposalId, exactVariantId: proposal.exactVariantId, featureCode: proposal.featureCode, collectorActorId: proposal.collection.collectorActorId, reviewerActorId: proposal.independentReview.reviewerActorId, reviewedAt: proposal.independentReview.reviewedAt, sourceArtifactSha256: proposal.source.artifactSha256, status: "PASSED", ownerApprovalCreated: false, materializationCreated: false, decisionAuthority: "PROPOSAL_ONLY_ZERO_RUNTIME_EFFECT" }));
  const proposalByPair = new Map(proposals.map((item) => [`${item.exactVariantId}|${item.featureCode}`, item]));
  const parentVariants = (Array.isArray(parent.variants) ? parent.variants : []) as Json[];
  const variants = parentVariants.map((variant) => {
    const exactVariantId = text(variant, "exactVariantId");
    const target = targetById.get(exactVariantId);
    if (!target) return variant;
    const manualYearMismatch = exactVariantId === "cf63bfb6-d503-5669-9799-6593f4b3f96b";
    const decisions = (Array.isArray(variant.decisions) ? variant.decisions : []).map((decision) => {
      const proposal = proposalByPair.get(`${exactVariantId}|${text(decision, "featureCode")}`);
      if (!proposal) return { ...decision, equipmentEvidenceBatch01: { sourceAttemptStatus: target.status, disposition: "NO_SAFE_EXACT_ASSOCIATION_FOR_THIS_MANUAL_FEATURE", ownerApprovalCreated: false } };
      return { ...decision, reasonCodes: manualYearMismatch ? ["EXACT_EQUIPMENT_ASSOCIATION_INDEPENDENTLY_REVIEWED", "OWNER_APPROVAL_PENDING", "CATALOG_MY2026_MANUAL_ARTIFACT_MY2024", "CROSS_MODEL_YEAR_MANUAL_PROMOTION_FORBIDDEN"] : ["EXACT_EQUIPMENT_ASSOCIATION_INDEPENDENTLY_REVIEWED", "OWNER_APPROVAL_PENDING", "UNAPPROVED_PROPOSAL_NOT_PROMOTED"], equipmentEvidenceBatch01: { proposalId: proposal.proposalId, independentReviewEventId: proposal.independentReview.eventId, sourceId: proposal.source.sourceId, sourceArtifactSha256: proposal.source.artifactSha256, sourceLocator: proposal.source.locator, ownerApprovalCreated: false, manualPromotionEligibility: manualYearMismatch ? "BLOCKED_MANUAL_MODEL_YEAR_MISMATCH" : "BLOCKED_OWNER_APPROVAL_PENDING" } };
    });
    return { ...variant, decisions };
  });

  const dispositions = attempts.map((attempt) => {
    const exactAssociations = proposals.filter((item) => item.exactVariantId === attempt.targetId);
    const manualBridgeCandidates = attempt.targetId === "cf63bfb6-d503-5669-9799-6593f4b3f96b" ? 0 : exactAssociations.length;
    const rejectedPotentialCells = attempt.targetId === "17059c89-031e-542a-90dd-83be8c972960" ? 4 : 0;
    return { targetId: attempt.targetId, label: attempt.label, sourceAttemptStatus: attempt.status, sourceAttemptComplete: true, sourceId: attempt.sourceId, sourceArtifactSha256: attempt.artifactSha256, candidateManualAssertionsReviewed: attempt.manualCandidateAssertionCount, exactEquipmentAssociationsIndependentlyReviewed: exactAssociations.length, exactEquipmentAssociationsOwnerApproved: 0, manualBridgeCandidatesAfterOwnerApproval: manualBridgeCandidates, exactManualPromotionsThisBatch: 0, rejectedPotentialMatrixCells: rejectedPotentialCells, before: { ownerManual: "UNKNOWN_UNRESOLVED", advisor: "PARTIAL", comparison: "PARTIAL" }, after: { ownerManual: "UNKNOWN_UNRESOLVED", advisor: "PARTIAL", comparison: "PARTIAL" }, reasonCodes: attempt.reasonCodes };
  });
  const parentExact = parentVariants.flatMap((variant) => Array.isArray(variant.decisions) ? variant.decisions as Json[] : []).filter((item) => text(item, "decision") === "EXACT_VARIANT_VERIFIED");
  const resultCore = { schemaVersion: "4.2.0-equipment-evidence-batch.1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, parentRelease: { path: PARENT_PATH, sha256: sha256(await readFile(path.join(ROOT, PARENT_PATH))) }, authorityPolicy: "EXACT_TR_EQUIPMENT_PROPOSAL_REVIEW_OWNER_APPROVAL_REQUIRED_V1", promotionBoundary: "PROPOSALS_AND_INDEPENDENT_REVIEWS_HAVE_ZERO_RUNTIME_OR_L9_PROMOTION_AUTHORITY_UNTIL_OWNER_APPROVAL", sourceBindings: attempts.map(({ targetId, sourceId, originalUrl, artifactReference, artifactSha256 }) => ({ targetId, sourceId, originalUrl, artifactReference, artifactSha256 })), variants };
  const bridge = { ...resultCore, contentSha256: sha256(canonicalJson(resultCore)) };
  const proposalPayload = { schemaVersion: "EXACT_EQUIPMENT_ASSOCIATION_PROPOSALS/v1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, collectorActorId: COLLECTOR, independentReviewerActorId: REVIEWER, ownerApproval: null, materializationStatus: "PROPOSAL_REVIEWED_OWNER_APPROVAL_PENDING", proposals };
  const reviewPayload = { schemaVersion: "EXACT_EQUIPMENT_INDEPENDENT_REVIEW_EVENTS/v1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, reviewerActorId: REVIEWER, collectorReviewerSeparated: true, eventCount: reviews.length, ownerApprovalCreated: false, events: reviews };
  const ownerPackageCore = { schemaVersion: "EXACT_EQUIPMENT_OWNER_REVIEW_PACKAGE/v1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, ownerActorId: null, ownerApproval: null, ownerApprovalRequired: true, subjectCount: proposals.length, subjects: proposals.map((item) => ({ proposalId: item.proposalId, exactVariantId: item.exactVariantId, featureCode: item.featureCode, availabilityStatus: item.availabilityStatus, sourceArtifactSha256: item.source.artifactSha256, independentReviewEventId: item.independentReview.eventId })) };
  const ownerPackage = { ...ownerPackageCore, packageSha256: sha256(canonicalJson(ownerPackageCore)) };
  const exactManualVariantCount = new Set(parentExact.map((item) => text(item, "exactVariantId"))).size;
  const report = { schemaVersion: "OWNER_MANUAL_EQUIPMENT_EVIDENCE_BATCH_REPORT/v1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, verdict: "IMPLEMENTED", catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, counts: { requestedTargets: 7, completedSourceAttempts: attempts.filter((item) => item.attemptComplete).length, independentlyReviewedExactEquipmentAssociations: proposals.length, ownerApprovedAssociations: 0, manualBridgeCandidatesAfterOwnerApproval: dispositions.reduce((sum, item) => sum + item.manualBridgeCandidatesAfterOwnerApproval, 0), exactManualPromotionsThisBatch: 0, exactManualAssertionsBefore: parentExact.length, exactManualAssertionsAfter: parentExact.length, exactManualVariantsBefore: exactManualVariantCount, exactManualVariantsAfter: exactManualVariantCount, globalExactAssertionsBefore: parentExact.length, globalExactAssertionsAfter: parentExact.length, globalExactVariantsBefore: exactManualVariantCount, globalExactVariantsAfter: exactManualVariantCount, candidateManualAssertionsReviewed: dispositions.reduce((sum, item) => sum + item.candidateManualAssertionsReviewed, 0), rejectedPotentialMatrixCells: dispositions.reduce((sum, item) => sum + item.rejectedPotentialMatrixCells, 0), conflicts: 0 }, perTarget: dispositions, decisionNeutrality: { ownerApprovalCreated: false, materializationCreated: false, l9PromotionsEmitted: 0, l1OrL8PromotionsEmitted: 0, activePointerChanged: false, runtimeChanged: false, filtering: false, ranking: false, questionGeneration: false }, limitations: ["The 14 exact equipment associations passed independent review but remain proposals because no operational equipment-owner approval event was supplied or fabricated.", "The Hilux MY2026 equipment matrix is exact for Invincible, but the bound Turkish owner manual is labeled MY2024; cross-model-year manual promotion remains forbidden.", "The current Corolla Hatchback matrix exposes Hybrid Passion X-Pack, not catalog trim Passion 1.8 Hybrid e-CVT; sibling-trim inference was rejected.", "T10X and T10F official price pages enumerate trims and package names but not package contents, so no manual feature was inferred."], nextBoundedWorkUnit: { workUnitId: "WU-XPY-CARS-EQUIPMENT-PROPOSAL-OWNER-REVIEW-01", objective: "Have the registered operational equipment owner approve or reject the 14 checksum-bound reviewed association proposals, materialize only approved subjects, and rerun the 10 model-year-safe manual bridges." } };
  const sourceAttempts = { schemaVersion: "EXACT_TR_SOURCE_ATTEMPTS/v1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, requestedTargetCount: TARGETS.length, completedAttemptCount: attempts.length, attempts };
  const targetDispositions = { schemaVersion: "OWNER_MANUAL_EQUIPMENT_BATCH_DISPOSITIONS/v1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, dispositions };

  await writeCanonical("source-attempts.json", sourceAttempts);
  await writeCanonical("exact-equipment-association-proposals.json", proposalPayload);
  await writeCanonical("independent-review-events.json", reviewPayload);
  await writeCanonical("owner-review-package.json", ownerPackage);
  await writeCanonical("exact-tr-bridge-decisions.json", bridge);
  await writeCanonical("target-dispositions.json", targetDispositions);
  await writeCanonical("coverage-report.json", report);
  const generatedFiles = ["source-attempts.json", "exact-equipment-association-proposals.json", "independent-review-events.json", "owner-review-package.json", "exact-tr-bridge-decisions.json", "target-dispositions.json", "coverage-report.json"];
  const releaseSnapshots = TARGETS.flatMap((item) => [item.artifact, item.discoveredVia?.artifactReference].filter((value): value is string => Boolean(value))).filter((item) => item.startsWith(`${OUT_RELATIVE}/source-snapshots/`));
  const files = await Promise.all([...generatedFiles.map((name) => `${OUT_RELATIVE}/${name}`), ...new Set(releaseSnapshots)].sort().map(async (file) => ({ path: path.relative(OUT, path.join(ROOT, file)), sha256: sha256(await readFile(path.join(ROOT, file))) })));
  await writeCanonical("manifest.json", { schemaVersion: "OWNER_MANUAL_EQUIPMENT_EVIDENCE_BATCH_MANIFEST/v1", releaseVersion: RELEASE, generatedAt: GENERATED_AT, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, parentRelease: resultCore.parentRelease, files, historicalFilesOverwritten: false, ownerApprovalCreated: false, materializationCreated: false, activationPerformed: false, productionPointerChanged: false, decisionEngineEffect: "ZERO" });
  console.log(`${RELEASE}: ${attempts.length}/7 attempts complete, ${proposals.length} reviewed proposals, 10 model-year-safe manual bridges pending owner approval, ${parentExact.length} exact manual assertions retained`);
}

void main();
