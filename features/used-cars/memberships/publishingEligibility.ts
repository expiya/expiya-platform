import type { DealerLifecycleStatus } from "../dealer/contracts";

export interface PublishingGates {
  readonly dealerStatus: DealerLifecycleStatus;
  readonly identityVerified: boolean;
  readonly contractActive: boolean;
  readonly paymentCurrent: boolean;
  readonly operationalReviewPassed: boolean;
  readonly moderationEnabled: boolean;
}

export function isDealerPublishingEligible(gates: PublishingGates): boolean {
  return gates.dealerStatus === "PUBLISHING_ELIGIBLE"
    && gates.identityVerified
    && gates.contractActive
    && gates.paymentCurrent
    && gates.operationalReviewPassed
    && gates.moderationEnabled;
}

