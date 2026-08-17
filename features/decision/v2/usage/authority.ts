import type { CatalogFact } from "../catalog/types";
import type { UsageFactAuthorityPolicy } from "./policy";
import type { CatalogFactReference, UsageFactDecisionAuthority } from "./types";

export function catalogFactReference(field: string, fact: CatalogFact<unknown>, factKind: "CANONICAL" | "DERIVED_POLICY" = "CANONICAL"): CatalogFactReference {
  return Object.freeze({ field, catalogFingerprint: fact.catalogFingerprint, confidence: fact.confidence, provenanceCount: fact.provenance.length, factKind });
}

export function evaluateUsageFactAuthority(input: {
  readonly fact?: CatalogFact<unknown>; readonly expectedCatalogFingerprint: string; readonly explicitHardRequirement: boolean;
  readonly factKind?: "CANONICAL" | "DERIVED_POLICY"; readonly policy: UsageFactAuthorityPolicy;
}): UsageFactDecisionAuthority {
  if (!input.fact) return "NOT_EVALUABLE";
  if (input.fact.catalogFingerprint !== input.expectedCatalogFingerprint || input.fact.provenance.length === 0) return "NOT_EVALUABLE";
  if (input.factKind === "DERIVED_POLICY") return "RANK_ONLY";
  if (input.fact.confidence === "LOW") return input.explicitHardRequirement ? "RANK_ONLY" : "EXPLANATION_ONLY";
  return input.explicitHardRequirement ? "HARD_FILTER_ALLOWED" : "RANK_ONLY";
}
