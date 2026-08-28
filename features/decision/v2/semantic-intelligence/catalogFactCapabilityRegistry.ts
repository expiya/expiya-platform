import type { CatalogSnapshot } from "../catalog/types";

/** Evidence state shared by catalog, equipment and owner-manual facts. */
export type CatalogFactEvidenceState =
  | "VERIFIED"
  | "PROVISIONAL"
  | "FAMILY_LEVEL"
  | "FOREIGN_MARKET"
  | "CONDITIONAL"
  | "UNKNOWN"
  | "CONFLICTED";

export type CatalogFactType = "STRING" | "NUMBER" | "BOOLEAN" | "ENUM" | "SET" | "LIST";
export type CatalogFactScope = "EXACT_VARIANT" | "FAMILY" | "MODEL_YEAR" | "MARKET";
export type CatalogFactUse = "READ" | "FILTER" | "SORT" | "AGGREGATE" | "COMPARE" | "FACET" | "QUESTION" | "EXPLAIN";
export type CatalogDecisionUse = "HARD_FILTER" | "SOFT_RANK" | "QUESTION_ONLY" | "INFORMATION_ONLY" | "NONE";

export interface CatalogFactCapability {
  readonly fieldId: string;
  readonly type: CatalogFactType;
  readonly unit?: string;
  readonly scope: CatalogFactScope;
  readonly evidenceState: CatalogFactEvidenceState;
  readonly allowedUses: readonly CatalogFactUse[];
  readonly decisionUse: CatalogDecisionUse;
  readonly nullSemantics: "UNKNOWN" | "NOT_APPLICABLE" | "NOT_AVAILABLE";
  readonly provenanceRequired: true;
  readonly userDisclosure: "NONE" | "UNVERIFIED_TR_EXACT" | "UNKNOWN" | "CONFLICT";
}

export interface CatalogFactCapabilityRegistryV2 {
  readonly version: "CATALOG-FACT-CAPABILITY-0.2";
  readonly catalogReleaseVersion: string;
  readonly catalogFingerprint: string;
  readonly evidenceReleaseFingerprints: readonly string[];
  readonly fields: readonly CatalogFactCapability[];
}

/** Hard-filter authority is deliberately narrower than informational reach. */
export function decisionUseForEvidence(state: CatalogFactEvidenceState, scope: CatalogFactScope): CatalogDecisionUse {
  if (state === "VERIFIED" && scope === "EXACT_VARIANT") return "HARD_FILTER";
  if (["PROVISIONAL", "FAMILY_LEVEL", "FOREIGN_MARKET", "CONDITIONAL"].includes(state)) return "SOFT_RANK";
  return "NONE";
}

export function createCatalogFactCapabilityRegistry(snapshot: CatalogSnapshot, evidenceReleaseFingerprints: readonly string[] = []): CatalogFactCapabilityRegistryV2 {
  const fields: CatalogFactCapability[] = [
    { fieldId: "identity.brand", type: "STRING", scope: "EXACT_VARIANT", evidenceState: "VERIFIED", allowedUses: ["READ", "FILTER", "SORT", "FACET", "COMPARE"], decisionUse: "HARD_FILTER", nullSemantics: "UNKNOWN", provenanceRequired: true, userDisclosure: "NONE" },
    { fieldId: "identity.model", type: "STRING", scope: "EXACT_VARIANT", evidenceState: "VERIFIED", allowedUses: ["READ", "FILTER", "SORT", "FACET", "COMPARE"], decisionUse: "HARD_FILTER", nullSemantics: "UNKNOWN", provenanceRequired: true, userDisclosure: "NONE" },
    { fieldId: "price.list", type: "NUMBER", unit: "TRY", scope: "EXACT_VARIANT", evidenceState: "UNKNOWN", allowedUses: ["READ", "SORT", "AGGREGATE", "COMPARE"], decisionUse: "NONE", nullSemantics: "UNKNOWN", provenanceRequired: true, userDisclosure: "UNKNOWN" },
    { fieldId: "equipment.*", type: "BOOLEAN", scope: "EXACT_VARIANT", evidenceState: "UNKNOWN", allowedUses: ["READ", "FACET", "QUESTION", "EXPLAIN"], decisionUse: "NONE", nullSemantics: "UNKNOWN", provenanceRequired: true, userDisclosure: "UNKNOWN" },
    { fieldId: "ownerManual.*", type: "LIST", scope: "FAMILY", evidenceState: "FAMILY_LEVEL", allowedUses: ["READ", "QUESTION", "EXPLAIN", "FACET"], decisionUse: "SOFT_RANK", nullSemantics: "UNKNOWN", provenanceRequired: true, userDisclosure: "UNVERIFIED_TR_EXACT" },
  ];
  return Object.freeze({ version: "CATALOG-FACT-CAPABILITY-0.2", catalogReleaseVersion: snapshot.authority.releaseVersion, catalogFingerprint: snapshot.authority.catalogFingerprint, evidenceReleaseFingerprints: Object.freeze([...evidenceReleaseFingerprints]), fields: Object.freeze(fields) });
}
