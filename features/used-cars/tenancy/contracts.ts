export type DealerRole =
  | "DEALER_OWNER" | "DEALER_ADMIN" | "BRANCH_MANAGER" | "INVENTORY_EDITOR"
  | "SALES_ADVISOR" | "REPORT_VIEWER";

export type ExpiyaRole = "EXPIYA_MODERATOR" | "EXPIYA_SYSTEM_ADMIN";

export interface TenantActor {
  readonly actorId: string;
  readonly tenantId: string;
  readonly role: DealerRole;
  readonly branchIds: readonly string[];
  readonly mfaVerified: boolean;
}

export type TenantResource = {
  readonly tenantId: string;
  readonly branchId?: string;
};

export function canAccessTenantResource(actor: TenantActor, resource: TenantResource): boolean {
  if (!actor.mfaVerified || actor.tenantId !== resource.tenantId) return false;
  if (!resource.branchId || actor.role === "DEALER_OWNER" || actor.role === "DEALER_ADMIN") return true;
  return actor.branchIds.includes(resource.branchId);
}
