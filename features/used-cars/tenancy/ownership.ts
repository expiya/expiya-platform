export interface TenantOwnedReference { readonly tenantId: string; readonly branchId?: string }
export function assertSameTenant(parent: TenantOwnedReference, child: TenantOwnedReference): void { if (parent.tenantId !== child.tenantId) throw new Error("CROSS_TENANT_REFERENCE_FORBIDDEN"); }
export function assertSameTenantAndBranch(parent: Required<TenantOwnedReference>, child: Required<TenantOwnedReference>): void { assertSameTenant(parent, child); if (parent.branchId !== child.branchId) throw new Error("CROSS_BRANCH_REFERENCE_FORBIDDEN"); }
export interface CompositeOwnershipKey { readonly tenantId: string; readonly entityId: string }
export function compositeOwnershipKey(tenantId: string, entityId: string): CompositeOwnershipKey { if (!tenantId || !entityId) throw new Error("COMPOSITE_KEY_PART_REQUIRED"); return Object.freeze({ tenantId, entityId }); }
