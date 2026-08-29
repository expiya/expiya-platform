import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import {
  PAID_COMPARISON_CURRENCY,
  PAID_COMPARISON_PRICE_KURUS,
  PAID_COMPARISON_PRODUCT_CODE,
  type ComparisonReportQuote,
} from "./contracts";
import { assessPaidComparisonEligibility } from "./eligibility";

const QUOTE_TTL_MS = 30 * 60_000;

export function createPaidComparisonQuote(input: {
  readonly quoteId: string;
  readonly conversationId: string;
  readonly decisionId: string;
  readonly decisionVariantId: string;
  readonly alternativeVariantIds: readonly [string, string];
  readonly variants: readonly CatalogVariantSnapshot[];
  readonly catalogReleaseVersion: string;
  readonly catalogFingerprint: string;
  readonly now: Date;
}): ComparisonReportQuote {
  const eligibility = assessPaidComparisonEligibility(input);
  if (!eligibility.eligible) throw new Error(`PAID_COMPARISON_INELIGIBLE:${eligibility.reason}:${eligibility.exactVariantId ?? "unknown"}`);

  return {
    id: input.quoteId,
    productCode: PAID_COMPARISON_PRODUCT_CODE,
    conversationId: input.conversationId,
    decisionId: input.decisionId,
    catalogReleaseVersion: input.catalogReleaseVersion,
    catalogFingerprint: input.catalogFingerprint,
    vehicles: [
      { exactVariantId: input.decisionVariantId, role: "DECISION_CARD" },
      { exactVariantId: input.alternativeVariantIds[0], role: "ALTERNATIVE_1" },
      { exactVariantId: input.alternativeVariantIds[1], role: "ALTERNATIVE_2" },
    ],
    amountKurus: PAID_COMPARISON_PRICE_KURUS,
    currency: PAID_COMPARISON_CURRENCY,
    taxIncluded: true,
    status: "READY_FOR_CHECKOUT",
    createdAt: input.now.toISOString(),
    expiresAt: new Date(input.now.getTime() + QUOTE_TTL_MS).toISOString(),
  };
}
