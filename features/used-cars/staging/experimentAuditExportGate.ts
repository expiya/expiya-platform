export interface ExperimentAuditExport { readonly experimentId: string; readonly manifestChecksum: string; readonly allocationSummaryChecksum: string; readonly guardrailEvidenceChecksum: string; readonly stoppedResultsIncluded: true; readonly failedResultsIncluded: true; readonly rawPiiIncluded: false; readonly tenantCommercialAttributesIncluded: false; readonly reviewerId: string | null; readonly exportStorageRef: string | null; readonly exportExecuted: false }
export function validateExperimentAuditExport(record: ExperimentAuditExport) {
  const checksum = /^sha256:[a-f0-9]{64}$/u;
  const codes: string[] = [];
  for (const [name, value] of [["MANIFEST", record.manifestChecksum], ["ALLOCATION", record.allocationSummaryChecksum], ["GUARDRAIL", record.guardrailEvidenceChecksum]] as const) if (!checksum.test(value)) codes.push(`${name}_CHECKSUM_REQUIRED`);
  if (!record.stoppedResultsIncluded || !record.failedResultsIncluded) codes.push("FAILED_AND_STOPPED_RESULTS_REQUIRED");
  if (record.rawPiiIncluded || record.tenantCommercialAttributesIncluded) codes.push("AUDIT_DATA_BOUNDARY_VIOLATION");
  if (!record.reviewerId) codes.push("INDEPENDENT_REVIEW_REQUIRED");
  if (record.exportStorageRef || record.exportExecuted) codes.push("AUDIT_EXPORT_ENABLEMENT_FORBIDDEN");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), auditExportAuthorized: false as const });
}
