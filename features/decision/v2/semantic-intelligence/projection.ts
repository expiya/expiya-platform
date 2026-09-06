import type { JsonSafeValue } from "../interpretation/types";
import type { CatalogCapabilityRegistry } from "./catalogCapability";
import type { AutomotiveSemanticResult } from "./types";

export interface CatalogSemanticProjectionEntry { readonly signalId: string; readonly fieldId?: string; readonly normalizedValue?: JsonSafeValue; readonly evaluability: "EVALUABLE" | "UNCONFIRMED" | "UNSUPPORTED" | "INSUFFICIENT_COVERAGE"; readonly catalogFingerprint: string; readonly universeFingerprint: string }
export interface CatalogSemanticProjection { readonly contractVersion: "CATALOG-SEMANTIC-PROJECTION-0.1"; readonly entries: readonly CatalogSemanticProjectionEntry[]; readonly decisionAuthority: "NONE" }

export function projectCatalogSemantics(result: AutomotiveSemanticResult, registry: CatalogCapabilityRegistry): CatalogSemanticProjection {
  const signals = [...result.concepts, ...result.archetypes, ...result.qualitativeNeeds];
  return Object.freeze({ contractVersion: "CATALOG-SEMANTIC-PROJECTION-0.1", entries: Object.freeze(signals.map((signal) => {
    const capability = signal.projectionHint ? registry.entries.find((entry) => entry.fieldId === signal.projectionHint!.fieldId) : undefined;
    const evaluability = signal.confirmationStatus !== "CONFIRMED_BY_USER" || signal.explicitness !== "USER_EXPLICIT" ? "UNCONFIRMED" : !capability || capability.status === "UNSUPPORTED" ? "UNSUPPORTED" : capability.status === "INSUFFICIENT_COVERAGE" ? "INSUFFICIENT_COVERAGE" : "EVALUABLE";
    return Object.freeze({ signalId: signal.id, ...(signal.projectionHint ? { fieldId: signal.projectionHint.fieldId, normalizedValue: signal.projectionHint.normalizedValue } : {}), evaluability, catalogFingerprint: registry.catalogFingerprint, universeFingerprint: registry.universeFingerprint });
  })), decisionAuthority: "NONE" });
}
