export interface OpsAuditEvent {
  readonly version:"expiya-ops-audit/v1"; readonly eventId:string; readonly occurredAt:string;
  readonly actorId:string; readonly actorType:"EXPIYA_ADMIN"|"SYSTEM"; readonly action:string;
  readonly tenantId:string|null; readonly branchId:string|null; readonly caseId:string|null;
  readonly subjectType:string; readonly subjectId:string; readonly reasonCode:string;
  readonly oldValueRef:string|null; readonly newValueRef:string|null; readonly approvalChain:readonly string[];
  readonly piiAccessPurpose:string|null; readonly supportGrantId:string|null; readonly correlationId:string;
}
export function validateOpsAuditEvent(event:OpsAuditEvent) {
  const errors:string[]=[];
  if (!event.actorId || !event.action || !event.subjectId || !event.reasonCode || !event.correlationId) errors.push("CORE_FIELDS_REQUIRED");
  if ((event.oldValueRef === null) !== (event.newValueRef === null)) errors.push("CHANGE_PAIR_REQUIRED");
  if (event.approvalChain.length > 1 && new Set(event.approvalChain).size !== event.approvalChain.length) errors.push("APPROVAL_ACTORS_MUST_BE_DISTINCT");
  if (event.piiAccessPurpose && !event.tenantId) errors.push("PII_TENANT_CONTEXT_REQUIRED");
  return {valid:errors.length===0,errors:Object.freeze(errors),appendOnlyRequired:true as const,immutableSinkRequired:true as const};
}

