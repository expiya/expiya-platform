export type SupportAccessMode = "READ_ONLY" | "SCOPED_MUTATION";
export interface SupportAccessGrant {
  readonly grantId:string; readonly caseId:string; readonly actorId:string; readonly tenantId:string;
  readonly branchId:string|null; readonly reasonCode:string; readonly mode:SupportAccessMode;
  readonly mutationScopes:readonly string[]; readonly issuedAt:number; readonly expiresAt:number;
  readonly revokedAt:number|null; readonly approvedByActorId:string|null; readonly notificationRequired:boolean;
  readonly impersonationAllowed:false; readonly bulkExportAllowed:false;
}
export interface SupportAccessRequest { readonly actorId:string; readonly caseId:string; readonly tenantId:string; readonly branchId:string|null; readonly now:number; readonly operation:"READ"|"MUTATE"|"EXPORT"; readonly mutationScope?:string; readonly stepUpMfa:boolean }

export function evaluateSupportAccess(grant:SupportAccessGrant, request:SupportAccessRequest) {
  if (grant.revokedAt !== null) return {allowed:false as const, reason:"REVOKED" as const};
  if (request.now < grant.issuedAt || request.now >= grant.expiresAt) return {allowed:false as const, reason:"OUTSIDE_TIMEBOX" as const};
  if (grant.actorId !== request.actorId || grant.caseId !== request.caseId || grant.tenantId !== request.tenantId || grant.branchId !== request.branchId) return {allowed:false as const, reason:"BOUNDARY_MISMATCH" as const};
  if (request.operation === "EXPORT") return {allowed:false as const, reason:"BULK_EXPORT_FORBIDDEN" as const};
  if (request.operation === "MUTATE" && (grant.mode !== "SCOPED_MUTATION" || !request.mutationScope || !grant.mutationScopes.includes(request.mutationScope))) return {allowed:false as const, reason:"MUTATION_SCOPE_FORBIDDEN" as const};
  if (request.operation === "MUTATE" && (!request.stepUpMfa || grant.approvedByActorId === null || grant.approvedByActorId === request.actorId)) return {allowed:false as const, reason:"STEP_UP_OR_SECOND_APPROVAL_REQUIRED" as const};
  return {allowed:true as const, auditRequired:true as const, displayAdminBanner:true as const, actorIdentityMode:"EXPIYA_ADMIN" as const};
}

