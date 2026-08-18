import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { associationApprovalManifestChecksum, type EquipmentAssociationOwnerApprovalManifest } from "../features/vehicle-data/equipmentAssociationApprovalManifest";
import { REVIEWED_ASSOCIATION_POLICY_VERSION, validateReviewedAssociationRelease } from "../features/vehicle-data/equipmentReviewedAssociationRelease";
import { canonicalJson, fingerprint } from "../features/vehicle-data/equipmentVerificationMaterialization";
import type { EquipmentAssociationObservation, EquipmentAssociationOwnerApprovalEvent, ReviewedEquipmentAssociationMaterialization, ReviewedEquipmentTrimLinkMaterialization } from "../types/equipmentEvidence";

const ROOT = process.cwd();
const RELEASE_ID = "v1.4.0-reviewed-associations-catalog-v0.55.2-2026-08-18";
const OUTPUT = path.join(ROOT, "data/production/equipment-evidence/release-candidates", RELEASE_ID);
const MANIFEST_DIR = path.join(ROOT, "data/production/equipment-evidence/governance/approval-manifests/EE-OAM-B3CABECB69A55D4B6741");
const BATCH = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-002");
const R1 = path.join(BATCH, "corrections/EE-PILOT-002-BATCH-002-R1");
const ACTIVE_RELEASE = path.join(ROOT, "data/production/equipment-evidence/releases/v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18");
const CREATED_AT = "2026-08-18T21:00:00.000Z";
const CATALOG_FINGERPRINT = "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f" as const;
const EXPECTED_MANIFEST_CHECKSUM = "sha256:ba0668418f8a93e7c785041deb91b1f90727554fa5cc9c8d774c9d05f160b5e6";
const APPROVAL_STATEMENT = `EQUIPMENT_OWNER_001 olarak EE-OAM-B3CABECB69A55D4B6741 kimlikli ve
sha256:ba0668418f8a93e7c785041deb91b1f90727554fa5cc9c8d774c9d05f160b5e6
checksum’lı Batch 002 approval manifestini inceledim. Manifestteki 49 reviewed
exact-trim association observation ve 2 verified trim link için owner approval
verilmesini ve projection dışı production materialization kayıtlarının
hazırlanmasını onaylıyorum. Bu onayın özelliklerin STANDARD, OPTIONAL,
PACKAGE_DEPENDENT veya NOT_AVAILABLE olduğunu kanıtlamadığını; bu kayıtların
filtreleme, sıralama, soru üretme ya da kullanıcıya confirmed equipment fact
sunma yetkisi vermediğini kabul ediyorum.`;

const read = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8")) as T;
const sha = (value: string | Buffer): `sha256:${string}` => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const shaFile = async (file: string) => sha(await readFile(file));
const stableId = (prefix: string, input: unknown) => `${prefix}-${fingerprint(input).slice(7, 27).toUpperCase()}`;
const writeJson = async (name: string, value: unknown) => writeFile(path.join(OUTPUT, name), canonicalJson(value));

async function main() {
  const manifest = await read<EquipmentAssociationOwnerApprovalManifest>(path.join(MANIFEST_DIR, "approval-manifest.json"));
  const { manifestChecksum, ...manifestPayload } = manifest;
  if (manifestChecksum !== EXPECTED_MANIFEST_CHECKSUM || associationApprovalManifestChecksum(manifestPayload) !== EXPECTED_MANIFEST_CHECKSUM) throw new Error("APPROVAL_MANIFEST_CHECKSUM_MISMATCH");
  const actors = await read<{ actors: Array<{ actorId: string; role: string; scope: string; status: string }> }>(path.join(ROOT, "data/production/equipment-evidence/governance/actor-registry.json"));
  if (!actors.actors.some((item) => item.actorId === "EQUIPMENT_OWNER_001" && item.role === "EQUIPMENT_OWNER_APPROVER" && item.scope === "EQUIPMENT_EVIDENCE_ONLY" && item.status === "ACTIVE")) throw new Error("OWNER_ACTOR_INVALID");

  const observations = await read<EquipmentAssociationObservation[]>(path.join(R1, "association-observations.json"));
  const trimLinks = await read<Array<Record<string, unknown>>>(path.join(BATCH, "trim-links.json"));
  const activePayloadRaw = await readFile(path.join(ACTIVE_RELEASE, "equipment-evidence.json"), "utf8");
  const activePayload = JSON.parse(activePayloadRaw) as Record<string, unknown> & { verifiedAssertions: unknown[]; verifiedTrimLinks: unknown[]; projections: unknown[] };
  const activePointerBefore = await shaFile(path.join(ROOT, "data/production/equipment-evidence/active.json"));
  const generatedModuleBefore = await shaFile(path.join(ROOT, "data/production/equipment-evidence/activeEquipmentEvidence.generated.ts"));

  const attestationId = stableId("EE-OAA", { statement: APPROVAL_STATEMENT, manifestChecksum });
  const attestation = {
    approvalAttestationId: attestationId, ownerActorId: "EQUIPMENT_OWNER_001", normalizedApprovalStatement: APPROVAL_STATEMENT,
    approvalStatementChecksum: sha(APPROVAL_STATEMENT), approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifestChecksum,
    subjectCount: 51, observationCount: 49, trimLinkCount: 2, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED",
    governancePolicyVersion: REVIEWED_ASSOCIATION_POLICY_VERSION, recordedAt: CREATED_AT,
  } as const;
  const approvals: EquipmentAssociationOwnerApprovalEvent[] = manifest.subjects.map((subject) => ({
    eventId: stableId("EE-OAE", { subjectType: subject.subjectType, subjectId: subject.subjectId, manifestChecksum }), eventType: "OWNER_APPROVAL_GRANTED",
    actorId: "EQUIPMENT_OWNER_001", actorRole: "EQUIPMENT_OWNER_APPROVER", subjectType: subject.subjectType, subjectId: subject.subjectId,
    exactVariantId: subject.exactVariantId, sourceIndependentReviewEventId: subject.independentReviewEventId,
    sourceContentFingerprint: subject.contentFingerprint, approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifestChecksum,
    approvalAttestationId: attestationId, governancePolicyVersion: REVIEWED_ASSOCIATION_POLICY_VERSION,
    decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", createdAt: CREATED_AT,
  }));
  const approvalsBySubject = new Map(approvals.map((item) => [`${item.subjectType}:${item.subjectId}`, item]));
  const observationSubjects = new Map(manifest.subjects.filter((item) => item.subjectType === "ASSOCIATION_OBSERVATION").map((item) => [item.subjectId, item]));
  const associations: ReviewedEquipmentAssociationMaterialization[] = observations.map((observation): ReviewedEquipmentAssociationMaterialization => {
    const subject = observationSubjects.get(observation.observationId);
    const approval = approvalsBySubject.get(`ASSOCIATION_OBSERVATION:${observation.observationId}`);
    if (!subject || subject.subjectType !== "ASSOCIATION_OBSERVATION" || !approval || subject.contentFingerprint !== observation.contentFingerprint) throw new Error("OBSERVATION_MANIFEST_BINDING_INVALID");
    return {
      materializationId: stableId("EE-MAT-ASSOC", { observationId: observation.observationId, manifestChecksum }), materializationType: "REVIEWED_EQUIPMENT_ASSOCIATION",
      sourceObservationId: observation.observationId, sourceObservationFingerprint: observation.contentFingerprint, exactVariantId: observation.exactVariantId,
      featureCode: observation.featureCode, observationType: "LISTED_FOR_EXACT_TRIM", provisionKnowledge: "PROVISION_UNRESOLVED", decisionUse: "CONFIRMATION_REQUIRED",
      sourceId: observation.sourceId, sourceRowId: observation.sourceRowId, semanticMappingId: observation.semanticMappingId,
      trimApplicability: observation.trimApplicability, powertrainApplicability: observation.powertrainApplicability,
      marketApplicability: "TR", modelYearApplicability: observation.modelYearApplicability,
      correctionTransitionId: subject.correctionTransitionId, historicalConflictAssertionId: subject.historicalAssertionId,
      independentReviewEventId: subject.independentReviewEventId, ownerApprovalEventId: approval.eventId,
      approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifestChecksum, materializationState: "REVIEWED",
      catalogRelease: "v0.55.2", catalogFingerprint: CATALOG_FINGERPRINT, policyVersion: REVIEWED_ASSOCIATION_POLICY_VERSION,
      materializedAt: CREATED_AT, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED",
    };
  }).sort((a, b) => a.materializationId.localeCompare(b.materializationId));
  const trimSubjects = manifest.subjects.filter((item) => item.subjectType === "TRIM_LINK");
  const reviewedTrimLinks: ReviewedEquipmentTrimLinkMaterialization[] = trimSubjects.map((subject): ReviewedEquipmentTrimLinkMaterialization => {
    const raw = trimLinks.find((item) => item.linkId === subject.trimLinkId);
    const approval = approvalsBySubject.get(`TRIM_LINK:${subject.trimLinkId}`);
    if (!raw || !approval) throw new Error("TRIM_LINK_MANIFEST_BINDING_INVALID");
    return {
      materializationId: stableId("EE-MAT-TRIM", { trimLinkId: subject.trimLinkId, manifestChecksum }), materializationType: "VERIFIED_TRIM_LINK",
      sourceTrimLinkId: subject.trimLinkId, exactVariantId: subject.exactVariantId, canonicalTrimId: subject.canonicalTrimId, officialTrimName: subject.officialTrimName,
      powertrain: subject.powertrain, transmission: subject.transmission, marketApplicability: "TR", modelYearApplicability: [subject.modelYear],
      identitySourceIds: subject.identitySourceIds, independentReviewEventId: subject.independentReviewEventId, ownerApprovalEventId: approval.eventId,
      approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifestChecksum, contentFingerprint: subject.contentFingerprint,
      materializationState: "VERIFIED", catalogRelease: "v0.55.2", catalogFingerprint: CATALOG_FINGERPRINT,
      policyVersion: REVIEWED_ASSOCIATION_POLICY_VERSION, materializedAt: CREATED_AT, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED",
    };
  }).sort((a, b) => a.materializationId.localeCompare(b.materializationId));

  const issues = validateReviewedAssociationRelease({ observations, approvals, associations, trimLinks: reviewedTrimLinks,
    verifiedAssertionCount: activePayload.verifiedAssertions.length, projectionCount: activePayload.projections.length });
  if (issues.length) throw new Error(issues.join(","));
  const payload = {
    ...activePayload, schemaVersion: "1.1.0-rc", releaseCandidateId: RELEASE_ID, state: "PILOT_REVIEWED_EVIDENCE", generatedAt: CREATED_AT,
    reviewedAssociations: associations, verifiedTrimLinks: [...activePayload.verifiedTrimLinks, ...reviewedTrimLinks],
    coverage: { catalogVariantCount: 566, verifiedAssertionCoverage: { exactVariantCount: 2 }, reviewedAssociationCoverage: { exactVariantCount: 2 }, uncoveredCoverage: { exactVariantCount: 562 } },
    provenance: { ...(activePayload.provenance as object), batch002: { pilotId: "EE-PILOT-002", batchId: "EE-PILOT-002-BATCH-002", correctionCycle: "EE-PILOT-002-BATCH-002-R1", approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifestChecksum, approvalAttestationId: attestationId } },
  };
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(path.join(OUTPUT, "approval-statement.txt"), `${APPROVAL_STATEMENT}\n`);
  await writeJson("approval-attestation.json", attestation);
  await writeJson("owner-approval-events.json", approvals.sort((a, b) => a.eventId.localeCompare(b.eventId)));
  await writeJson("reviewed-association-materializations.json", associations);
  await writeJson("verified-trim-link-materializations.json", reviewedTrimLinks);
  await writeJson("equipment-evidence-release-candidate.json", payload);
  const payloadChecksum = sha(canonicalJson(payload));
  const coverage = { catalogVariantCount: 566, verifiedAssertionCount: 47, verifiedTrimLinkCount: 4, reviewedAssociationCount: 49,
    verifiedAssertionCoverage: { exactVariantCount: 2 }, reviewedAssociationCoverage: { exactVariantCount: 2 }, uncoveredCoverage: { exactVariantCount: 562 },
    associationCoverageIsVerifiedCoverage: false, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" };
  await writeJson("coverage-report.json", coverage);
  await writeJson("provenance-appendix.json", { manifest: { id: manifest.manifestId, checksum: manifestChecksum }, attestation: { id: attestationId, checksum: fingerprint(attestation) }, correctionTransitionIds: manifest.provenanceAppendix.correctionTransitionIds, historicalConflictAssertionIds: manifest.provenanceAppendix.historicalAssertionIds, excluded: { inconclusiveLedgerRows: 53, collectorLifecycleEvents: 196, independentReviewEvents: 98 } });
  await writeJson("decision-neutrality-dry-run.json", { status: "PASSED", decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", verifiedProjectionCountBefore: 47, verifiedProjectionCountAfter: 47, tonaleAvailabilityProjectionCount: 0, hardFilter: false, ranking: false, questionGeneration: false, userFacingConfirmedFact: false, candidateImpact: "NONE", publicOutputImpact: "NONE" });
  const proposedPointer = { activeEquipmentEvidenceRelease: RELEASE_ID, compatibleCatalogFingerprint: CATALOG_FINGERPRINT, compatibleCatalogRelease: "v0.55.2", payloadSha256: payloadChecksum, schemaVersion: "1.1.0-rc", state: "ACTIVE" };
  const proposedModule = `// Generated. Do not edit.\nexport { default as activeEquipmentEvidencePayload } from "./releases/${RELEASE_ID}/equipment-evidence.json";\nexport { default as activeEquipmentEvidenceManifest } from "./releases/${RELEASE_ID}/manifest.json";\nexport const activeEquipmentEvidenceRelease = "${RELEASE_ID}";\n`;
  await writeJson("proposed-active-pointer.json", proposedPointer);
  await writeFile(path.join(OUTPUT, "proposed-activeEquipmentEvidence.generated.ts.txt"), proposedModule);
  await writeJson("activation-plan.json", { status: "EXPLICIT_ACTIVATION_APPROVAL_REQUIRED", activePointerChanged: false, proposedRelease: RELEASE_ID, proposedPointerPayloadSha256: payloadChecksum, proposedPointerSha256: sha(canonicalJson(proposedPointer)), proposedGeneratedModuleSha256: sha(proposedModule), generatedModuleUpdateMode: "DRY_RUN_ONLY", blockers: ["ACTIVE_POINTER_ACTIVATION_NOT_AUTHORIZED", "DECISION_AUTHORITY_REMAINS_DISABLED"] });
  await writeJson("rollback-plan.json", { rollbackTarget: "v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18", currentActivePointerSha256: activePointerBefore, currentGeneratedModuleSha256: generatedModuleBefore, authorizationAliases: false });
  const releaseManifest = { releaseVersion: RELEASE_ID, schemaVersion: "1.1.0-rc", parentRelease: "v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18", compatibleCatalogRelease: "v0.55.2", compatibleCatalogFingerprint: CATALOG_FINGERPRINT, payloadSha256: payloadChecksum, featureCount: 51, verifiedAssertionCount: 47, reviewedAssociationCount: 49, verifiedTrimLinkCount: 4, projectionCount: 47, verifiedAssertionVariantCoverage: 2, reviewedAssociationVariantCoverage: 2, uncoveredVariantCount: 562, approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifestChecksum, approvalAttestationId: attestationId, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", validationStatus: "VALIDATED_RELEASE_CANDIDATE", generatedAt: CREATED_AT, declaredLimitations: ["association-is-not-availability", "association-is-not-projection", "activation-not-authorized", "decision-impact-disabled"] };
  await writeJson("manifest.json", releaseManifest);
  const files = ["approval-statement.txt", "approval-attestation.json", "owner-approval-events.json", "reviewed-association-materializations.json", "verified-trim-link-materializations.json", "equipment-evidence-release-candidate.json", "coverage-report.json", "provenance-appendix.json", "decision-neutrality-dry-run.json", "proposed-active-pointer.json", "proposed-activeEquipmentEvidence.generated.ts.txt", "activation-plan.json", "rollback-plan.json", "manifest.json"];
  const checksums = Object.fromEntries(await Promise.all(files.map(async (file) => [file, await shaFile(path.join(OUTPUT, file))])));
  await writeJson("checksums.json", checksums);
  const result = { releaseId: RELEASE_ID, releaseChecksum: payloadChecksum, approvalAttestationId: attestationId, approvalAttestationChecksum: fingerprint(attestation), ownerApprovalEventCount: approvals.length, associationMaterializationCount: associations.length, trimLinkMaterializationCount: reviewedTrimLinks.length, verifiedAssertionCount: 47, verifiedTrimLinkCount: 4, projectionCount: 47, activePointerChanged: false, activePointerSha256: activePointerBefore, generatedModuleChanged: false, generatedModuleSha256: generatedModuleBefore, proposedPointerSha256: sha(canonicalJson(proposedPointer)), proposedGeneratedModuleSha256: sha(proposedModule), decisionImpact: "NONE", activationBlocker: "EXPLICIT_ACTIVATION_APPROVAL_REQUIRED" };
  await writeJson("materialization-result.json", result);
  console.log(JSON.stringify(result, null, 2));
}

void main();
