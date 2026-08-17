import type { CatalogFact, FactAvailability } from "./types";

export interface CatalogFactEvaluability {
  readonly availability: FactAvailability;
  readonly confidence?: CatalogFact<unknown>["confidence"];
  readonly catalogFingerprint?: string;
  readonly provenanceCount: number;
  readonly hardFilterAuthority: "NOT_DETERMINED";
  readonly explanationAccess?: CatalogFact<unknown>["explanationAccess"];
}

export function inspectCatalogFact(fact: CatalogFact<unknown> | undefined, supported = true): CatalogFactEvaluability {
  if (!supported) return { availability: "UNSUPPORTED", provenanceCount: 0, hardFilterAuthority: "NOT_DETERMINED" };
  if (!fact) return { availability: "MISSING", provenanceCount: 0, hardFilterAuthority: "NOT_DETERMINED" };
  return {
    availability: "AVAILABLE", confidence: fact.confidence, catalogFingerprint: fact.catalogFingerprint,
    provenanceCount: fact.provenance.length, hardFilterAuthority: "NOT_DETERMINED", explanationAccess: fact.explanationAccess,
  };
}
