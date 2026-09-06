export interface FeedLoadReconciliationEvidence { readonly batchRows: number; readonly completedWithinSeconds: number; readonly retryProducedSameOutcome: boolean; readonly payloadConflictRejected: boolean; readonly creates: number; readonly updates: number; readonly unchanged: number; readonly explicitClosures: number; readonly omittedButUntouched: number; readonly omissionDeletionCount: number; readonly crossTenantMutationCount: number; readonly errorReportRedacted: true; readonly evidenceChecksum: string; readonly supportOwnerId: string | null; readonly syntheticOnly: true }
export function assessFeedLoadReconciliationGate(evidence: FeedLoadReconciliationEvidence) {
  const codes: string[] = [];
  if (evidence.batchRows !== 10_000) codes.push("TEN_THOUSAND_ROW_BATCH_REQUIRED");
  if (evidence.completedWithinSeconds <= 0 || evidence.completedWithinSeconds > 900) codes.push("LOAD_TIME_OBJECTIVE_FAILED");
  if (!evidence.retryProducedSameOutcome || !evidence.payloadConflictRejected) codes.push("IDEMPOTENCY_EVIDENCE_REQUIRED");
  if (evidence.omissionDeletionCount !== 0 || evidence.crossTenantMutationCount !== 0) codes.push("MUTATION_BOUNDARY_VIOLATION");
  if (!evidence.errorReportRedacted || !/^sha256:[a-f0-9]{64}$/u.test(evidence.evidenceChecksum)) codes.push("REDACTED_EVIDENCE_REQUIRED");
  if (!evidence.supportOwnerId) codes.push("SUPPORT_OWNER_REQUIRED");
  return Object.freeze({ passed: codes.length === 0, codes: Object.freeze(codes), realFeedConnectionAuthorized: false as const, inventoryWriteAuthorized: false as const });
}
