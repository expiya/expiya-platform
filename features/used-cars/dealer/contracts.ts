export type DealerLifecycleStatus =
  | "APPLICATION" | "IDENTITY_REVIEW" | "LEGAL_ENTITY_VERIFIED"
  | "CONTRACT_PENDING" | "CONTRACT_ACTIVE" | "PAYMENT_PENDING"
  | "MEMBERSHIP_ACTIVE" | "OPERATIONAL_REVIEW" | "PUBLISHING_ELIGIBLE"
  | "SUSPENDED" | "CLOSED";

export interface DealerOrganization {
  readonly id: string;
  readonly legalName: string;
  readonly taxNumberFingerprint: string;
  readonly lifecycleStatus: DealerLifecycleStatus;
  readonly branchIds: readonly string[];
}

