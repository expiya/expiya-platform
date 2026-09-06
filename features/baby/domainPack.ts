import { createHash } from "node:crypto";
import { STROLLER_CATALOG_RELEASE, STROLLER_PRODUCTS, STROLLER_SOURCES } from "./catalog";
import { STROLLER_NEEDS } from "./contracts";

export const STROLLER_DOMAIN_PACK = Object.freeze({
  schemaVersion: "xpy-stroller-domain-pack/v1", departmentId: "BABY_AND_CHILD", categoryId: "STROLLER", market: "TR", condition: "NEW",
  decisionObject: "EXACT_TR_APPLICABLE_MANUFACTURER_STROLLER_CONFIGURATION", release: STROLLER_CATALOG_RELEASE,
  taxonomy: ["STANDARD", "COMPACT_TRAVEL", "TRAVEL_SYSTEM_COMPATIBLE"], acceptedContext: STROLLER_NEEDS,
  evidenceKeys: ["childWeightMaxKg", "newbornUse", "strollerWeightKg", "foldedMm", "oneHandFold", "selfStanding", "reversibleSeat", "lieFlatRecline", "suspension", "basketMaxKg", "cabinSizeClaim", "travelSystemCompatible"],
  questionPolicy: { oneAtATime: true, currentCandidateMaterialityOnly: true, suppressUniversal: true, suppressUnsupported: true, suppressPredominantlyUnknown: true, brandShortcut: false },
  selectionPolicy: { model: "HARD_COMPATIBILITY_THEN_EVIDENCE_BACKED_PARETO", scores: false, weights: false, catalogOrderTieBreak: false, unknownAdvantages: false },
  safety: ["MISSING_IS_UNKNOWN", "MAX_WEIGHT_IS_NOT_DEVELOPMENTAL_SUITABILITY", "TRAVEL_SYSTEM_COMPATIBLE_IS_NOT_INCLUDED", "CABIN_CLAIM_REQUIRES_AIRLINE_APPROVAL", "NO_MEDICAL_DEVELOPMENTAL_OR_SAFETY_GUARANTEE"],
  comparisonPolicy: { exactConfigurationOnly: true, volatilePriceOutsideTechnicalAuthority: true, reviewsNotTechnicalTruth: true },
});

const canonical = JSON.stringify({ pack: STROLLER_DOMAIN_PACK, products: STROLLER_PRODUCTS, sources: STROLLER_SOURCES });
export const STROLLER_AUTHORITY_DIGEST = `sha256:${createHash("sha256").update(canonical).digest("hex")}` as const;

export function validateStrollerAuthority(): readonly string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const product of STROLLER_PRODUCTS) {
    if (ids.has(product.exactProductId)) issues.push(`DUPLICATE:${product.exactProductId}`); ids.add(product.exactProductId);
    if (product.trApplicability.status !== "VERIFIED" || !product.trApplicability.evidenceIds.length) issues.push(`TR_APPLICABILITY:${product.exactProductId}`);
    if (!product.configurationIdentity.includes("Türkiye")) issues.push(`IDENTITY:${product.exactProductId}`);
    if (!product.evidenceIds.length) issues.push(`EVIDENCE:${product.exactProductId}`);
  }
  return Object.freeze(issues);
}

