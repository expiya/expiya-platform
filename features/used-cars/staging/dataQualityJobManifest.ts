export type DataQualityJobKind = "PRICE_FRESHNESS" | "STOCK_FRESHNESS" | "DUPLICATE_CANDIDATES" | "TAXONOMY_REFERENCES" | "EVIDENCE_CONFLICTS" | "SOLD_PUBLIC_REMOVAL";
export interface DataQualityJobDefinition { readonly job: DataQualityJobKind; readonly scheduleMinutes: number; readonly tenantScoped: true; readonly idempotent: true; readonly syntheticOnly: true; readonly rawIdentifiersInLogs: false; readonly failureMode: "FAIL_CLOSED"; readonly productionEnabled: false }
export const usedCarsStagingDataQualityJobs: readonly DataQualityJobDefinition[] = Object.freeze([
  { job: "PRICE_FRESHNESS", scheduleMinutes: 60, tenantScoped: true, idempotent: true, syntheticOnly: true, rawIdentifiersInLogs: false, failureMode: "FAIL_CLOSED", productionEnabled: false },
  { job: "STOCK_FRESHNESS", scheduleMinutes: 15, tenantScoped: true, idempotent: true, syntheticOnly: true, rawIdentifiersInLogs: false, failureMode: "FAIL_CLOSED", productionEnabled: false },
  { job: "DUPLICATE_CANDIDATES", scheduleMinutes: 60, tenantScoped: true, idempotent: true, syntheticOnly: true, rawIdentifiersInLogs: false, failureMode: "FAIL_CLOSED", productionEnabled: false },
  { job: "TAXONOMY_REFERENCES", scheduleMinutes: 60, tenantScoped: true, idempotent: true, syntheticOnly: true, rawIdentifiersInLogs: false, failureMode: "FAIL_CLOSED", productionEnabled: false },
  { job: "EVIDENCE_CONFLICTS", scheduleMinutes: 15, tenantScoped: true, idempotent: true, syntheticOnly: true, rawIdentifiersInLogs: false, failureMode: "FAIL_CLOSED", productionEnabled: false },
  { job: "SOLD_PUBLIC_REMOVAL", scheduleMinutes: 5, tenantScoped: true, idempotent: true, syntheticOnly: true, rawIdentifiersInLogs: false, failureMode: "FAIL_CLOSED", productionEnabled: false },
]);
export function validateDataQualityJobManifest(jobs: readonly DataQualityJobDefinition[]) {
  const required: readonly DataQualityJobKind[] = ["PRICE_FRESHNESS", "STOCK_FRESHNESS", "DUPLICATE_CANDIDATES", "TAXONOMY_REFERENCES", "EVIDENCE_CONFLICTS", "SOLD_PUBLIC_REMOVAL"];
  const missing = required.filter((job) => !jobs.some((item) => item.job === job && item.tenantScoped && item.idempotent && item.syntheticOnly && !item.rawIdentifiersInLogs && item.failureMode === "FAIL_CLOSED" && !item.productionEnabled));
  const unsafeCadence = jobs.filter((item) => item.scheduleMinutes < 5 || item.scheduleMinutes > 60).map((item) => item.job);
  return Object.freeze({ valid: missing.length === 0 && unsafeCadence.length === 0, missing: Object.freeze(missing), unsafeCadence: Object.freeze(unsafeCadence), productionJobsAuthorized: false as const });
}
