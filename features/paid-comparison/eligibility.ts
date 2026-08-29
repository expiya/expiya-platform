import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";

export type ComparisonIneligibilityReason =
  | "DECISION_VARIANT_NOT_FOUND"
  | "ALTERNATIVE_VARIANT_NOT_FOUND"
  | "DUPLICATE_VARIANT"
  | "NOT_CURRENTLY_ON_SALE"
  | "NOT_SAME_COMPARISON_CLASS"
  | "PUBLIC_LIST_PRICE_REQUIRED"
  | "IDENTITY_PROVENANCE_REQUIRED";

export type ComparisonEligibilityResult =
  | { readonly eligible: true; readonly variants: readonly [CatalogVariantSnapshot, CatalogVariantSnapshot, CatalogVariantSnapshot] }
  | { readonly eligible: false; readonly reason: ComparisonIneligibilityReason; readonly exactVariantId?: string };

function hasPublicListPrice(variant: CatalogVariantSnapshot): boolean {
  const price = variant.activeNewPrice;
  return Boolean(
    price
    && price.condition === "NEW"
    && price.priceType === "LIST"
    && price.consumerVisibility === "PUBLIC"
    && price.realizationSafe
    && price.amountTry > 0
    && price.provenance.length > 0,
  );
}

/**
 * Phase-1 comparison class: the catalog-authoritative body style. A dedicated,
 * versioned comparison-class registry can replace this without changing quotes.
 */
function comparisonClass(variant: CatalogVariantSnapshot): string {
  return variant.decisionFacts.bodyStyle.value.trim().toLocaleUpperCase("tr-TR");
}

export function assessPaidComparisonEligibility(input: {
  readonly decisionVariantId: string;
  readonly alternativeVariantIds: readonly [string, string];
  readonly variants: readonly CatalogVariantSnapshot[];
}): ComparisonEligibilityResult {
  const ids = [input.decisionVariantId, ...input.alternativeVariantIds];
  if (new Set(ids).size !== ids.length) return { eligible: false, reason: "DUPLICATE_VARIANT" };

  const byId = new Map(input.variants.map((variant) => [variant.id, variant]));
  const decision = byId.get(input.decisionVariantId);
  if (!decision) return { eligible: false, reason: "DECISION_VARIANT_NOT_FOUND", exactVariantId: input.decisionVariantId };

  const selected: CatalogVariantSnapshot[] = [decision];
  for (const exactVariantId of input.alternativeVariantIds) {
    const variant = byId.get(exactVariantId);
    if (!variant) return { eligible: false, reason: "ALTERNATIVE_VARIANT_NOT_FOUND", exactVariantId };
    selected.push(variant);
  }

  const expectedClass = comparisonClass(decision);
  for (const variant of selected) {
    if (variant.lifecycleStatus !== "ON_SALE") return { eligible: false, reason: "NOT_CURRENTLY_ON_SALE", exactVariantId: variant.id };
    if (comparisonClass(variant) !== expectedClass) return { eligible: false, reason: "NOT_SAME_COMPARISON_CLASS", exactVariantId: variant.id };
    if (variant.identityProvenance.length === 0) return { eligible: false, reason: "IDENTITY_PROVENANCE_REQUIRED", exactVariantId: variant.id };
    if (!hasPublicListPrice(variant)) return { eligible: false, reason: "PUBLIC_LIST_PRICE_REQUIRED", exactVariantId: variant.id };
  }

  return { eligible: true, variants: selected as [CatalogVariantSnapshot, CatalogVariantSnapshot, CatalogVariantSnapshot] };
}
