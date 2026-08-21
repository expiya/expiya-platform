import type { KnowledgeRecord } from "./schema";

export const KNOWLEDGE_DECISION_USE = "PUBLIC_EXPLANATION_ONLY" as const;

export function temporalAuthorityErrors(record: KnowledgeRecord, now: Date): readonly string[] {
  const errors: string[] = [];
  if (record.decisionUse !== KNOWLEDGE_DECISION_USE) errors.push("DECISION_USE_FORBIDDEN");
  if (new Date(record.effectiveAsOf) > now) errors.push("NOT_YET_EFFECTIVE");
  if (record.knowledgeClass === "CURRENT_MARKET_FACT") {
    if (record.statistic && record.provenance.some((source) => source.authority === "SECONDARY_METHODOLOGY")) errors.push("MARKET_FACT_PRIMARY_AUTHORITY_REQUIRED");
    if (record.economicIndicator && record.provenance.some((source) => source.authority === "SECONDARY_METHODOLOGY" && source.limitations.length === 0)) errors.push("SECONDARY_INDICATOR_SCOPE_REQUIRED");
    if (record.provenance.some((source) => !source.period || !source.market || !source.locator)) errors.push("MARKET_PROVENANCE_INCOMPLETE");
    if (!record.statistic && !record.economicIndicator && !record.regulation) errors.push("CURRENT_FACT_PAYLOAD_MISSING");
    if (record.regulation?.validUntil && new Date(record.regulation.validUntil) < now) errors.push("REGULATION_EXPIRED");
  }
  if (record.knowledgeClass === "FORECAST_OR_SCENARIO") {
    if (!record.forecast.horizon || record.forecast.assumptions.length === 0 || record.forecast.uncertainties.length === 0) errors.push("FORECAST_CONTRACT_INCOMPLETE");
  }
  return errors;
}

export function assertDecisionNeutralRecord(record: KnowledgeRecord): void {
  if (record.decisionUse !== KNOWLEDGE_DECISION_USE) throw new Error("KNOWLEDGE_DECISION_AUTHORITY_DENIED");
}
