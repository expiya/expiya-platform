import { createHash } from "node:crypto";

import { EQUIPMENT_FEATURE_CODES } from "@/types/equipmentEvidence";
import type { EquipmentAvailabilityStatus, EquipmentEvidenceAssertion, EquipmentEvidenceLayer, EquipmentEvidenceManifest, EquipmentProvisionMode, EquipmentReviewEvent, EquipmentTrimVariantLink } from "@/types/equipmentEvidence";
import { hasPassedSecondReview, validateEquipmentEvidenceLocator, validateResearchLedger, validateReviewEvents } from "./equipmentCollectionProtocol";

export interface EquipmentEvidenceValidationIssue { readonly code: string; readonly reference?: string }
export const equipmentEvidenceSha256 = (raw: string): `sha256:${string}` => `sha256:${createHash("sha256").update(raw).digest("hex")}`;

const validProvision: Readonly<Record<EquipmentAvailabilityStatus, EquipmentProvisionMode>> = {
  STANDARD: "INCLUDED", OPTIONAL: "FACTORY_OPTION", PACKAGE_DEPENDENT: "PACKAGE_OPTION",
  NOT_AVAILABLE: "NOT_OFFERED", UNKNOWN: "UNRESOLVED",
};

export function validateEquipmentEvidenceLayer(layer: EquipmentEvidenceLayer): readonly EquipmentEvidenceValidationIssue[] {
  const issues: EquipmentEvidenceValidationIssue[] = [];
  const definitionCodes = layer.featureDefinitions.map((item) => item.featureCode);
  if (definitionCodes.length !== EQUIPMENT_FEATURE_CODES.length || new Set(definitionCodes).size !== EQUIPMENT_FEATURE_CODES.length
    || EQUIPMENT_FEATURE_CODES.some((code) => !definitionCodes.includes(code))) issues.push({ code: "FEATURE_VOCABULARY_INCOMPLETE" });
  const ids = new Set<string>();
  for (const assertion of layer.assertions) {
    if (ids.has(assertion.assertionId)) issues.push({ code: "DUPLICATE_ASSERTION_ID", reference: assertion.assertionId });
    ids.add(assertion.assertionId);
    if (validProvision[assertion.availabilityStatus] !== assertion.provisionMode) issues.push({ code: "AVAILABILITY_PROVISION_MISMATCH", reference: assertion.assertionId });
    if (!assertion.source.sourceId || !assertion.source.artifactReference || !/^sha256:[a-f0-9]{64}$/u.test(assertion.source.artifactSha256)) issues.push({ code: "IMMUTABLE_SOURCE_PROVENANCE_INVALID", reference: assertion.assertionId });
    for (const code of validateEquipmentEvidenceLocator(assertion.locator)) issues.push({ code, reference: assertion.assertionId });
    if (assertion.sourceApplicability === "EXACT_VARIANT" && !assertion.exactVariantId) issues.push({ code: "EXACT_ASSERTION_WITHOUT_VARIANT", reference: assertion.assertionId });
    if (assertion.sourceApplicability === "EXACT_TRIM" && !assertion.canonicalTrimId) issues.push({ code: "TRIM_ASSERTION_WITHOUT_CANONICAL_ID", reference: assertion.assertionId });
    if (assertion.availabilityStatus === "PACKAGE_DEPENDENT" && (!assertion.packageName || !assertion.canonicalPackageId)) issues.push({ code: "PACKAGE_ASSERTION_WITHOUT_CANONICAL_PACKAGE", reference: assertion.assertionId });
    if (assertion.modelYearFrom && assertion.modelYearTo && assertion.modelYearFrom > assertion.modelYearTo) issues.push({ code: "INVALID_MODEL_YEAR_RANGE", reference: assertion.assertionId });
    const negative = assertion.availabilityStatus === "NOT_AVAILABLE";
    if (negative && (assertion.evidencePolarity !== "NEGATIVE" || !assertion.negativeEvidenceReason)) issues.push({ code: "NEGATIVE_EVIDENCE_JUSTIFICATION_REQUIRED", reference: assertion.assertionId });
    if (negative && !["OFFICIAL_CONFIGURATOR", "OFFICIAL_EQUIPMENT_LIST", "OFFICIAL_TECH_SPEC"].includes(assertion.source.sourceType)) issues.push({ code: "NEGATIVE_EVIDENCE_SOURCE_TOO_WEAK", reference: assertion.assertionId });
    if (!negative && assertion.negativeEvidenceReason) issues.push({ code: "NEGATIVE_EVIDENCE_FIELDS_NOT_ALLOWED", reference: assertion.assertionId });
    if (["STANDARD", "OPTIONAL", "PACKAGE_DEPENDENT"].includes(assertion.availabilityStatus) && assertion.evidencePolarity !== "POSITIVE") issues.push({ code: "POSITIVE_STATUS_POLARITY_MISMATCH", reference: assertion.assertionId });
    if (assertion.availabilityStatus === "UNKNOWN" && assertion.evidencePolarity !== "UNRESOLVED") issues.push({ code: "UNKNOWN_POLARITY_MISMATCH", reference: assertion.assertionId });
  }
  const supersededForDerivedValidation = new Set(layer.assertions.flatMap((item) => item.supersedesAssertionId ? [item.supersedesAssertionId] : []));
  for (const assertion of layer.assertions.filter((item) => item.locator.kind === "STRUCTURED_RECORD" && !supersededForDerivedValidation.has(item.assertionId))) issues.push(...validateDerivedArtifactProvenance(assertion));
  issues.push(...validateAssertionSupersessions(layer.assertions));
  for (const code of validateResearchLedger(layer.researchLedger)) issues.push({ code });
  for (const code of validateReviewEvents(layer.reviewEvents, layer.assertions)) issues.push({ code });
  for (const link of layer.trimVariantLinks) if (link.verificationState === "VERIFIED" && !hasPassedSecondReview(layer.reviewEvents, "TRIM_LINK", link.linkId)) issues.push({ code: "VERIFIED_TRIM_LINK_SECOND_REVIEW_MISSING", reference: link.linkId });
  issues.push(...validateTrimLinkSupersessions(layer.trimVariantLinks, layer.reviewEvents));
  for (const link of layer.packageVariantLinks) if (link.verificationState === "VERIFIED" && !hasPassedSecondReview(layer.reviewEvents, "PACKAGE_LINK", link.linkId)) issues.push({ code: "VERIFIED_PACKAGE_LINK_SECOND_REVIEW_MISSING", reference: link.linkId });
  const assertionsById = new Map(layer.assertions.map((item) => [item.assertionId, item]));
  for (const link of [...layer.packageVariantLinks, ...layer.trimVariantLinks]) {
    if (link.modelYearFrom > link.modelYearTo) issues.push({ code: "INVALID_LINK_MODEL_YEAR_RANGE", reference: link.linkId });
    if (link.assertionIds.some((id) => !assertionsById.has(id))) issues.push({ code: "LINK_PROVENANCE_INVALID", reference: link.linkId });
  }
  for (const link of layer.packageVariantLinks) for (const id of link.assertionIds) {
    const item = assertionsById.get(id);
    if (item && item.canonicalPackageId !== link.canonicalPackageId) issues.push({ code: "PACKAGE_LINK_IDENTITY_MISMATCH", reference: link.linkId });
  }
  for (const link of layer.packageVariantLinks.filter((item) => item.mandatoryInCanonicalVariant)) {
    const proof = link.assertionIds.map((id) => assertionsById.get(id)).find((item) => item && (item.source.sourceType === "OFFICIAL_EQUIPMENT_LIST" || item.source.sourceType === "OFFICIAL_CONFIGURATOR") && (item.locator.kind === "CONFIGURATOR_PATH" || item.locator.kind === "PDF_PAGE"));
    if (!proof) issues.push({ code: "MANDATORY_PACKAGE_STRONG_PROOF_MISSING", reference: link.linkId });
  }
  for (const link of layer.trimVariantLinks) for (const id of link.assertionIds) {
    const item = assertionsById.get(id);
    if (item && item.canonicalTrimId !== link.canonicalTrimId) issues.push({ code: "TRIM_LINK_IDENTITY_MISMATCH", reference: link.linkId });
  }
  const exactClearGroups = new Map<string, Set<EquipmentAvailabilityStatus>>();
  for (const assertion of layer.assertions.filter((item) => item.sourceApplicability === "EXACT_VARIANT" && item.exactVariantId
    && item.verificationState === "VERIFIED" && item.conflictState === "CLEAR")) {
    const key = `${assertion.exactVariantId}|${assertion.featureCode}`;
    const statuses = exactClearGroups.get(key) ?? new Set<EquipmentAvailabilityStatus>(); statuses.add(assertion.availabilityStatus); exactClearGroups.set(key, statuses);
  }
  for (const [key, statuses] of exactClearGroups) if (statuses.size > 1) issues.push({ code: "UNMARKED_ASSERTION_CONFLICT", reference: key });
  const projectionKeys = new Set<string>();
  const supersededAssertionIds = new Set(layer.assertions.flatMap((item) => item.supersedesAssertionId ? [item.supersedesAssertionId] : []));
  for (const projection of layer.projections) {
    const key = `${projection.exactVariantId}|${projection.featureCode}`;
    if (projectionKeys.has(key)) issues.push({ code: "DUPLICATE_PROJECTION", reference: key });
    projectionKeys.add(key);
    if (validProvision[projection.availabilityStatus] !== projection.provisionMode) issues.push({ code: "PROJECTION_AVAILABILITY_PROVISION_MISMATCH", reference: key });
    if (projection.assertionIds.length === 0 || projection.assertionIds.some((id) => !assertionsById.has(id))) issues.push({ code: "PROJECTION_PROVENANCE_INVALID", reference: key });
    if (projection.assertionIds.some((id) => supersededAssertionIds.has(id))) issues.push({ code: "ASSERTION_SUPERSESSION_NOT_TERMINAL", reference: key });
    if (projection.projectionAuthority !== "INSUFFICIENT" && (projection.availabilityStatus === "UNKNOWN" || projection.conflictState !== "CLEAR")) issues.push({ code: "AUTHORITATIVE_PROJECTION_NOT_CLEAR", reference: key });
  }
  return issues;
}

export function validateDerivedArtifactProvenance(assertion: EquipmentEvidenceAssertion, derivedArtifactRaw?: string): readonly EquipmentEvidenceValidationIssue[] {
  const issues: EquipmentEvidenceValidationIssue[] = [];
  if (assertion.locator.kind !== "STRUCTURED_RECORD") return issues;
  const derived = assertion.derivedArtifact;
  if (!derived) return [{ code: "STRUCTURED_LOCATOR_DERIVED_ARTIFACT_REQUIRED", reference: assertion.assertionId }];
  if (derived.parentSourceId !== assertion.source.sourceId || derived.parentArtifactReference !== assertion.source.artifactReference) issues.push({ code: "DERIVED_PARENT_SOURCE_MISMATCH", reference: assertion.assertionId });
  if (derived.parentArtifactSha256 !== assertion.source.artifactSha256) issues.push({ code: "DERIVED_PARENT_HASH_MISMATCH", reference: assertion.assertionId });
  if (!derived.extractionPolicyId || !derived.extractionPolicyVersion) issues.push({ code: "DERIVED_EXTRACTION_POLICY_MISSING", reference: assertion.assertionId });
  if (derivedArtifactRaw !== undefined && equipmentEvidenceSha256(derivedArtifactRaw) !== derived.artifactSha256) issues.push({ code: "DERIVED_ARTIFACT_HASH_MISMATCH", reference: assertion.assertionId });
  return issues;
}

export function validateAssertionSupersessions(assertions: readonly EquipmentEvidenceAssertion[]): readonly EquipmentEvidenceValidationIssue[] {
  const issues: EquipmentEvidenceValidationIssue[] = [], byId = new Map(assertions.map((item) => [item.assertionId, item])), successors = new Map<string, string[]>();
  for (const item of assertions) if (item.supersedesAssertionId) {
    if (item.supersedesAssertionId === item.assertionId) issues.push({ code: "ASSERTION_SUPERSESSION_SELF_REFERENCE", reference: item.assertionId });
    const target = byId.get(item.supersedesAssertionId);
    if (!target) issues.push({ code: "ASSERTION_SUPERSESSION_TARGET_MISSING", reference: item.assertionId });
    else if (target.exactVariantId !== item.exactVariantId || target.featureCode !== item.featureCode) issues.push({ code: "ASSERTION_SUPERSESSION_SCOPE_MISMATCH", reference: item.assertionId });
    successors.set(item.supersedesAssertionId, [...(successors.get(item.supersedesAssertionId) ?? []), item.assertionId]);
  }
  for (const [target, ids] of successors) if (ids.length > 1) issues.push({ code: "ASSERTION_MULTIPLE_ACTIVE_SUCCESSORS", reference: target });
  for (const item of assertions) {
    const seen = new Set<string>(); let cursor: EquipmentEvidenceAssertion | undefined = item;
    while (cursor?.supersedesAssertionId) { if (seen.has(cursor.assertionId)) { issues.push({ code: "ASSERTION_SUPERSESSION_CYCLE", reference: item.assertionId }); break; } seen.add(cursor.assertionId); cursor = byId.get(cursor.supersedesAssertionId); }
  }
  return issues;
}

export function validateTrimLinkSupersessions(links: readonly EquipmentTrimVariantLink[], reviewEvents: readonly EquipmentReviewEvent[] = []): readonly EquipmentEvidenceValidationIssue[] {
  const issues: EquipmentEvidenceValidationIssue[] = [], byId = new Map(links.map((item) => [item.linkId, item])), successors = new Map<string, string[]>();
  for (const item of links) if (item.supersedesTrimLinkId) {
    const target = byId.get(item.supersedesTrimLinkId);
    if (!target) issues.push({ code: "TRIM_LINK_SUPERSESSION_TARGET_MISSING", reference: item.linkId });
    else if (target.linkId === item.linkId) issues.push({ code: "TRIM_LINK_SUPERSESSION_CYCLE", reference: item.linkId });
    else if (target.exactVariantId !== item.exactVariantId || target.canonicalTrimId !== item.canonicalTrimId) issues.push({ code: "TRIM_LINK_SUPERSESSION_SCOPE_MISMATCH", reference: item.linkId });
    successors.set(item.supersedesTrimLinkId, [...(successors.get(item.supersedesTrimLinkId) ?? []), item.linkId]);
    if (item.verificationState === "VERIFIED" && !hasPassedSecondReview(reviewEvents, "TRIM_LINK", item.linkId)) issues.push({ code: "VERIFIED_TRIM_LINK_SECOND_REVIEW_MISSING", reference: item.linkId });
  }
  for (const [target, ids] of successors) if (ids.length > 1) issues.push({ code: "TRIM_LINK_MULTIPLE_ACTIVE_SUCCESSORS", reference: target });
  for (const item of links) {
    const seen = new Set<string>(); let cursor: EquipmentTrimVariantLink | undefined = item;
    while (cursor?.supersedesTrimLinkId) { if (seen.has(cursor.linkId)) { issues.push({ code: "TRIM_LINK_SUPERSESSION_CYCLE", reference: item.linkId }); break; } seen.add(cursor.linkId); cursor = byId.get(cursor.supersedesTrimLinkId); }
  }
  return issues;
}

export function validateEquipmentEvidenceCompatibility(input: { layer: EquipmentEvidenceLayer; manifest: EquipmentEvidenceManifest; rawPayload: string; catalogRelease: string; catalogFingerprint: string; catalogVariantIds: readonly string[] }): readonly EquipmentEvidenceValidationIssue[] {
  const issues = [...validateEquipmentEvidenceLayer(input.layer)];
  if (input.manifest.payloadSha256 !== equipmentEvidenceSha256(input.rawPayload)) issues.push({ code: "PAYLOAD_CHECKSUM_MISMATCH" });
  if (input.layer.releaseVersion !== input.manifest.releaseVersion) issues.push({ code: "RELEASE_MANIFEST_MISMATCH" });
  if (input.catalogRelease !== input.layer.compatibleCatalogRelease || input.catalogRelease !== input.manifest.compatibleCatalogRelease) issues.push({ code: "CATALOG_RELEASE_MISMATCH" });
  if (input.catalogFingerprint !== input.layer.compatibleCatalogFingerprint || input.catalogFingerprint !== input.manifest.compatibleCatalogFingerprint) issues.push({ code: "CATALOG_FINGERPRINT_MISMATCH" });
  const variants = new Set(input.catalogVariantIds);
  for (const assertion of input.layer.assertions) if (assertion.exactVariantId && !variants.has(assertion.exactVariantId)) issues.push({ code: "UNKNOWN_ASSERTION_VARIANT", reference: assertion.exactVariantId });
  for (const link of input.layer.packageVariantLinks) if (!variants.has(link.exactVariantId)) issues.push({ code: "UNKNOWN_PACKAGE_LINK_VARIANT", reference: link.exactVariantId });
  for (const link of input.layer.trimVariantLinks) if (!variants.has(link.exactVariantId)) issues.push({ code: "UNKNOWN_TRIM_LINK_VARIANT", reference: link.exactVariantId });
  for (const projection of input.layer.projections) if (!variants.has(projection.exactVariantId)) issues.push({ code: "UNKNOWN_PROJECTION_VARIANT", reference: projection.exactVariantId });
  const counts = input.manifest;
  if (counts.featureCount !== input.layer.featureDefinitions.length || counts.aliasCount !== input.layer.intentAliases.length
    || counts.assertionCount !== input.layer.assertions.length || counts.packageLinkCount !== input.layer.packageVariantLinks.length
    || counts.trimLinkCount !== input.layer.trimVariantLinks.length
    || counts.researchLedgerCount !== input.layer.researchLedger.length || counts.reviewEventCount !== input.layer.reviewEvents.length
    || counts.projectionCount !== input.layer.projections.length || counts.variantCoverageCount !== new Set(input.layer.projections.map((item) => item.exactVariantId)).size) issues.push({ code: "MANIFEST_COUNT_MISMATCH" });
  return issues;
}
