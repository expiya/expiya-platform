export type TaxonomyReleaseStatus = "DRAFT" | "VALIDATED" | "OWNER_APPROVED" | "ACTIVE" | "WITHDRAWN" | "SUPERSEDED";

export interface UsedCarTaxonomyRelease {
  readonly version: string;
  readonly status: TaxonomyReleaseStatus;
  readonly payloadChecksum: string;
  readonly entityCount: number;
  readonly market: "TR";
  readonly previousReleaseVersion: string | null;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly activatedAt?: string;
  readonly supersededByVersion?: string;
}

const releaseTransitions: Readonly<Record<TaxonomyReleaseStatus, readonly TaxonomyReleaseStatus[]>> = {
  DRAFT: ["VALIDATED", "WITHDRAWN"],
  VALIDATED: ["OWNER_APPROVED", "WITHDRAWN"],
  OWNER_APPROVED: ["ACTIVE", "WITHDRAWN"],
  ACTIVE: ["SUPERSEDED", "WITHDRAWN"],
  WITHDRAWN: [], SUPERSEDED: [],
};

export function canTransitionTaxonomyRelease(from: TaxonomyReleaseStatus, to: TaxonomyReleaseStatus): boolean {
  return releaseTransitions[from].includes(to);
}

export function isTaxonomyReleaseActivatable(release: UsedCarTaxonomyRelease): boolean {
  return release.status === "OWNER_APPROVED"
    && /^sha256:[a-f0-9]{64}$/u.test(release.payloadChecksum)
    && release.entityCount > 0
    && Boolean(release.approvedBy && release.approvedAt)
    && !release.activatedAt
    && !release.supersededByVersion;
}

export type TaxonomyIdentityRequestStatus =
  | "SUBMITTED" | "EVIDENCE_REVIEW" | "MATCH_FOUND" | "NEW_ENTITY_PROPOSED"
  | "SECOND_REVIEW" | "RESOLVED" | "CHANGES_REQUESTED" | "REJECTED" | "WITHDRAWN";

const requestTransitions: Readonly<Record<TaxonomyIdentityRequestStatus, readonly TaxonomyIdentityRequestStatus[]>> = {
  SUBMITTED: ["EVIDENCE_REVIEW", "WITHDRAWN"],
  EVIDENCE_REVIEW: ["MATCH_FOUND", "NEW_ENTITY_PROPOSED", "CHANGES_REQUESTED", "REJECTED"],
  MATCH_FOUND: ["SECOND_REVIEW"], NEW_ENTITY_PROPOSED: ["SECOND_REVIEW"],
  SECOND_REVIEW: ["RESOLVED", "CHANGES_REQUESTED", "REJECTED"],
  CHANGES_REQUESTED: ["SUBMITTED", "WITHDRAWN"],
  RESOLVED: [], REJECTED: [], WITHDRAWN: [],
};

export function canTransitionIdentityRequest(from: TaxonomyIdentityRequestStatus, to: TaxonomyIdentityRequestStatus): boolean {
  return requestTransitions[from].includes(to);
}

export interface IdentityRequestResolution {
  readonly requestStatus: TaxonomyIdentityRequestStatus;
  readonly moderatorApproved: boolean;
  readonly secondReviewerApproved: boolean;
  readonly resolvedTaxonomyEntityId: string | null;
  readonly sellerCanCreateCanonicalIdentity: false;
}

export function isIdentityRequestResolved(resolution: IdentityRequestResolution): boolean {
  return resolution.requestStatus === "RESOLVED"
    && resolution.moderatorApproved
    && resolution.secondReviewerApproved
    && Boolean(resolution.resolvedTaxonomyEntityId);
}

