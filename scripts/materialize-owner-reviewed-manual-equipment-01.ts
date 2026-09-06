import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateEquipmentOwnerRegistry, authorizationStatementHash, type EquipmentOwnerActorRecord } from "../features/vehicle-data/equipmentOwnerGovernance";
import { exactEquipmentOwnerManifestChecksum, exactEquipmentProposalFingerprint, validateExactEquipmentOwnerReview, EXACT_EQUIPMENT_OWNER_REVIEW_POLICY_VERSION, type ExactEquipmentOwnerDecision, type ExactEquipmentOwnerManifest } from "../features/vehicle-data/exactEquipmentOwnerReview";
import type { ExactEquipmentAssociationProposal, ExactEquipmentCatalogIdentity } from "../features/vehicle-data/exactEquipmentAssociationProposal";
import { canonicalJson } from "../features/vehicle-data/ownerManualEvidence";
import { validateExactTrManualPromotion, type ExactTrManualPromotion } from "../features/vehicle-data/ownerManualExactTrPromotion";

const ROOT = process.cwd();
const GENERATED_AT = "2026-09-04T15:00:00.000Z";
const CATALOG_RELEASE = "v0.55.4";
const CATALOG_FINGERPRINT = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9" as const;
const PROPOSAL_RELEASE = "v4.2.0-equipment-evidence-batch-01";
const MANUAL_RELEASE = "v4.3.0-equipment-owner-review-01";
const EQUIPMENT_RELEASE = "v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04";
const PROPOSAL_BASE = `data/research/owner-manual-evidence-v4/releases/${PROPOSAL_RELEASE}`;
const MANUAL_OUT_RELATIVE = `data/research/owner-manual-evidence-v4/releases/${MANUAL_RELEASE}`;
const MANUAL_OUT = path.join(ROOT, MANUAL_OUT_RELATIVE);
const EQUIPMENT_OUT_RELATIVE = `data/production/equipment-evidence/releases/${EQUIPMENT_RELEASE}`;
const EQUIPMENT_OUT = path.join(ROOT, EQUIPMENT_OUT_RELATIVE);
const GOVERNANCE_ID = "EE-OAM-OWNER-MANUAL-BRIDGE-01";
const GOVERNANCE_OUT_RELATIVE = `data/production/equipment-evidence/governance/approval-manifests/${GOVERNANCE_ID}`;
const GOVERNANCE_OUT = path.join(ROOT, GOVERNANCE_OUT_RELATIVE);
const ACTIVE_EQUIPMENT_PATH = "data/production/equipment-evidence/releases/v1.5.5-catalog-v0.55.4-2026-08-20/equipment-evidence.json";
const ACTIVE_EQUIPMENT_POINTER = "data/production/equipment-evidence/active.json";
const CATALOG_PATH = "data/production/catalog/releases/v0.55.4/catalog.json";
const PILOT_PATH = "data/research/owner-manual-evidence-v4/pilot-assertions.json";
const ACTOR_REGISTRY_PATH = "data/production/equipment-evidence/governance/actor-registry.json";
const ACTOR_ATTESTATION_PATH = "data/production/equipment-evidence/governance/attestations/EQUIPMENT_OWNER_001-v1.txt";

type Json = Record<string, unknown>;
const readJson = async <T>(relative: string): Promise<T> => JSON.parse(await readFile(path.join(ROOT, relative), "utf8")) as T;
const sha256 = (value: string | Buffer): `sha256:${string}` => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stableId = (prefix: string, ...parts: string[]) => `${prefix}-${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 20).toUpperCase()}`;
const record = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const value = (subject: unknown, key: string): unknown => record(record(subject)[key]).value;
const text = (subject: unknown, key: string): string => String(record(subject)[key] ?? "");
const writeCanonical = async (base: string, name: string, value: unknown) => writeFile(path.join(base, name), `${canonicalJson(value)}\n`, "utf8");
const ALLOWED_DOMAINS = ["bydauto.com.tr", "toyota.com.tr", "togg.com.tr", "hyundai.com", "dmassets.hyundai.com"];

const MANUAL_SOURCE_BY_TARGET: Record<string, string> = {
  "11382bb9-bf71-52bf-9d0b-33befe86da7e": "OM-ART-BYD-SEAL-U-EV-TR", "4c22cb31-e980-4dc8-8525-c47363783d96": "OM-ART-TOYOTA-YARIS-HEV-2026-TR", "733e13d4-f0d1-5ad0-9eac-a158d23e58c7": "OM-ART-TOGG-T10X-TR", "8332f9df-5df5-5626-9d5f-22fbed616a56": "OM-ART-HYUNDAI-INSTER-2025-TR", "cf63bfb6-d503-5669-9799-6593f4b3f96b": "OM-ART-TOYOTA-HILUX-2024-TR", "a6c5b4df-f0ce-5dd6-aa9a-3dcd770f6e0b": "OM-ART-TOGG-T10F-TR", "17059c89-031e-542a-90dd-83be8c972960": "OM-ART-TOYOTA-COROLLA-HB-2026-TR",
};
const LABEL_BY_TARGET: Record<string, string> = { "11382bb9-bf71-52bf-9d0b-33befe86da7e": "BYD SEAL U EV", "4c22cb31-e980-4dc8-8525-c47363783d96": "Toyota Yaris", "733e13d4-f0d1-5ad0-9eac-a158d23e58c7": "Togg T10X", "8332f9df-5df5-5626-9d5f-22fbed616a56": "Hyundai INSTER", "cf63bfb6-d503-5669-9799-6593f4b3f96b": "Toyota Hilux", "a6c5b4df-f0ce-5dd6-aa9a-3dcd770f6e0b": "Togg T10F", "17059c89-031e-542a-90dd-83be8c972960": "Toyota Corolla Hatchback" };

function catalogIdentity(item: Json): ExactEquipmentCatalogIdentity {
  const variant = record(item.variant);
  return { exactVariantId: text(variant, "id"), market: "TR", modelYear: Number(value(variant, "modelYear")), trim: String(value(variant, "trim") ?? ""), body: String(value(variant, "bodyStyle") ?? ""), powertrain: String(value(record(variant.powertrain), "fuelType") ?? "") };
}

async function main(): Promise<void> {
  const [proposalPayload, proposalManifest, parentManual, activeEquipment, catalog, pilot, registry] = await Promise.all([
    readJson<{ proposals: ExactEquipmentAssociationProposal[] }>(`${PROPOSAL_BASE}/exact-equipment-association-proposals.json`), readJson<{ files: Array<{ path: string; sha256: string }> }>(`${PROPOSAL_BASE}/manifest.json`), readJson<Json>(`${PROPOSAL_BASE}/exact-tr-bridge-decisions.json`), readJson<Json>(ACTIVE_EQUIPMENT_PATH), readJson<{ records: Json[] }>(CATALOG_PATH), readJson<{ artifacts: Json[]; assertions: Json[] }>(PILOT_PATH), readJson<{ actors: EquipmentOwnerActorRecord[] }>(ACTOR_REGISTRY_PATH),
  ]);
  const actorStatement = await readFile(path.join(ROOT, ACTOR_ATTESTATION_PATH), "utf8");
  const actor = registry.actors.find((item) => item.actorId === "EQUIPMENT_OWNER_001");
  const registryIssues = validateEquipmentOwnerRegistry({ actors: registry.actors, authorizationStatements: new Map([["EQUIPMENT_OWNER_001", actorStatement]]), collectorActorIds: new Set(["ACTOR-COLLECTOR-CODEX-CATALOG-001"]), reviewerActorIds: new Set(["ACTOR-REVIEWER-CODEX-EQUIPMENT-001"]) });
  if (registryIssues.length || !actor || actor.authorizationStatementHash !== authorizationStatementHash(actorStatement)) throw new Error(`OWNER_REGISTRY_INVALID:${registryIssues.join(",")}`);
  const proposals = [...proposalPayload.proposals].sort((a, b) => a.proposalId.localeCompare(b.proposalId));
  if (proposals.length !== 14) throw new Error("PROPOSAL_CARDINALITY_MISMATCH");
  const catalogById = new Map(catalog.records.map((item) => [text(record(item.variant), "id"), item]));
  const identities = new Map(proposals.map((proposal) => [proposal.exactVariantId, catalogIdentity(catalogById.get(proposal.exactVariantId)!)]));
  const artifactDigests = new Map<string, string>();
  for (const proposal of proposals) artifactDigests.set(proposal.source.artifactReference, sha256(await readFile(path.join(ROOT, proposal.source.artifactReference))));
  const proposalReleaseDigest = sha256(await readFile(path.join(ROOT, `${PROPOSAL_BASE}/exact-equipment-association-proposals.json`)));
  const manifestCore = { manifestId: GOVERNANCE_ID, policyVersion: EXACT_EQUIPMENT_OWNER_REVIEW_POLICY_VERSION, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, parentProposalRelease: PROPOSAL_RELEASE, ownerActorId: "EQUIPMENT_OWNER_001", generatedAt: GENERATED_AT, subjectCount: proposals.length, subjects: proposals.map((proposal) => ({ proposalId: proposal.proposalId, exactVariantId: proposal.exactVariantId, featureCode: proposal.featureCode, proposalFingerprint: exactEquipmentProposalFingerprint(proposal), sourceArtifactSha256: proposal.source.artifactSha256 as `sha256:${string}`, independentReviewEventId: proposal.independentReview.eventId })) } as const;
  const manifest: ExactEquipmentOwnerManifest = { ...manifestCore, manifestChecksum: exactEquipmentOwnerManifestChecksum(manifestCore) };
  const decisions: ExactEquipmentOwnerDecision[] = proposals.map((proposal) => {
    const hilux = proposal.exactVariantId === "cf63bfb6-d503-5669-9799-6593f4b3f96b";
    return { eventId: stableId("EE-OAE", manifest.manifestChecksum, proposal.proposalId, "APPROVED"), eventType: "OWNER_PROPOSAL_DISPOSITION_RECORDED", action: "APPROVED", proposalId: proposal.proposalId, exactVariantId: proposal.exactVariantId, featureCode: proposal.featureCode, proposalFingerprint: exactEquipmentProposalFingerprint(proposal), sourceArtifactSha256: proposal.source.artifactSha256 as `sha256:${string}`, independentReviewEventId: proposal.independentReview.eventId, actorId: "EQUIPMENT_OWNER_001", actorRole: "EQUIPMENT_OWNER_APPROVER", approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifest.manifestChecksum, policyVersion: EXACT_EQUIPMENT_OWNER_REVIEW_POLICY_VERSION, reviewedAt: GENERATED_AT, reasonCodes: hilux ? ["EXACT_MATRIX_CELL_ALL_EQUIPMENT_GATES_PASSED", "CATALOG_PRIMARY_FUEL_DIESEL", "MHEV_SOURCE_LIMITATION_RETAINED", "MANUAL_MODEL_YEAR_GATE_EVALUATED_SEPARATELY"] : ["EXACT_MATRIX_CELL_ALL_EQUIPMENT_GATES_PASSED", "SOURCE_REVIEW_AND_IDENTITY_BINDINGS_MATCH"], limitations: hilux ? ["Approval establishes exact equipment presence for the MY2026 Invincible configuration; it does not bridge the MY2024 owner manual."] : ["Equipment approval is evidence-only and grants no Y selection, filtering, ranking, or authorization authority."], decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" };
  });
  const reviewIssues = validateExactEquipmentOwnerReview({ actor, manifest, proposals, identities, decisions, artifactDigests, allowedDomains: ALLOWED_DOMAINS });
  if (reviewIssues.length) throw new Error(`OWNER_REVIEW_INVALID:${reviewIssues.join(",")}`);
  const eventByProposal = new Map(decisions.map((item) => [item.proposalId, item]));

  const existingAssertions = (Array.isArray(activeEquipment.verifiedAssertions) ? activeEquipment.verifiedAssertions : []) as Json[];
  const materializations = proposals.map((proposal) => {
    const event = eventByProposal.get(proposal.proposalId)!;
    return { materializationId: stableId("EE-MAT", proposal.proposalId, event.eventId), materializationType: "VERIFIED_EQUIPMENT_ASSERTION", sourceAssertionId: proposal.proposalId, sourceAssertionFingerprint: exactEquipmentProposalFingerprint(proposal), exactVariantId: proposal.exactVariantId, featureCode: proposal.featureCode, availabilityStatus: proposal.availabilityStatus, standardOrOptional: proposal.availabilityStatus, marketApplicability: "TR", modelYearApplicability: { from: proposal.applicability.modelYear, to: proposal.applicability.modelYear }, terminalSupersessionChain: [proposal.proposalId], secondReviewEventId: proposal.independentReview.eventId, ownerApprovalEventId: event.eventId, approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifest.manifestChecksum, rawSourceReferences: [{ sourceId: proposal.source.sourceId, artifactReference: proposal.source.artifactReference, artifactSha256: proposal.source.artifactSha256 }], derivedArtifactReferences: [], semanticMappingId: stableId("EE-MAP", proposal.featureCode), confidence: "HIGH", verificationState: "VERIFIED", catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, policyVersion: EXACT_EQUIPMENT_OWNER_REVIEW_POLICY_VERSION, materializedAt: GENERATED_AT, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" };
  }).sort((a, b) => a.materializationId.localeCompare(b.materializationId));
  const materializationIds = new Set(materializations.map((item) => item.materializationId));
  if (materializationIds.size !== 14) throw new Error("DUPLICATE_MATERIALIZATION");
  const projections = materializations.map((item) => ({ assertionMaterializationId: item.materializationId, exactVariantId: item.exactVariantId, featureCode: item.featureCode, availabilityStatus: item.availabilityStatus, standardOrOptional: item.standardOrOptional, projectionType: "EXACT_VARIANT_VERIFIED", familyInheritance: false, crossPowertrainPropagation: false, evidenceReinterpretation: false, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" }));
  const allAssertions = [...existingAssertions, ...materializations];
  const existingAssociations = (Array.isArray(activeEquipment.reviewedAssociations) ? activeEquipment.reviewedAssociations : []) as Json[];
  const verifiedIds = [...new Set(allAssertions.map((item) => text(item, "exactVariantId")))].sort();
  const associationIds = [...new Set(existingAssociations.map((item) => text(item, "exactVariantId")))].filter((id) => !verifiedIds.includes(id)).sort();
  const coveredIds = [...new Set([...verifiedIds, ...associationIds])].sort();
  const equipmentPayloadCore = { ...activeEquipment, schemaVersion: "1.3.0", releaseVersion: EQUIPMENT_RELEASE, releaseCandidateId: EQUIPMENT_RELEASE, state: "PILOT_VERIFIED_DATA", generatedAt: GENERATED_AT, verifiedAssertions: allAssertions, projections: [...((Array.isArray(activeEquipment.projections) ? activeEquipment.projections : []) as Json[]), ...projections], coverage: { catalogVariantCount: 549, verifiedAssertionCoverage: { exactVariantCount: verifiedIds.length, exactVariantIds: verifiedIds }, reviewedAssociationOnlyCoverage: { exactVariantCount: associationIds.length, exactVariantIds: associationIds }, uncoveredCoverage: { exactVariantCount: 549 - coveredIds.length }, coveredUniqueExactVariantCount: coveredIds.length, coverageDerivation: "PINNED_COMPATIBLE_CATALOG_SET_DIFFERENCE_V1", compatibleCatalogSnapshotSha256: CATALOG_FINGERPRINT, authorityTiersAreDistinct: true, syntheticUnknownAssertionCount: 0 }, provenance: { ...record(activeEquipment.provenance), ownerManualBridge01: { proposalRelease: PROPOSAL_RELEASE, proposalReleaseDigest, approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifest.manifestChecksum, ownerActorId: actor.actorId, ownerDecisionEventIds: decisions.map((item) => item.eventId) } }, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", decisionControls: { hardFilter: false, hardFilterAfterConfirmation: false, softRanking: false, questionGeneration: false, userFacingExplanation: false, candidateResurrection: "FORBIDDEN", candidateElimination: "FORBIDDEN", offerOrderingImpact: "NONE" } };
  const equipmentPayloadSha256 = sha256(canonicalJson(equipmentPayloadCore));

  const assertionsBySource = new Map<string, Json[]>();
  for (const assertion of pilot.assertions) assertionsBySource.set(text(assertion, "sourceId"), [...(assertionsBySource.get(text(assertion, "sourceId")) ?? []), assertion]);
  const promotionSafeIds = new Set(["11382bb9-bf71-52bf-9d0b-33befe86da7e", "4c22cb31-e980-4dc8-8525-c47363783d96", "8332f9df-5df5-5626-9d5f-22fbed616a56"]);
  const proposalByPair = new Map(proposals.map((item) => [`${item.exactVariantId}|${item.featureCode}`, item]));
  const promotions = new Map<string, ExactTrManualPromotion>();
  for (const exactVariantId of promotionSafeIds) {
    const manualSourceId = MANUAL_SOURCE_BY_TARGET[exactVariantId]!;
    const targetIdentity = identities.get(exactVariantId)!;
    for (const assertion of assertionsBySource.get(manualSourceId) ?? []) {
      const featureCode = text(assertion, "featureCode"), proposal = proposalByPair.get(`${exactVariantId}|${featureCode}`);
      if (!proposal) continue;
      const event = eventByProposal.get(proposal.proposalId)!;
      const provenance = record(assertion.provenance), applicability = record(assertion.applicability);
      const promotion: ExactTrManualPromotion = { authorityLevel: "EXACT_VARIANT_VERIFIED", exactVariantId, featureCode, polarity: "POSITIVE", confidence: "HIGH", status: "VERIFIED", applicability: targetIdentity, manualSource: { sourceId: manualSourceId, artifactReference: text(provenance, "rawArtifactReference"), artifactSha256: text(provenance, "rawSha256"), language: "tr", market: "TR", observedAt: text(applicability, "observedAt"), locator: { physicalPdfPage: Number(provenance.physicalPdfPage), sectionHeading: text(provenance, "sectionHeading") } }, exactApplicabilitySource: { sourceId: proposal.source.sourceId, sourceType: "OFFICIAL_EQUIPMENT_MATRIX", artifactReference: proposal.source.artifactReference, originalUrl: proposal.source.originalUrl, artifactSha256: proposal.source.artifactSha256, observedAt: proposal.source.capturedAt, reviewedAt: event.reviewedAt, locator: proposal.source.locator }, reviewerAuthority: { ownerActorId: event.actorId, ownerApprovalEventId: event.eventId, independentReviewerActorId: proposal.independentReview.reviewerActorId, independentReviewEventId: proposal.independentReview.eventId, approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifest.manifestChecksum }, limitations: ["Read-only L9 owner-manual knowledge; no L1, L8, Y selection, filtering, ranking, question generation, or authorization authority.", "Conditional manual wording is not used as equipment proof; exact presence comes only from the approved Türkiye equipment matrix cell."], manualConditionalEquipment: applicability.conditionalEquipment === true, familyInheritance: false, conditionalPromotedToStandard: false, missingMentionTreatedAsNegative: false };
      const issues = validateExactTrManualPromotion(promotion, targetIdentity);
      if (issues.length) throw new Error(`MANUAL_PROMOTION_INVALID:${exactVariantId}:${featureCode}:${issues.join(",")}`);
      promotions.set(`${exactVariantId}|${featureCode}`, promotion);
    }
  }
  if (promotions.size !== 10) throw new Error(`EXPECTED_10_MANUAL_PROMOTIONS_GOT_${promotions.size}`);
  const parentVariants = (Array.isArray(parentManual.variants) ? parentManual.variants : []) as Json[];
  const variants = parentVariants.map((variant) => {
    const exactVariantId = text(variant, "exactVariantId");
    if (!LABEL_BY_TARGET[exactVariantId]) return variant;
    const decisionsForVariant = (Array.isArray(variant.decisions) ? variant.decisions : []).map((decision) => {
      const featureCode = text(decision, "featureCode"), promotion = promotions.get(`${exactVariantId}|${featureCode}`), proposal = proposalByPair.get(`${exactVariantId}|${featureCode}`);
      if (!promotion) return { ...decision, equipmentOwnerReview01: proposal ? { ownerDecision: "APPROVED", ownerApprovalEventId: eventByProposal.get(proposal.proposalId)!.eventId, manualPromotionEligibility: "BLOCKED_MANUAL_MODEL_YEAR_MISMATCH" } : { ownerDecision: "NOT_APPLICABLE_NO_PROPOSAL", manualPromotionEligibility: "UNRESOLVED" } };
      return { decisionId: stableId("OM-TR-OWNER", exactVariantId, featureCode), exactVariantId, featureCode, decision: "EXACT_VARIANT_VERIFIED", authorityLevel: "EXACT_VARIANT_VERIFIED", normalizedValue: true, polarity: "POSITIVE", availabilityStatus: "STANDARD", confidence: "HIGH", status: "VERIFIED", conflictState: "CLEAR", observedAt: promotion.exactApplicabilitySource.observedAt, reviewedAt: promotion.exactApplicabilitySource.reviewedAt, applicability: promotion.applicability, manualSource: promotion.manualSource, exactApplicabilitySource: promotion.exactApplicabilitySource, reviewerAuthority: promotion.reviewerAuthority, limitations: promotion.limitations, manualConditionalEquipment: promotion.manualConditionalEquipment, familyInheritance: false, conditionalPromotedToStandard: false, missingMentionTreatedAsNegative: false, decisionAuthority: "READ_ONLY_L9_NONE_FOR_L1_L8_Y_OR_CANDIDATE_SELECTION" };
    });
    const exactCount = decisionsForVariant.filter((item) => text(item, "decision") === "EXACT_VARIANT_VERIFIED").length;
    return { ...variant, bridgeStatus: exactCount ? "PARTIALLY_EXACT_VARIANT_VERIFIED" : text(variant, "bridgeStatus"), decisions: decisionsForVariant };
  });
  const allManualDecisions = variants.flatMap((variant) => variant.decisions as Json[]), exactManual = allManualDecisions.filter((item) => text(item, "decision") === "EXACT_VARIANT_VERIFIED");
  const parentExact = parentVariants.flatMap((variant) => variant.decisions as Json[]).filter((item) => text(item, "decision") === "EXACT_VARIANT_VERIFIED");
  const manualCore = { schemaVersion: "4.3.0-equipment-owner-review.1", releaseVersion: MANUAL_RELEASE, generatedAt: GENERATED_AT, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, parentRelease: { path: `${PROPOSAL_BASE}/exact-tr-bridge-decisions.json`, sha256: sha256(await readFile(path.join(ROOT, `${PROPOSAL_BASE}/exact-tr-bridge-decisions.json`))) }, equipmentEvidenceRelease: { path: `${EQUIPMENT_OUT_RELATIVE}/equipment-evidence.json`, release: EQUIPMENT_RELEASE, sha256: equipmentPayloadSha256 }, ownerAuthority: { actorId: actor.actorId, manifestId: manifest.manifestId, manifestChecksum: manifest.manifestChecksum, policyVersion: EXACT_EQUIPMENT_OWNER_REVIEW_POLICY_VERSION }, authorityPolicy: "OWNER_APPROVED_EXACT_TR_EQUIPMENT_TO_READ_ONLY_MANUAL_L9_V1", promotionBoundary: "READ_ONLY_L9_NO_L1_L8_Y_SELECTION_OR_AUTHORIZATION_AUTHORITY", variants };
  const manualBridge = { ...manualCore, contentSha256: sha256(canonicalJson(manualCore)) };
  const dispositions = Object.keys(LABEL_BY_TARGET).map((targetId) => {
    const candidateCount = (assertionsBySource.get(MANUAL_SOURCE_BY_TARGET[targetId]!) ?? []).length, approvedAssociationCount = proposals.filter((item) => item.exactVariantId === targetId).length, promoted = [...promotions.values()].filter((item) => item.exactVariantId === targetId).length;
    const blockers = targetId === "cf63bfb6-d503-5669-9799-6593f4b3f96b" ? ["CATALOG_MY2026_MANUAL_ARTIFACT_MY2024", "CROSS_MODEL_YEAR_PROMOTION_FORBIDDEN"] : targetId === "17059c89-031e-542a-90dd-83be8c972960" ? ["CURRENT_MATRIX_PASSION_X_PACK_DOES_NOT_MATCH_CATALOG_PASSION", "SIBLING_TRIM_INFERENCE_FORBIDDEN"] : approvedAssociationCount === 0 ? ["NO_EXPLICIT_MATRIX_CELL_FOR_MANUAL_FEATURES"] : [];
    return { targetId, label: LABEL_BY_TARGET[targetId], ownerDecisions: approvedAssociationCount, approvedEquipmentAssociations: approvedAssociationCount, rejectedEquipmentAssociations: 0, deferredEquipmentAssociations: 0, candidateManualAssertions: candidateCount, exactManualPromotionsBefore: 0, exactManualPromotionsAfter: promoted, unresolvedManualAssertionsAfter: candidateCount - promoted, ownerManual: promoted ? "EXACT_TR_VERIFIED" : "UNKNOWN_UNRESOLVED", advisorReadProjection: "PARTIAL", comparisonEvidenceProjection: "PARTIAL", blockers };
  });
  const report = { schemaVersion: "OWNER_MANUAL_EQUIPMENT_OWNER_REVIEW_REPORT/v1", releaseVersion: MANUAL_RELEASE, generatedAt: GENERATED_AT, verdict: "IMPLEMENTED", counts: { globalExactVariantsBefore: new Set(parentExact.map((item) => text(item, "exactVariantId"))).size, globalExactVariantsAfter: new Set(exactManual.map((item) => text(item, "exactVariantId"))).size, globalExactAssertionsBefore: parentExact.length, globalExactAssertionsAfter: exactManual.length }, ownerDecisionCounts: { total: decisions.length, approved: decisions.filter((item) => item.action === "APPROVED").length, rejected: 0, deferred: 0 }, equipmentCoverage: { verifiedExactVariantsBefore: 4, verifiedExactVariantsAfter: verifiedIds.length, associationOnlyExactVariantsBefore: 2, associationOnlyExactVariantsAfter: associationIds.length, coveredUniqueExactVariantsBefore: 6, coveredUniqueExactVariantsAfter: coveredIds.length, verifiedAssertionsBefore: existingAssertions.length, verifiedAssertionsAfter: allAssertions.length }, manualCoverage: { exactTrVariantsBefore: new Set(parentExact.map((item) => text(item, "exactVariantId"))).size, exactTrVariantsAfter: new Set(exactManual.map((item) => text(item, "exactVariantId"))).size, exactTrAssertionsBefore: parentExact.length, exactTrAssertionsAfter: exactManual.length, promotedThisWorkUnit: promotions.size }, readiness: { advisorReadyVariantsBefore: 0, advisorReadyVariantsAfter: 0, comparisonReadyVariantsBefore: 0, comparisonReadyVariantsAfter: 0, reason: "Daily-life coverage and comparison Domain Pack gates remain partial; equipment/manual evidence is read-only and does not alter Y." }, perTarget: dispositions, decisionNeutrality: { activeEquipmentPointerChanged: false, runtimeChanged: false, ySelectionChanged: false, yAuthorizationChanged: false, filteringChanged: false, rankingChanged: false, questionGenerationChanged: false, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" }, blockers: ["Hilux exact equipment is approved, but MY2024 manual cannot bridge to MY2026.", "Corolla Hatchback catalog Passion trim cannot inherit current Passion X-Pack matrix cells.", "T10X/T10F package names do not establish package contents."], nextBoundedWorkUnit: { workUnitId: "WU-XPY-CARS-DAILY-LIFE-HIGH-MATERIALITY-01", objective: "Close the highest-materiality technical-to-daily-life mapping gaps for the newly evidence-covered exact variants without broadening equipment/manual authority into Y." } };

  await Promise.all([mkdir(EQUIPMENT_OUT, { recursive: true }), mkdir(MANUAL_OUT, { recursive: true }), mkdir(GOVERNANCE_OUT, { recursive: true })]);
  const approvalStatement = `EQUIPMENT_OWNER_001 authorizes the 14 individually reviewed APPROVED dispositions in ${GOVERNANCE_ID}; this grants evidence materialization only and no Y selection, filtering, ranking, question-generation, activation, or runtime authority.`;
  const attestation = { attestationId: stableId("EE-OAA", manifest.manifestChecksum, approvalStatement), actorId: actor.actorId, actorRole: actor.role, scope: actor.scope, registeredAuthorityVersion: actor.authorityVersion, policyVersion: EXACT_EQUIPMENT_OWNER_REVIEW_POLICY_VERSION, authorizationSource: "USER_GOVERNANCE_AUTHORIZATION_RECEIVED_WU_XPY_CARS_EQUIPMENT_PROPOSAL_OWNER_REVIEW_01", statement: approvalStatement, statementSha256: sha256(approvalStatement), manifestId: manifest.manifestId, manifestChecksum: manifest.manifestChecksum, subjectCount: decisions.length, recordedAt: GENERATED_AT, identityAssurance: actor.identityAssurance };
  await writeCanonical(GOVERNANCE_OUT, "approval-manifest.json", manifest);
  await writeCanonical(GOVERNANCE_OUT, "approval-attestation.json", attestation);
  await writeCanonical(GOVERNANCE_OUT, "owner-decision-events.json", decisions);
  await writeCanonical(GOVERNANCE_OUT, "review-result.json", { verdict: "IMPLEMENTED", total: 14, approved: 14, rejected: 0, deferred: 0, ownerActorId: actor.actorId, policyVersion: EXACT_EQUIPMENT_OWNER_REVIEW_POLICY_VERSION, reviewedAt: GENERATED_AT, proposalReleaseDigest });
  const governanceFiles = ["approval-manifest.json", "approval-attestation.json", "owner-decision-events.json", "review-result.json"];
  await writeCanonical(GOVERNANCE_OUT, "checksums.json", Object.fromEntries(await Promise.all(governanceFiles.map(async (name) => [name, sha256(await readFile(path.join(GOVERNANCE_OUT, name)))]))));

  await writeCanonical(EQUIPMENT_OUT, "equipment-evidence.json", equipmentPayloadCore);
  await writeCanonical(EQUIPMENT_OUT, "owner-decision-events.json", decisions);
  await writeCanonical(EQUIPMENT_OUT, "verified-association-materializations.json", materializations);
  await writeCanonical(EQUIPMENT_OUT, "decision-neutrality.json", { activePointerPath: ACTIVE_EQUIPMENT_POINTER, activePointerSha256: sha256(await readFile(path.join(ROOT, ACTIVE_EQUIPMENT_POINTER))), activationPerformed: false, runtimeChanged: false, ySelectionImpact: "ZERO", yAuthorizationImpact: "ZERO", decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" });
  const equipmentFiles = ["equipment-evidence.json", "owner-decision-events.json", "verified-association-materializations.json", "decision-neutrality.json"];
  await writeCanonical(EQUIPMENT_OUT, "manifest.json", { schemaVersion: "1.3.0", releaseVersion: EQUIPMENT_RELEASE, parentRelease: "v1.5.5-catalog-v0.55.4-2026-08-20", compatibleCatalogRelease: CATALOG_RELEASE, compatibleCatalogFingerprint: CATALOG_FINGERPRINT, payloadSha256: sha256(await readFile(path.join(EQUIPMENT_OUT, "equipment-evidence.json"))), approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifest.manifestChecksum, ownerDecisionCounts: { total: 14, approved: 14, rejected: 0, deferred: 0 }, verifiedAssertionCount: allAssertions.length, verifiedAssertionVariantCoverage: verifiedIds.length, reviewedAssociationCount: existingAssociations.length, reviewedAssociationOnlyVariantCoverage: associationIds.length, coveredUniqueExactVariantCount: coveredIds.length, projectionCount: ((Array.isArray(activeEquipment.projections) ? activeEquipment.projections : []) as Json[]).length + projections.length, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", activationPerformed: false, generatedAt: GENERATED_AT, files: await Promise.all(equipmentFiles.map(async (name) => ({ path: name, sha256: sha256(await readFile(path.join(EQUIPMENT_OUT, name))) }))) });

  await writeCanonical(MANUAL_OUT, "exact-tr-bridge-decisions.json", manualBridge);
  await writeCanonical(MANUAL_OUT, "target-dispositions.json", { schemaVersion: "OWNER_MANUAL_OWNER_REVIEW_DISPOSITIONS/v1", releaseVersion: MANUAL_RELEASE, generatedAt: GENERATED_AT, dispositions });
  await writeCanonical(MANUAL_OUT, "coverage-report.json", report);
  await writeCanonical(MANUAL_OUT, "owner-authority-binding.json", { actor: { actorId: actor.actorId, role: actor.role, scope: actor.scope, status: actor.status, authorityVersion: actor.authorityVersion }, actorRegistryPath: ACTOR_REGISTRY_PATH, actorRegistrySha256: sha256(await readFile(path.join(ROOT, ACTOR_REGISTRY_PATH))), actorAttestationPath: ACTOR_ATTESTATION_PATH, actorAttestationSha256: sha256(await readFile(path.join(ROOT, ACTOR_ATTESTATION_PATH)),), governanceManifestPath: `${GOVERNANCE_OUT_RELATIVE}/approval-manifest.json`, governanceManifestChecksum: manifest.manifestChecksum, ownerDecisionEventsPath: `${GOVERNANCE_OUT_RELATIVE}/owner-decision-events.json`, ownerDecisionCount: decisions.length });
  const manualFiles = ["exact-tr-bridge-decisions.json", "target-dispositions.json", "coverage-report.json", "owner-authority-binding.json"];
  await writeCanonical(MANUAL_OUT, "manifest.json", { schemaVersion: "OWNER_MANUAL_EQUIPMENT_OWNER_REVIEW_MANIFEST/v1", releaseVersion: MANUAL_RELEASE, parentRelease: PROPOSAL_RELEASE, generatedAt: GENERATED_AT, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, equipmentEvidenceRelease: EQUIPMENT_RELEASE, ownerApprovalManifestId: manifest.manifestId, ownerApprovalManifestChecksum: manifest.manifestChecksum, files: await Promise.all(manualFiles.map(async (name) => ({ path: name, sha256: sha256(await readFile(path.join(MANUAL_OUT, name))) }))), historicalFilesOverwritten: false, activationPerformed: false, productionPointerChanged: false, yDecisionEffect: "ZERO" });
  if (proposalManifest.files.length !== 15) throw new Error("PARENT_PROPOSAL_MANIFEST_DRIFT");
  console.log(`${EQUIPMENT_RELEASE}: 14/14 approved and materialized; verified variants ${verifiedIds.length}/549. ${MANUAL_RELEASE}: manual assertions ${parentExact.length}->${exactManual.length}, variants 1->${new Set(exactManual.map((item) => text(item, "exactVariantId"))).size}.`);
}

void main();
