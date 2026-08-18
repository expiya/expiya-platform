import type {
  EquipmentAssociationObservation,
  EquipmentAssociationOwnerApprovalEvent,
  ReviewedEquipmentAssociationMaterialization,
  ReviewedEquipmentTrimLinkMaterialization,
} from "@/types/equipmentEvidence";

export const REVIEWED_ASSOCIATION_POLICY_VERSION = "1.0.0";
const FORBIDDEN_ASSOCIATION_KEYS = ["availabilityStatus", "provisionMode", "projectionAuthority", "rankingScore", "filterAuthority", "userFacingConfirmedFactAuthority"] as const;

export function validateReviewedAssociationMaterialization(item: ReviewedEquipmentAssociationMaterialization): string[] {
  const record = item as unknown as Record<string, unknown>, issues: string[] = [];
  if (item.materializationType !== "REVIEWED_EQUIPMENT_ASSOCIATION") issues.push("ASSOCIATION_MATERIALIZATION_TYPE_INVALID");
  if (item.observationType !== "LISTED_FOR_EXACT_TRIM" || item.provisionKnowledge !== "PROVISION_UNRESOLVED") issues.push("ASSOCIATION_SEMANTICS_INVALID");
  if (item.decisionUse !== "CONFIRMATION_REQUIRED" || item.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED") issues.push("ASSOCIATION_DECISION_AUTHORITY_INVALID");
  for (const key of FORBIDDEN_ASSOCIATION_KEYS) if (key in record) issues.push(`ASSOCIATION_FORBIDDEN_FIELD:${key}`);
  if (!item.exactVariantId || !item.sourceRowId || !item.semanticMappingId || !item.independentReviewEventId || !item.ownerApprovalEventId) issues.push("ASSOCIATION_TRACE_INCOMPLETE");
  return [...new Set(issues)].sort();
}

export function validateReviewedAssociationRelease(input: {
  observations: readonly EquipmentAssociationObservation[];
  approvals: readonly EquipmentAssociationOwnerApprovalEvent[];
  associations: readonly ReviewedEquipmentAssociationMaterialization[];
  trimLinks: readonly ReviewedEquipmentTrimLinkMaterialization[];
  verifiedAssertionCount: number;
  projectionCount: number;
}): string[] {
  const issues: string[] = [], approvalKeys = new Set<string>(), materializationIds = new Set<string>();
  for (const event of input.approvals) {
    const key = `${event.subjectType}:${event.subjectId}`;
    if (approvalKeys.has(key)) issues.push("DUPLICATE_OWNER_APPROVAL_EVENT");
    approvalKeys.add(key);
    if (event.actorId !== "EQUIPMENT_OWNER_001" || event.actorRole !== "EQUIPMENT_OWNER_APPROVER") issues.push("OWNER_APPROVAL_ACTOR_INVALID");
  }
  for (const item of [...input.associations, ...input.trimLinks]) {
    if (materializationIds.has(item.materializationId)) issues.push("DUPLICATE_MATERIALIZATION");
    materializationIds.add(item.materializationId);
  }
  for (const item of input.associations) issues.push(...validateReviewedAssociationMaterialization(item));
  if (input.observations.length !== 49 || input.approvals.length !== 51 || input.associations.length !== 49 || input.trimLinks.length !== 2) issues.push("RELEASE_SUBJECT_COUNTS_INVALID");
  if (input.verifiedAssertionCount !== 47 || input.projectionCount !== 47) issues.push("EXISTING_VERIFIED_EVIDENCE_DRIFT");
  const associationVariantIds = new Set(input.associations.map((item) => item.exactVariantId));
  if (associationVariantIds.size !== 2) issues.push("ASSOCIATION_COVERAGE_INVALID");
  return [...new Set(issues)].sort();
}
