import type { ApprovedDecisionNeed } from "@/features/sales-advisor/types";

export const PAID_COMPARISON_PRODUCT_CODE = "CARS_COMPARISON_3" as const;
export const PAID_COMPARISON_PRICE_KURUS = 34_900;
export const PAID_COMPARISON_CURRENCY = "TRY" as const;
export const PAID_COMPARISON_VEHICLE_COUNT = 3;
export const PAID_COMPARISON_VAT_RATE_PERCENT = 20;
export const PAID_COMPARISON_NET_KURUS = 29_083;
export const PAID_COMPARISON_VAT_KURUS = 5_817;

if (PAID_COMPARISON_NET_KURUS + PAID_COMPARISON_VAT_KURUS !== PAID_COMPARISON_PRICE_KURUS) {
  throw new TypeError("PAID_COMPARISON_TAX_BREAKDOWN_INVALID");
}

export type ComparisonVehicleRole = "DECISION_CARD" | "ALTERNATIVE_1" | "ALTERNATIVE_2";

export interface ComparisonVehicleSelection {
  readonly exactVariantId: string;
  readonly role: ComparisonVehicleRole;
}

export interface ComparisonReportQuote {
  readonly id: string;
  readonly productCode: typeof PAID_COMPARISON_PRODUCT_CODE;
  readonly conversationId: string;
  readonly decisionId: string;
  readonly approvedNeeds: readonly ApprovedDecisionNeed[];
  readonly catalogReleaseVersion: string;
  readonly catalogFingerprint: string;
  readonly vehicles: readonly ComparisonVehicleSelection[];
  readonly amountKurus: typeof PAID_COMPARISON_PRICE_KURUS;
  readonly currency: typeof PAID_COMPARISON_CURRENCY;
  readonly taxIncluded: true;
  readonly status: "READY_FOR_CHECKOUT";
  readonly createdAt: string;
  readonly expiresAt: string;
}
