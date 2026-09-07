import { ACTIVE_DEPARTMENT_REGISTRY, resolveDepartmentCapability } from "./departmentRegistry";

export type RootStageOneDepartment = "APPLIANCES" | "ELECTRONICS" | "BABY_AND_CHILD" | "MOBILITY";
export interface RootStageOneAdapter { readonly departmentId: RootStageOneDepartment; readonly endpoint: string; readonly categoryField: "productType" | "categoryId" }
export interface RootStageOneClientAdapter extends RootStageOneAdapter { readonly categoryId: string; readonly categoryLabel: string; readonly legacyDestination: string }

const adapters: Readonly<Record<RootStageOneDepartment, RootStageOneAdapter>> = Object.freeze({
  APPLIANCES: Object.freeze({ departmentId: "APPLIANCES", endpoint: "/api/appliances/conversation", categoryField: "productType" }),
  ELECTRONICS: Object.freeze({ departmentId: "ELECTRONICS", endpoint: "/api/electronics/conversation", categoryField: "categoryId" }),
  BABY_AND_CHILD: Object.freeze({ departmentId: "BABY_AND_CHILD", endpoint: "/api/baby/conversation", categoryField: "categoryId" }),
  MOBILITY: Object.freeze({ departmentId: "MOBILITY", endpoint: "/api/mobility/conversation", categoryField: "categoryId" }),
});

export function resolveRootStageOneAdapter(departmentId: string, categoryId: string): RootStageOneAdapter | undefined {
  const capability = resolveDepartmentCapability(departmentId, categoryId);
  if (!capability || capability.status !== "ACTIVE" || !capability.authorityBinding) return undefined;
  return adapters[departmentId as RootStageOneDepartment];
}

export function rootStageOneCoverage() {
  return ACTIVE_DEPARTMENT_REGISTRY.flatMap(department => Object.entries(department.capabilities).filter(([, capability]) => capability.status === "ACTIVE").map(([categoryId]) => ({ departmentId: department.departmentId, categoryId, supported: Boolean(resolveRootStageOneAdapter(department.departmentId, categoryId)) })));
}

export function rootStageOneClientAdapters(): readonly RootStageOneClientAdapter[] {
  return ACTIVE_DEPARTMENT_REGISTRY.flatMap(department => Object.entries(department.capabilities).flatMap(([categoryId, capability]) => {
    const adapter = resolveRootStageOneAdapter(department.departmentId, categoryId);
    return adapter ? [{ ...adapter, categoryId, categoryLabel: capability.publicLabelTr, legacyDestination: capability.destination }] : [];
  }));
}
