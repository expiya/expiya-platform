export interface ControlledDecision { readonly action:"APPROVE_DEALER"|"PERMANENTLY_CLOSE_DEALER"|"PERMANENTLY_REMOVE_LISTING"|"ACTIVATE_TAXONOMY_RELEASE"|"GRANT_PRIVILEGED_ROLE"; readonly requestedBy:string; readonly approvedBy:string|null; readonly reasonCode:string; readonly stepUpMfa:boolean }
export function evaluateFourEyes(decision:ControlledDecision) {
  if (!decision.reasonCode.trim()) return {allowed:false as const,reason:"REASON_REQUIRED" as const};
  if (!decision.stepUpMfa) return {allowed:false as const,reason:"STEP_UP_MFA_REQUIRED" as const};
  if (!decision.approvedBy) return {allowed:false as const,reason:"SECOND_APPROVER_REQUIRED" as const};
  if (decision.requestedBy === decision.approvedBy) return {allowed:false as const,reason:"SELF_APPROVAL_FORBIDDEN" as const};
  return {allowed:true as const,auditRequired:true as const};
}

export interface BreakGlassGrant { readonly incidentId:string; readonly actorId:string; readonly approvedBy:string; readonly reason:string; readonly issuedAt:number; readonly expiresAt:number; readonly stepUpMfa:boolean }
export function evaluateBreakGlass(grant:BreakGlassGrant, now:number) {
  const allowed = Boolean(grant.incidentId && grant.reason.trim() && grant.stepUpMfa && grant.actorId !== grant.approvedBy && now >= grant.issuedAt && now < grant.expiresAt);
  return {allowed, sessionRecordingRequired:true as const, postIncidentReviewRequired:true as const, tenantNotificationDecisionRequired:true as const, exportAllowed:false as const};
}

