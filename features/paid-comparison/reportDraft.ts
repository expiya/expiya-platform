import type { CatalogFact, CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";

type DisplayFact = { readonly value: string | number | null; readonly confidence: "LOW" | "MEDIUM" | "HIGH" | null; readonly sources: readonly string[]; readonly missing: boolean };

function fact<T>(input: CatalogFact<T> | undefined, format: (value: T) => string | number = (value) => String(value)): DisplayFact {
  if (!input) return { value: null, confidence: null, sources: [], missing: true };
  return { value: format(input.value), confidence: input.confidence, sources: [...new Set(input.provenance.map((item) => item.sourceUrl))], missing: false };
}

/** Deterministic, source-preserving input to later narrative generation. */
export function buildPaidComparisonReportDraft(input: {
  readonly catalogReleaseVersion: string;
  readonly catalogFingerprint: string;
  readonly generatedAt: string;
  readonly variants: readonly [CatalogVariantSnapshot, CatalogVariantSnapshot, CatalogVariantSnapshot];
}) {
  return {
    schemaVersion: "paid-comparison-report/v1" as const,
    catalogReleaseVersion: input.catalogReleaseVersion,
    catalogFingerprint: input.catalogFingerprint,
    generatedAt: input.generatedAt,
    sections: ["NEEDS_SUMMARY", "THREE_VEHICLE_OVERVIEW", "PERSONALIZED_TRADE_OFFS", "COST_INDICATORS", "WHEN_TO_CHOOSE_WHICH", "DECISION_VALIDATION", "SOURCES_AND_UNCERTAINTIES"] as const,
    vehicles: input.variants.map((variant, index) => ({
      exactVariantId: variant.id,
      role: index === 0 ? "DECISION_CARD" as const : `ALTERNATIVE_${index}` as const,
      identity: { brand: variant.brand, model: variant.model, trim: variant.trim, sources: [...new Set(variant.identityProvenance.map((item) => item.sourceUrl))] },
      price: variant.activeNewPrice ? { value: variant.activeNewPrice.amountTry, validFrom: variant.activeNewPrice.validFrom, confidence: variant.activeNewPrice.confidence, sources: [...new Set(variant.activeNewPrice.provenance.map((item) => item.sourceUrl))], missing: false } : { value: null, validFrom: null, confidence: null, sources: [], missing: true },
      facts: {
        bodyStyle: fact(variant.decisionFacts.bodyStyle),
        modelYear: fact(variant.decisionFacts.modelYear, Number),
        fuelType: fact(variant.decisionFacts.powertrain.fuelType),
        powerKw: fact(variant.decisionFacts.powertrain.powerKw, Number),
        torqueNm: fact(variant.decisionFacts.powertrain.torqueNm, Number),
        transmission: fact(variant.decisionFacts.powertrain.transmission),
        luggageLitres: fact(variant.decisionFacts.dimensions.luggageLitres, Number),
        combinedLitresPer100Km: fact(variant.decisionFacts.efficiency.combinedLitresPer100Km, Number),
        combinedKwhPer100Km: fact(variant.decisionFacts.efficiency.combinedKwhPer100Km, Number),
        electricRangeKm: fact(variant.decisionFacts.efficiency.electricRangeKm, Number),
        maxDcChargeKw: fact(variant.decisionFacts.efficiency.maxDcChargeKw, Number),
      },
      safetyFeatures: variant.decisionFacts.safetyFeatureCodes.map((item) => fact(item)),
      salesActions: ["REQUEST_OFFER", "REQUEST_TEST_DRIVE", "CONTACT_SELLER"] as const,
    })),
  };
}
