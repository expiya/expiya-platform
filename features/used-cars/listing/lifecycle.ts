import type { PublishingGates } from "../memberships/publishingEligibility";
import { isDealerPublishingEligible } from "../memberships/publishingEligibility";

export type UsedCarListingStatus =
  | "DRAFT" | "READY_FOR_REVIEW" | "IN_REVIEW" | "CHANGES_REQUESTED"
  | "APPROVED" | "PUBLISHED" | "RESERVED" | "SOLD" | "WITHDRAWN"
  | "EXPIRED" | "SUSPENDED" | "REJECTED";

const transitions: Readonly<Record<UsedCarListingStatus, readonly UsedCarListingStatus[]>> = {
  DRAFT: ["READY_FOR_REVIEW", "WITHDRAWN"],
  READY_FOR_REVIEW: ["IN_REVIEW", "WITHDRAWN"],
  IN_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED", "SUSPENDED"],
  CHANGES_REQUESTED: ["DRAFT", "READY_FOR_REVIEW", "WITHDRAWN"],
  APPROVED: ["PUBLISHED", "SUSPENDED", "WITHDRAWN"],
  PUBLISHED: ["RESERVED", "SOLD", "WITHDRAWN", "EXPIRED", "SUSPENDED"],
  RESERVED: ["PUBLISHED", "SOLD", "WITHDRAWN", "SUSPENDED"],
  SOLD: [], WITHDRAWN: [], EXPIRED: ["READY_FOR_REVIEW"],
  SUSPENDED: ["IN_REVIEW", "WITHDRAWN"], REJECTED: ["DRAFT"],
};

export function canTransitionListing(from: UsedCarListingStatus, to: UsedCarListingStatus): boolean {
  return transitions[from].includes(to);
}

export interface ListingPublicationProjection {
  readonly status: UsedCarListingStatus;
  readonly stockConfirmedAt: string;
  readonly freshnessValidUntil: string;
  readonly criticalConflictCount: number;
}

export function isListingPublic(
  listing: ListingPublicationProjection,
  dealerGates: PublishingGates,
  nowIso: string,
): boolean {
  return listing.status === "PUBLISHED"
    && listing.criticalConflictCount === 0
    && listing.stockConfirmedAt <= nowIso
    && listing.freshnessValidUntil >= nowIso
    && isDealerPublishingEligible(dealerGates);
}

