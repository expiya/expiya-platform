export type ExactEquipmentCatalogIdentity = {
  readonly exactVariantId: string;
  readonly market: "TR";
  readonly modelYear: number;
  readonly trim: string;
  readonly body: string;
  readonly powertrain: string;
};

export type ExactEquipmentAssociationProposal = {
  readonly proposalId: string;
  readonly exactVariantId: string;
  readonly featureCode: string;
  readonly availabilityStatus: "STANDARD" | "NOT_AVAILABLE";
  readonly applicability: ExactEquipmentCatalogIdentity;
  readonly source: {
    readonly sourceId: string;
    readonly originalUrl: string;
    readonly artifactReference: string;
    readonly artifactSha256: string;
    readonly capturedAt: string;
    readonly language: "tr";
    readonly market: "TR";
    readonly publicationDate: string;
    readonly modelYear: number;
    readonly documentTrimLabel: string;
    readonly documentBody: string;
    readonly documentPowertrain: string;
    readonly replaced: false;
    readonly stale: false;
    readonly locator: { readonly pageNumber: number; readonly row: string; readonly column: string };
  };
  readonly interpretation: {
    readonly explicitMatrixCell: true;
    readonly optional: false;
    readonly conditional: false;
    readonly footnoteQualified: false;
    readonly missingMentionTreatedAsNegative: false;
    readonly siblingTrimInference: false;
    readonly crossModelYearInference: false;
    readonly foreignMarketInference: false;
  };
  readonly collection: { readonly collectorActorId: string; readonly collectedAt: string };
  readonly independentReview: {
    readonly status: "PASSED";
    readonly reviewerActorId: string;
    readonly reviewedAt: string;
    readonly eventId: string;
  };
  readonly ownerApproval: null;
  readonly materializationStatus: "PROPOSAL_REVIEWED_OWNER_APPROVAL_PENDING";
};

export type ExactEquipmentProposalIssue =
  | "EXACT_VARIANT_ID_MISMATCH"
  | "MARKET_MISMATCH"
  | "MODEL_YEAR_MISMATCH"
  | "TRIM_MISMATCH"
  | "BODY_MISMATCH"
  | "POWERTRAIN_MISMATCH"
  | "SOURCE_DOMAIN_MISMATCH"
  | "SOURCE_METADATA_INVALID"
  | "CHECKSUM_REQUIRED"
  | "LOCATOR_REQUIRED"
  | "STALE_OR_REPLACED_SOURCE"
  | "OPTIONAL_CONDITIONAL_OR_FOOTNOTE_SCOPE"
  | "UNSAFE_INFERENCE"
  | "INDEPENDENT_REVIEW_REQUIRED"
  | "COLLECTOR_REVIEWER_SEPARATION_REQUIRED"
  | "REVIEW_DATE_INVALID"
  | "OWNER_APPROVAL_MUST_REMAIN_PENDING";

const checksum = (value: string): boolean => /^sha256:[a-f0-9]{64}$/u.test(value);
const date = (value: string): boolean => Number.isFinite(Date.parse(value));
const nonEmpty = (value: string): boolean => value.trim().length > 0;

export function validateExactEquipmentAssociationProposal(
  proposal: ExactEquipmentAssociationProposal,
  identity: ExactEquipmentCatalogIdentity,
  allowedDomains: readonly string[],
): readonly ExactEquipmentProposalIssue[] {
  const issues: ExactEquipmentProposalIssue[] = [];
  const push = (issue: ExactEquipmentProposalIssue) => { if (!issues.includes(issue)) issues.push(issue); };
  if (proposal.exactVariantId !== identity.exactVariantId || proposal.applicability.exactVariantId !== identity.exactVariantId) push("EXACT_VARIANT_ID_MISMATCH");
  if (proposal.applicability.market !== identity.market || proposal.source.market !== identity.market) push("MARKET_MISMATCH");
  if (proposal.applicability.modelYear !== identity.modelYear || proposal.source.modelYear !== identity.modelYear) push("MODEL_YEAR_MISMATCH");
  if (proposal.applicability.trim !== identity.trim) push("TRIM_MISMATCH");
  if (proposal.applicability.body !== identity.body) push("BODY_MISMATCH");
  if (proposal.applicability.powertrain !== identity.powertrain) push("POWERTRAIN_MISMATCH");
  let hostname = "";
  try { hostname = new URL(proposal.source.originalUrl).hostname.toLowerCase(); } catch { push("SOURCE_METADATA_INVALID"); }
  if (!allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) push("SOURCE_DOMAIN_MISMATCH");
  if (![proposal.proposalId, proposal.featureCode, proposal.source.sourceId, proposal.source.artifactReference, proposal.source.documentTrimLabel, proposal.source.documentBody, proposal.source.documentPowertrain].every(nonEmpty)
      || proposal.source.language !== "tr" || !date(proposal.source.capturedAt) || !date(proposal.source.publicationDate)) push("SOURCE_METADATA_INVALID");
  if (!checksum(proposal.source.artifactSha256)) push("CHECKSUM_REQUIRED");
  if (proposal.source.locator.pageNumber < 1 || !nonEmpty(proposal.source.locator.row) || !nonEmpty(proposal.source.locator.column)) push("LOCATOR_REQUIRED");
  if (proposal.source.stale || proposal.source.replaced) push("STALE_OR_REPLACED_SOURCE");
  if (proposal.interpretation.optional || proposal.interpretation.conditional || proposal.interpretation.footnoteQualified || !proposal.interpretation.explicitMatrixCell) push("OPTIONAL_CONDITIONAL_OR_FOOTNOTE_SCOPE");
  if (proposal.interpretation.missingMentionTreatedAsNegative || proposal.interpretation.siblingTrimInference || proposal.interpretation.crossModelYearInference || proposal.interpretation.foreignMarketInference) push("UNSAFE_INFERENCE");
  if (proposal.independentReview.status !== "PASSED" || !nonEmpty(proposal.independentReview.reviewerActorId) || !nonEmpty(proposal.independentReview.eventId)) push("INDEPENDENT_REVIEW_REQUIRED");
  if (proposal.collection.collectorActorId === proposal.independentReview.reviewerActorId) push("COLLECTOR_REVIEWER_SEPARATION_REQUIRED");
  if (!date(proposal.collection.collectedAt) || !date(proposal.independentReview.reviewedAt) || Date.parse(proposal.independentReview.reviewedAt) < Date.parse(proposal.collection.collectedAt)) push("REVIEW_DATE_INVALID");
  if (proposal.ownerApproval !== null || proposal.materializationStatus !== "PROPOSAL_REVIEWED_OWNER_APPROVAL_PENDING") push("OWNER_APPROVAL_MUST_REMAIN_PENDING");
  return Object.freeze(issues);
}
