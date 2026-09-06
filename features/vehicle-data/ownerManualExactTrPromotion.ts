import { createHash } from "node:crypto";

export type ExactTrCatalogIdentity = {
  readonly exactVariantId: string;
  readonly market: string;
  readonly modelYear: number;
  readonly trim: string;
  readonly body: string;
  readonly powertrain: string;
};

export type ExactTrManualPromotion = {
  readonly authorityLevel: "EXACT_VARIANT_VERIFIED";
  readonly exactVariantId: string;
  readonly featureCode: string;
  readonly polarity: "POSITIVE" | "NEGATIVE";
  readonly confidence: "HIGH";
  readonly status: "VERIFIED";
  readonly applicability: {
    readonly market: "TR";
    readonly modelYear: number;
    readonly trim: string;
    readonly body: string;
    readonly powertrain: string;
  };
  readonly manualSource: {
    readonly sourceId: string;
    readonly artifactReference: string;
    readonly artifactSha256: string;
    readonly language: "tr";
    readonly market: "TR";
    readonly observedAt: string;
    readonly locator: { readonly physicalPdfPage: number; readonly sectionHeading: string };
  };
  readonly exactApplicabilitySource: {
    readonly sourceId: string;
    readonly sourceType: "OFFICIAL_EQUIPMENT_MATRIX" | "OFFICIAL_CONFIGURATOR" | "OFFICIAL_PRICE_OPTION_LIST" | "OFFICIAL_VIN_DOCUMENT";
    readonly artifactReference: string;
    readonly originalUrl: string;
    readonly artifactSha256: string;
    readonly observedAt: string;
    readonly reviewedAt: string;
    readonly locator: { readonly pageNumber?: number; readonly row: string; readonly column: string };
  };
  readonly reviewerAuthority: {
    readonly ownerActorId: string;
    readonly ownerApprovalEventId: string;
    readonly independentReviewerActorId: string;
    readonly independentReviewEventId: string;
    readonly approvalManifestId: string;
    readonly approvalManifestChecksum: string;
  };
  readonly limitations: readonly string[];
  readonly manualConditionalEquipment: boolean;
  readonly familyInheritance: false;
  readonly conditionalPromotedToStandard: false;
  readonly missingMentionTreatedAsNegative: false;
};

export type ExactTrPromotionIssue =
  | "EXACT_VARIANT_ID_MISMATCH"
  | "MARKET_MISMATCH"
  | "MODEL_YEAR_MISMATCH"
  | "TRIM_MISMATCH"
  | "BODY_MISMATCH"
  | "POWERTRAIN_MISMATCH"
  | "MANUAL_SOURCE_INVALID"
  | "EXACT_SOURCE_INVALID"
  | "LOCATOR_REQUIRED"
  | "CHECKSUM_REQUIRED"
  | "REVIEWER_AUTHORITY_REQUIRED"
  | "REVIEW_DATE_INVALID"
  | "UNSAFE_INHERITANCE"
  | "CONDITIONAL_PROMOTION_FORBIDDEN"
  | "MISSING_MENTION_NEGATIVE_FORBIDDEN";

const checksum = (value: string): boolean => /^sha256:[a-f0-9]{64}$/u.test(value);
const date = (value: string): boolean => Number.isFinite(Date.parse(value));
const nonEmpty = (value: string): boolean => value.trim().length > 0;

export function validateExactTrManualPromotion(promotion: ExactTrManualPromotion, identity: ExactTrCatalogIdentity): readonly ExactTrPromotionIssue[] {
  const issues: ExactTrPromotionIssue[] = [];
  const push = (issue: ExactTrPromotionIssue) => { if (!issues.includes(issue)) issues.push(issue); };
  if (promotion.exactVariantId !== identity.exactVariantId) push("EXACT_VARIANT_ID_MISMATCH");
  if (promotion.applicability.market !== "TR" || identity.market !== "TR" || promotion.manualSource.market !== "TR") push("MARKET_MISMATCH");
  if (promotion.applicability.modelYear !== identity.modelYear) push("MODEL_YEAR_MISMATCH");
  if (promotion.applicability.trim !== identity.trim) push("TRIM_MISMATCH");
  if (promotion.applicability.body !== identity.body) push("BODY_MISMATCH");
  if (promotion.applicability.powertrain !== identity.powertrain) push("POWERTRAIN_MISMATCH");
  if (promotion.manualSource.language !== "tr" || !nonEmpty(promotion.manualSource.sourceId) || !nonEmpty(promotion.manualSource.artifactReference)) push("MANUAL_SOURCE_INVALID");
  if (!nonEmpty(promotion.exactApplicabilitySource.sourceId) || !nonEmpty(promotion.exactApplicabilitySource.artifactReference) || !nonEmpty(promotion.exactApplicabilitySource.originalUrl)) push("EXACT_SOURCE_INVALID");
  if (promotion.manualSource.locator.physicalPdfPage < 1 || !nonEmpty(promotion.manualSource.locator.sectionHeading) || (promotion.exactApplicabilitySource.locator.pageNumber ?? 1) < 1 || !nonEmpty(promotion.exactApplicabilitySource.locator.row) || !nonEmpty(promotion.exactApplicabilitySource.locator.column)) push("LOCATOR_REQUIRED");
  if (!checksum(promotion.manualSource.artifactSha256) || !checksum(promotion.exactApplicabilitySource.artifactSha256) || !checksum(promotion.reviewerAuthority.approvalManifestChecksum)) push("CHECKSUM_REQUIRED");
  if (![promotion.reviewerAuthority.ownerActorId, promotion.reviewerAuthority.ownerApprovalEventId, promotion.reviewerAuthority.independentReviewerActorId, promotion.reviewerAuthority.independentReviewEventId, promotion.reviewerAuthority.approvalManifestId].every(nonEmpty)) push("REVIEWER_AUTHORITY_REQUIRED");
  if (!date(promotion.manualSource.observedAt) || !date(promotion.exactApplicabilitySource.observedAt) || !date(promotion.exactApplicabilitySource.reviewedAt) || Date.parse(promotion.exactApplicabilitySource.reviewedAt) < Date.parse(promotion.exactApplicabilitySource.observedAt)) push("REVIEW_DATE_INVALID");
  if (promotion.familyInheritance) push("UNSAFE_INHERITANCE");
  if (promotion.conditionalPromotedToStandard) push("CONDITIONAL_PROMOTION_FORBIDDEN");
  if (promotion.missingMentionTreatedAsNegative) push("MISSING_MENTION_NEGATIVE_FORBIDDEN");
  return Object.freeze(issues);
}

export function verifySha256Content(content: string | Buffer, expected: string): boolean {
  return expected === `sha256:${createHash("sha256").update(content).digest("hex")}`;
}
