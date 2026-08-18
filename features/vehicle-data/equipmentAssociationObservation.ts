import type { EquipmentAssociationObservation } from "@/types/equipmentEvidence";

export const EQUIPMENT_ASSOCIATION_AUTHORITY_MATRIX = [
  { evidence: "VERIFIED_STANDARD", hardFilter: "POLICY_DEPENDENT", rank: true, explanation: true, confirmation: "NOT_REQUIRED" },
  { evidence: "VERIFIED_OPTIONAL", hardFilter: false, rank: "LIMITED", explanation: "OPTIONAL_ONLY", confirmation: "STOCK_REQUIRED" },
  { evidence: "VERIFIED_PACKAGE_DEPENDENT", hardFilter: false, rank: "LIMITED", explanation: "PACKAGE_NAMED", confirmation: "PACKAGE_REQUIRED" },
  { evidence: "LISTED_FOR_EXACT_TRIM_PROVISION_UNRESOLVED", hardFilter: false, rank: false, explanation: false, confirmation: "REQUIRED" },
  { evidence: "UNKNOWN_OR_INCONCLUSIVE", hardFilter: false, rank: false, explanation: false, confirmation: "RESEARCH_REQUIRED" },
  { evidence: "VERIFIED_NOT_AVAILABLE", hardFilter: "POLICY_DEPENDENT", rank: false, explanation: true, confirmation: "NOT_REQUIRED" },
] as const;

export type EquipmentAssociationCandidateEffect = {
  readonly hardFilter: false;
  readonly rankingContribution: 0;
  readonly confirmedUserFacingFact: false;
  readonly productionProjectionEligible: false;
  readonly confirmationRequired: true;
};

export function validateEquipmentAssociationObservation(value: unknown): string[] {
  const issues: string[] = [];
  if (!value || typeof value !== "object") return ["ASSOCIATION_OBSERVATION_OBJECT_REQUIRED"];
  const item = value as Record<string, unknown>;
  if (item.observationType !== "LISTED_FOR_EXACT_TRIM") issues.push("ASSOCIATION_OBSERVATION_TYPE_INVALID");
  if (item.provisionKnowledge !== "PROVISION_UNRESOLVED") issues.push("ASSOCIATION_PROVISION_MUST_BE_UNRESOLVED");
  if ("availabilityStatus" in item) issues.push("ASSOCIATION_AVAILABILITY_STATUS_FORBIDDEN");
  if ("provisionMode" in item) issues.push("ASSOCIATION_PROVISION_MODE_FORBIDDEN");
  if (!item.exactVariantId || !item.sourceRowId || !item.semanticMappingId || !item.sourceId) issues.push("ASSOCIATION_EXACT_PROVENANCE_REQUIRED");
  if (item.decisionUse !== "EVIDENCE_ONLY" && item.decisionUse !== "CONFIRMATION_REQUIRED") issues.push("ASSOCIATION_DECISION_USE_INVALID");
  if (item.verificationState !== "PROVISIONAL" || item.reviewState !== "SECOND_REVIEW_REQUIRED") issues.push("ASSOCIATION_REVIEW_BOUNDARY_INVALID");
  return issues;
}

export function evaluateEquipmentAssociationObservation(observation: EquipmentAssociationObservation): EquipmentAssociationCandidateEffect {
  void observation;
  return { hardFilter: false, rankingContribution: 0, confirmedUserFacingFact: false, productionProjectionEligible: false, confirmationRequired: true };
}
