export type UsedCarTaxonomyEntityType =
  | "MAKE" | "MODEL_LINE" | "GENERATION" | "BODY_DERIVATIVE"
  | "POWERTRAIN_DERIVATIVE" | "MARKET_VARIANT" | "TRIM";

export type TaxonomyConfidence = "LOW" | "MEDIUM" | "HIGH";
export type TaxonomyModerationStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "SUPERSEDED";

export interface TaxonomySourceReference {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly sourceDate?: string;
  readonly accessedAt: string;
  readonly usagePermission: "OPEN_LICENSE" | "PUBLIC_FACTS_ONLY" | "LICENSED" | "PERMISSION_REQUIRED";
}

export interface UsedCarTaxonomyEntity {
  readonly id: string;
  readonly entityType: UsedCarTaxonomyEntityType;
  readonly canonicalName: string;
  readonly aliases: readonly { readonly value: string; readonly locale: string; readonly market?: string }[];
  readonly market: "TR" | "GLOBAL";
  readonly productionFrom?: number;
  readonly productionUntil?: number;
  readonly sourceReferences: readonly TaxonomySourceReference[];
  readonly confidence: TaxonomyConfidence;
  readonly moderationStatus: TaxonomyModerationStatus;
  readonly releaseVersion: string;
  readonly supersedesEntityId?: string;
}

export interface TaxonomyIdentityRequest {
  readonly id: string;
  readonly tenantId: string;
  readonly requestedByUserId: string;
  readonly evidenceReferences: readonly string[];
  readonly description: string;
  readonly status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  readonly resolvedTaxonomyEntityId?: string;
}

