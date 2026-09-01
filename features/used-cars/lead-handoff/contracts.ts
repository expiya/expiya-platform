export type UsedCarLeadIntent = "REQUEST_QUOTE" | "REQUEST_TEST_DRIVE" | "REQUEST_DEALER_CONTACT";

export interface UsedCarLeadHandoff {
  readonly version: "used-lead-handoff/v1";
  readonly idempotencyKey: string;
  readonly listingId: string;
  readonly inventoryUnitId: string;
  readonly tenantId: string;
  readonly branchId: string;
  readonly intent: UsedCarLeadIntent;
  readonly consentReceiptId: string;
  readonly sharedFieldAllowlist: readonly string[];
  readonly rawConversationIncluded: false;
  readonly executionAuthorized: false;
  readonly expiresAt: string;
}
