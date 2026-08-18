import { fingerprint } from "./equipmentVerificationMaterialization";

export type EquipmentAssociationApprovalSubject = {
  readonly subjectType: "ASSOCIATION_OBSERVATION";
  readonly subjectId: string;
  readonly observationId: string;
  readonly exactVariantId: string;
  readonly featureCode: string;
  readonly observationType: "LISTED_FOR_EXACT_TRIM";
  readonly provisionKnowledge: "PROVISION_UNRESOLVED";
  readonly decisionUse: "CONFIRMATION_REQUIRED";
  readonly sourceId: string;
  readonly sourceRowId: string;
  readonly semanticMappingId: string;
  readonly trimApplicability: string;
  readonly powertrainApplicability: string;
  readonly modelYearApplicability: readonly number[];
  readonly marketApplicability: "TR";
  readonly independentReviewEventId: string;
  readonly correctionTransitionId: string;
  readonly historicalAssertionId: string;
  readonly contentFingerprint: `sha256:${string}`;
  readonly evidenceFingerprint: `sha256:${string}`;
};

export type EquipmentAssociationApprovalTrimSubject = {
  readonly subjectType: "TRIM_LINK";
  readonly subjectId: string;
  readonly trimLinkId: string;
  readonly exactVariantId: string;
  readonly canonicalTrimId: string;
  readonly officialTrimName: string;
  readonly powertrain: string;
  readonly transmission: string;
  readonly modelYear: number;
  readonly market: "TR";
  readonly identitySourceIds: readonly string[];
  readonly independentReviewEventId: string;
  readonly contentFingerprint: `sha256:${string}`;
  readonly evidenceFingerprint: `sha256:${string}`;
};

export type EquipmentAssociationOwnerApprovalManifest = {
  readonly manifestId: string;
  readonly pilotId: "EE-PILOT-002";
  readonly batchId: "EE-PILOT-002-BATCH-002";
  readonly correctionCycle: "EE-PILOT-002-BATCH-002-R1";
  readonly catalogRelease: "v0.55.2";
  readonly catalogFingerprint: `sha256:${string}`;
  readonly r1Checksum: `sha256:${string}`;
  readonly subjectCount: 51;
  readonly observationCount: 49;
  readonly trimLinkCount: 2;
  readonly canonicalSerializationVersion: "CANONICAL_JSON_SORTED_KEYS_V1";
  readonly generatedAt: string;
  readonly ownerActorId: "EQUIPMENT_OWNER_001";
  readonly decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED";
  readonly subjects: readonly (EquipmentAssociationApprovalSubject | EquipmentAssociationApprovalTrimSubject)[];
  readonly provenanceAppendix: { readonly correctionTransitionIds: readonly string[]; readonly historicalAssertionIds: readonly string[]; readonly inconclusiveLedgerRowCount: 53; readonly collectorLifecycleEventCount: 196; readonly independentReviewEventCount: 98 };
  readonly manifestChecksum: `sha256:${string}`;
};

export function associationApprovalManifestChecksum(manifest: Omit<EquipmentAssociationOwnerApprovalManifest, "manifestChecksum">): `sha256:${string}` {
  return fingerprint(manifest);
}

export function validateAssociationApprovalManifest(input: {
  manifest: EquipmentAssociationOwnerApprovalManifest;
  passedSubjectKeys: ReadonlySet<string>;
  ownerActorValid: boolean;
  expectedCatalogFingerprint: string;
  expectedR1Checksum: string;
}): string[] {
  const issues: string[] = [], seen = new Set<string>();
  const { manifest } = input;
  if (!input.ownerActorValid || manifest.ownerActorId !== "EQUIPMENT_OWNER_001") issues.push("OWNER_ACTOR_INVALID");
  if (manifest.catalogRelease !== "v0.55.2" || manifest.catalogFingerprint !== input.expectedCatalogFingerprint) issues.push("MANIFEST_CATALOG_MISMATCH");
  if (manifest.r1Checksum !== input.expectedR1Checksum) issues.push("MANIFEST_R1_CHECKSUM_MISMATCH");
  if (manifest.subjectCount !== 51 || manifest.observationCount !== 49 || manifest.trimLinkCount !== 2 || manifest.subjects.length !== 51) issues.push("MANIFEST_SUBJECT_COUNTS_INVALID");
  for (const subject of manifest.subjects) {
    const key = `${subject.subjectType}:${subject.subjectId}`;
    if (seen.has(key)) issues.push("MANIFEST_DUPLICATE_SUBJECT");
    seen.add(key);
    if (!input.passedSubjectKeys.has(key)) issues.push("MANIFEST_SECOND_REVIEW_PASSED_REQUIRED");
    if (subject.subjectType === "ASSOCIATION_OBSERVATION") {
      const serialized = subject as unknown as Record<string, unknown>;
      if (subject.observationType !== "LISTED_FOR_EXACT_TRIM" || subject.provisionKnowledge !== "PROVISION_UNRESOLVED") issues.push("MANIFEST_OBSERVATION_SEMANTICS_INVALID");
      if ("availabilityStatus" in serialized || "provisionMode" in serialized || "standardOrOptional" in serialized) issues.push("MANIFEST_AVAILABILITY_SEMANTICS_FORBIDDEN");
      if (subject.decisionUse !== "CONFIRMATION_REQUIRED") issues.push("MANIFEST_DECISION_AUTHORITY_FORBIDDEN");
    }
    if (!subject.contentFingerprint || !subject.evidenceFingerprint) issues.push("MANIFEST_FINGERPRINT_REQUIRED");
  }
  if (manifest.subjects.some((subject) => !["ASSOCIATION_OBSERVATION", "TRIM_LINK"].includes(subject.subjectType))) issues.push("MANIFEST_SUBJECT_TYPE_FORBIDDEN");
  const { manifestChecksum, ...payload } = manifest;
  if (associationApprovalManifestChecksum(payload) !== manifestChecksum) issues.push("MANIFEST_CHECKSUM_MISMATCH");
  return [...new Set(issues)].sort();
}
