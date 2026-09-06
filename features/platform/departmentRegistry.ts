import { APPLIANCES_CATEGORY_REGISTRY } from "@/features/appliances/categoryRegistry";
import { ELECTRONICS_CATEGORY_REGISTRY } from "@/features/electronics/architectureBaseline";
import { ELECTRONICS_CATEGORY_POLICY_VERSION } from "@/features/electronics/categoryPolicy";
export type DepartmentCapabilityStatus = "ACTIVE" | "NOT_READY" | "UNSUPPORTED";
export interface DepartmentRegistryEntry { readonly departmentId: string; readonly canonicalPath: `/${string}`; readonly status: "ACTIVE"; readonly capabilities: Readonly<Record<string, { readonly status: DepartmentCapabilityStatus; readonly authorityBinding?: string }>> }
const capabilities = Object.freeze(Object.fromEntries(APPLIANCES_CATEGORY_REGISTRY.map(category => [category.categoryId, Object.freeze({ status: category.status, ...(category.authorityBinding ? { authorityBinding: category.authorityBinding } : {}) })])));
const electronicsCapabilities = Object.freeze(Object.fromEntries(ELECTRONICS_CATEGORY_REGISTRY.map(category => [category.categoryId, Object.freeze({ status: "ACTIVE" as const, authorityBinding: ELECTRONICS_CATEGORY_POLICY_VERSION })])));
const entries = Object.freeze({ CARS: Object.freeze({ departmentId: "CARS", canonicalPath: "/cars", status: "ACTIVE", capabilities: Object.freeze({}) }), APPLIANCES: Object.freeze({ departmentId: "APPLIANCES", canonicalPath: "/appliances", status: "ACTIVE", capabilities }), ELECTRONICS: Object.freeze({ departmentId: "ELECTRONICS", canonicalPath: "/electronics", status: "ACTIVE", capabilities: electronicsCapabilities }) } satisfies Record<string, DepartmentRegistryEntry>);
export function resolveDepartment(departmentId: string): DepartmentRegistryEntry | undefined { return entries[departmentId as keyof typeof entries]; }
export function resolveDepartmentCapability(departmentId: string, productType: string) { return resolveDepartment(departmentId)?.capabilities[productType]; }
