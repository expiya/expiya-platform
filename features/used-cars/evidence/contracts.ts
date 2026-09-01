export const usedCarAssertionStatuses = [
  "EXPIYA_VERIFIED", "DEALER_DECLARED", "USER_DECLARED",
  "DOCUMENT_UPLOADED_UNREVIEWED", "UNVERIFIABLE", "MISSING",
  "CONFLICTING", "STALE",
] as const;

export type UsedCarAssertionStatus = typeof usedCarAssertionStatuses[number];

export interface UsedCarFieldAssertion<T> {
  readonly value: T | null;
  readonly status: UsedCarAssertionStatus;
  readonly sourceReferenceIds: readonly string[];
  readonly assertedBy: "EXPIYA" | "DEALER" | "USER" | "DOCUMENT";
  readonly observedAt: string;
  readonly validUntil?: string;
  readonly limitations: readonly string[];
}

export function canRenderAsExpiyaVerified(assertion: UsedCarFieldAssertion<unknown>): boolean {
  return assertion.status === "EXPIYA_VERIFIED"
    && assertion.assertedBy === "EXPIYA"
    && assertion.sourceReferenceIds.length > 0;
}
