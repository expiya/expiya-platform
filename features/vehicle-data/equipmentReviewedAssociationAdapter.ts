import type { EquipmentFeatureCode, EquipmentVerificationMaterialization, EquipmentVerifiedTrimLinkMaterialization, ReviewedEquipmentAssociationMaterialization, ReviewedEquipmentTrimLinkMaterialization } from "@/types/equipmentEvidence";
import { validateReviewedAssociationMaterialization } from "./equipmentReviewedAssociationRelease";

export type EquipmentReviewedAssociationCandidate = {
  readonly schemaVersion: "1.1.0-rc" | "1.2.0-rc";
  readonly releaseCandidateId: string;
  readonly state: "PILOT_REVIEWED_EVIDENCE" | "PILOT_VERIFIED_DATA";
  readonly generatedAt: string;
  readonly compatibleCatalogRelease: `v${number}.${number}.${number}`;
  readonly compatibleCatalogFingerprint: `sha256:${string}`;
  readonly decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED";
  readonly featureDefinitions: readonly import("@/types/equipmentEvidence").EquipmentFeatureDefinition[];
  readonly intentAliases: readonly import("@/types/equipmentEvidence").EquipmentIntentAlias[];
  readonly verifiedAssertions: readonly EquipmentVerificationMaterialization[];
  readonly reviewedAssociations: readonly ReviewedEquipmentAssociationMaterialization[];
  readonly verifiedTrimLinks: readonly (EquipmentVerifiedTrimLinkMaterialization | ReviewedEquipmentTrimLinkMaterialization)[];
  readonly projections: readonly unknown[];
  readonly coverage?: {
    readonly verifiedAssertionCoverage?: { readonly exactVariantCount: number };
    readonly reviewedAssociationOnlyCoverage?: { readonly exactVariantCount: number };
    readonly uncoveredCoverage?: { readonly exactVariantCount: number };
    readonly catalogVariantCount?: number;
  };
};

export function parseEquipmentReviewedAssociationCandidate(input: unknown): EquipmentReviewedAssociationCandidate {
  if (!input || typeof input !== "object") throw new Error("REVIEWED_ASSOCIATION_CANDIDATE_INVALID");
  const value = input as Partial<EquipmentReviewedAssociationCandidate>;
  if (!["1.1.0-rc", "1.2.0-rc"].includes(value.schemaVersion ?? "") || !["PILOT_REVIEWED_EVIDENCE", "PILOT_VERIFIED_DATA"].includes(value.state ?? "") || value.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED") throw new Error("REVIEWED_ASSOCIATION_CANDIDATE_HEADER_INVALID");
  if (!Array.isArray(value.verifiedAssertions) || !Array.isArray(value.reviewedAssociations) || !Array.isArray(value.verifiedTrimLinks) || !Array.isArray(value.projections)) throw new Error("REVIEWED_ASSOCIATION_CANDIDATE_COLLECTIONS_INVALID");
  const issues = value.reviewedAssociations.flatMap(validateReviewedAssociationMaterialization);
  if (issues.length) throw new Error([...new Set(issues)].sort().join(","));
  return value as EquipmentReviewedAssociationCandidate;
}

export const getVerifiedEquipmentAssertions = (candidate: EquipmentReviewedAssociationCandidate, exactVariantId?: string) =>
  candidate.verifiedAssertions.filter((item) => !exactVariantId || item.exactVariantId === exactVariantId);

export const getReviewedEquipmentAssociations = (candidate: EquipmentReviewedAssociationCandidate, input?: { exactVariantId?: string; featureCode?: EquipmentFeatureCode }) =>
  candidate.reviewedAssociations.filter((item) => (!input?.exactVariantId || item.exactVariantId === input.exactVariantId) && (!input?.featureCode || item.featureCode === input.featureCode));

export const getVerifiedEquipmentTrimLinks = (candidate: EquipmentReviewedAssociationCandidate, exactVariantId?: string) =>
  candidate.verifiedTrimLinks.filter((item) => !exactVariantId || item.exactVariantId === exactVariantId);
