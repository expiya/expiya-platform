import type { AppliancesProductType } from "../contracts";

export type ComparisonReportEntitlement =
  | { readonly status: "NOT_PURCHASED" }
  | { readonly status: "PURCHASED"; readonly entitlementId: string; readonly authorizedExactProductIds: readonly string[] };

export interface AdvisorManualKnowledge {
  readonly status: "AVAILABLE" | "NOT_AVAILABLE";
  readonly entries: readonly {
    readonly topic: string;
    readonly statement: string;
    readonly sourceLabel: string;
    readonly pageNumber: number;
    readonly sectionLabel: string;
    readonly professionalInstallationRequired: boolean;
  }[];
}

export interface AdvisorReadProjection {
  readonly schemaVersion: "appliances-advisor-read-projection/v1";
  readonly productType: AppliancesProductType;
  readonly authorizedExactProductIds: readonly string[];
  readonly selected: StageTwoProduct;
  readonly manualKnowledge: AdvisorManualKnowledge;
  readonly comparison: { readonly access: "LOCKED" | "ENTITLED"; readonly products: readonly StageTwoProduct[]; readonly rows: readonly ComparisonRow[] };
  readonly boundaries: { readonly canChangeContext: false; readonly canRerunDecision: false; readonly canAddProducts: false; readonly recommendationAuthority: false; readonly commerceIsTechnicalTruth: false };
}

export interface StageTwoProduct {
  readonly id: string; readonly brand: string; readonly model: string; readonly configuration: string;
  readonly media: { readonly src?: string; readonly alt: string; readonly linkTarget?: string; readonly disclosure?: string; readonly cacheMode?: "PERSISTENT" | "TRANSIENT_URL_ONLY" | "NO_STORE" };
  readonly facts: readonly { readonly label: string; readonly value: string; readonly dailyMeaning?: string; readonly sourceLabel: string; readonly sourceHref?: string; readonly observedAt?: string }[];
  readonly capabilities: readonly string[]; readonly limitations: readonly string[];
  readonly price: { readonly display: string; readonly note: string };
}
export interface ComparisonRow { readonly label: string; readonly values: readonly { readonly productId: string; readonly value: string; readonly sourceLabel?: string }[] }

export interface AppliancesStageTwoProjection extends AdvisorReadProjection {
  readonly categoryLabel: string;
  readonly content: import("./categoryContent").AppliancesStageTwoCategoryContent;
  readonly comparisonOffer: { readonly label: "Karşılaştırma raporunu aç" | "Erişim koşullarını incele"; readonly action: "OPEN_REPORT" | "EXPLAIN_ACCESS" };
  readonly salesActions: readonly AppliancesSalesAction[];
}

export type AppliancesSalesActionKind = "VIEW_EXACT_OFFER" | "WATCH_PRICE" | "INQUIRE_AUTHORIZED_AVAILABILITY" | "SAVE_DECISION" | "SHARE_DECISION" | "REQUEST_COMPARISON_REPORT";
export type AppliancesSalesActionAvailability = "AVAILABLE" | "UNAVAILABLE" | "COMING_SOON";
export interface AppliancesSalesAction {
  readonly kind: AppliancesSalesActionKind;
  readonly label: string;
  readonly availability: AppliancesSalesActionAvailability;
  readonly explanation: string;
  readonly merchant?: string;
  readonly observedAt?: string;
}
