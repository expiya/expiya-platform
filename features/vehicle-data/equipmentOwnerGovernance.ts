import { createHash } from "node:crypto";

import { fingerprint } from "./equipmentVerificationMaterialization";

export const EQUIPMENT_OWNER_AUTHORITY_VERSION = "1.0.0";
export const EQUIPMENT_APPROVAL_MANIFEST_VERSION = "1.0.0";
export const EQUIPMENT_APPROVAL_CANONICAL_SERIALIZATION_VERSION = "CANONICAL_JSON_SORTED_KEYS_V1";

export interface EquipmentOwnerActorRecord {
  readonly actorId: string;
  readonly role: "EQUIPMENT_OWNER_APPROVER";
  readonly scope: "EQUIPMENT_EVIDENCE_ONLY";
  readonly status: "ACTIVE";
  readonly authorityVersion: string;
  readonly authorizationStatementHash: `sha256:${string}`;
  readonly authorizationRecordedAt: string;
  readonly authorizationSourceType: "EXPLICIT_PRODUCT_OWNER_DECLARATION";
  readonly allowedActions: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly revocationPolicy: "APPEND_ONLY_EVENT_REQUIRED";
  readonly identityAssurance: "REPOSITORY_PRODUCT_OWNER_GOVERNANCE_ATTESTATION_NOT_REAL_WORLD_CRYPTOGRAPHIC_IDENTITY";
}

export interface EquipmentApprovalManifestSubject {
  readonly subjectType: "ASSERTION" | "TRIM_LINK";
  readonly subjectId: string;
  readonly exactVariantId: string;
  readonly featureCode?: string;
  readonly trimIdentity?: { readonly canonicalTrimId: string; readonly officialTrimName: string };
  readonly terminalSupersessionState: "TERMINAL_NOT_SUPERSEDED";
  readonly secondReviewEventId: string;
  readonly secondReviewDisposition: "SECOND_REVIEW_PASSED";
  readonly evidenceProvenanceFingerprint: `sha256:${string}`;
  readonly availabilityStatus: string;
  readonly standardOrOptional: string;
  readonly marketApplicability: "TR";
  readonly modelYearApplicability: { readonly from: number; readonly to: number };
  readonly sourceIds: readonly string[];
  readonly contentFingerprint: `sha256:${string}`;
}

export interface EquipmentApprovalManifest {
  readonly manifestId: string;
  readonly manifestVersion: string;
  readonly pilotId: "EE-PILOT-002";
  readonly batchId: "EE-PILOT-002-BATCH-001";
  readonly correctionCycleScope: readonly string[];
  readonly catalogRelease: "v0.55.2";
  readonly catalogFingerprint: `sha256:${string}`;
  readonly subjectCount: number;
  readonly assertionCount: number;
  readonly trimLinkCount: number;
  readonly canonicalSerializationVersion: string;
  readonly generatedAt: string;
  readonly ownerActorId: string;
  readonly decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED";
  readonly subjects: readonly EquipmentApprovalManifestSubject[];
  readonly manifestChecksum: `sha256:${string}`;
}

export interface EquipmentOwnerApprovalGrantEvent {
  readonly eventId: string;
  readonly eventType: "OWNER_APPROVAL_GRANTED";
  readonly actorId: string;
  readonly actorRole: "EQUIPMENT_OWNER_APPROVER";
  readonly subjectType: "ASSERTION" | "TRIM_LINK";
  readonly subjectId: string;
  readonly exactVariantId: string;
  readonly approvalManifestId: string;
  readonly approvalManifestChecksum: `sha256:${string}`;
  readonly sourceSecondReviewEventId: string;
  readonly sourceContentFingerprint: `sha256:${string}`;
  readonly approvalAttestationId: string;
  readonly governancePolicyVersion: string;
  readonly createdAt: string;
  readonly decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED";
}

export function approvalManifestChecksum(manifest: Omit<EquipmentApprovalManifest, "manifestChecksum">): `sha256:${string}` {
  return fingerprint(manifest);
}

export function authorizationStatementHash(statement: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(statement).digest("hex")}`;
}

export function validateEquipmentOwnerRegistry(input: {
  actors: readonly EquipmentOwnerActorRecord[];
  authorizationStatements: ReadonlyMap<string, string>;
  collectorActorIds: ReadonlySet<string>;
  reviewerActorIds: ReadonlySet<string>;
}): string[] {
  const issues: string[] = [], ids = new Set<string>();
  for (const actor of input.actors) {
    if (!actor.actorId.trim()) issues.push("OWNER_ACTOR_ID_EMPTY");
    if (ids.has(actor.actorId)) issues.push("OWNER_ACTOR_ID_DUPLICATE");
    ids.add(actor.actorId);
    if (actor.scope !== "EQUIPMENT_EVIDENCE_ONLY") issues.push("OWNER_SCOPE_INVALID");
    if (input.collectorActorIds.has(actor.actorId) || input.reviewerActorIds.has(actor.actorId)) issues.push("OWNER_ACTOR_ROLE_SEPARATION_VIOLATION");
    const statement = input.authorizationStatements.get(actor.actorId);
    if (!statement || authorizationStatementHash(statement) !== actor.authorizationStatementHash) issues.push("OWNER_AUTHORIZATION_STATEMENT_HASH_MISMATCH");
  }
  return [...new Set(issues)].sort();
}

export function validateEquipmentApprovalManifest(input: {
  manifest: EquipmentApprovalManifest;
  ownerActors: readonly EquipmentOwnerActorRecord[];
  expectedCatalogFingerprint: `sha256:${string}`;
  terminalPassedSubjectIds: ReadonlySet<string>;
  supersededSubjectIds: ReadonlySet<string>;
  conflictingSubjectIds: ReadonlySet<string>;
}): string[] {
  const { manifest } = input, issues: string[] = [];
  if (!input.ownerActors.some((actor) => actor.actorId === manifest.ownerActorId && actor.status === "ACTIVE")) issues.push("OWNER_REGISTRY_BINDING_REQUIRED");
  if (manifest.catalogRelease !== "v0.55.2" || manifest.catalogFingerprint !== input.expectedCatalogFingerprint) issues.push("MANIFEST_CATALOG_MISMATCH");
  if (manifest.subjectCount !== 49 || manifest.assertionCount !== 47 || manifest.trimLinkCount !== 2 || manifest.subjects.length !== 49) issues.push("MANIFEST_SUBJECT_COUNTS_INVALID");
  const ids = new Set<string>();
  for (const subject of manifest.subjects) {
    const key = `${subject.subjectType}:${subject.subjectId}`;
    if (ids.has(key)) issues.push("MANIFEST_DUPLICATE_SUBJECT");
    ids.add(key);
    if (!input.terminalPassedSubjectIds.has(key) || subject.secondReviewDisposition !== "SECOND_REVIEW_PASSED") issues.push("MANIFEST_SECOND_REVIEW_PASSED_REQUIRED");
    if (input.supersededSubjectIds.has(key)) issues.push("MANIFEST_SUPERSEDED_SUBJECT_FORBIDDEN");
    if (input.conflictingSubjectIds.has(key)) issues.push("MANIFEST_CONFLICT_SUBJECT_FORBIDDEN");
    if (!subject.evidenceProvenanceFingerprint || !subject.contentFingerprint || subject.sourceIds.length === 0) issues.push("MANIFEST_FINGERPRINT_OR_SOURCE_REQUIRED");
  }
  const counts = manifest.subjects.filter((subject) => subject.subjectType === "ASSERTION").reduce<Record<string, number>>((result, subject) => ({ ...result, [subject.exactVariantId]: (result[subject.exactVariantId] ?? 0) + 1 }), {});
  if (counts["5a64b246-3b05-52b6-9f24-b8f52ccc2305"] !== 23 || counts["1a3cc01d-3bfa-56f3-817f-4cc77e723ef8"] !== 24) issues.push("MANIFEST_POWERTRAIN_DISTRIBUTION_INVALID");
  const { manifestChecksum, ...payload } = manifest;
  if (approvalManifestChecksum(payload) !== manifestChecksum) issues.push("MANIFEST_CHECKSUM_MISMATCH");
  return [...new Set(issues)].sort();
}

export function validateOwnerApprovalGrantEvents(input: {
  events: readonly EquipmentOwnerApprovalGrantEvent[];
  manifest: EquipmentApprovalManifest;
  ownerActor: EquipmentOwnerActorRecord | undefined;
}): string[] {
  const issues: string[] = [], seen = new Set<string>();
  const subjects = new Map(input.manifest.subjects.map((subject) => [`${subject.subjectType}:${subject.subjectId}`, subject]));
  if (!input.ownerActor || input.ownerActor.status !== "ACTIVE" || input.ownerActor.scope !== "EQUIPMENT_EVIDENCE_ONLY") issues.push("OWNER_REGISTRY_BINDING_REQUIRED");
  for (const event of input.events) {
    const key = `${event.subjectType}:${event.subjectId}`, subject = subjects.get(key);
    if (seen.has(key)) issues.push("DUPLICATE_OWNER_APPROVAL_EVENT");
    seen.add(key);
    if (!subject || event.approvalManifestId !== input.manifest.manifestId || event.approvalManifestChecksum !== input.manifest.manifestChecksum) issues.push("OWNER_APPROVAL_MANIFEST_SCOPE_MISMATCH");
    if (event.actorId !== input.ownerActor?.actorId || event.actorRole !== "EQUIPMENT_OWNER_APPROVER") issues.push("OWNER_APPROVAL_ACTOR_INVALID");
    if (subject && (event.sourceSecondReviewEventId !== subject.secondReviewEventId || event.sourceContentFingerprint !== subject.contentFingerprint)) issues.push("OWNER_APPROVAL_REVIEW_OR_CONTENT_MISMATCH");
  }
  if (input.events.length !== input.manifest.subjectCount || seen.size !== input.manifest.subjectCount) issues.push("OWNER_APPROVAL_EVENT_COMPLETENESS_INVALID");
  return [...new Set(issues)].sort();
}
