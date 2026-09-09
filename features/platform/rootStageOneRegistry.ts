import { ACTIVE_DEPARTMENT_REGISTRY, resolveDepartmentCapability } from "./departmentRegistry";
import { requireXpyReentry } from "@/features/xpy/domainPacks";
import { honestXpyWelcomeFallback, renderXpyWelcomeSummary } from "@/features/xpy/welcomeKnowledge";

export type RootStageOneDepartment = "CARS" | "APPLIANCES" | "ELECTRONICS" | "BABY_AND_CHILD" | "MOBILITY" | "TOOLS";
export interface RootStageOneAdapter { readonly departmentId: RootStageOneDepartment; readonly endpoint: string; readonly categoryField: "productType" | "categoryId"; readonly mode: "DURABLE_CRUD" | "SIGNED_CRUD" | "CARS_V3" }
export interface RootStageOneClientAdapter extends RootStageOneAdapter { readonly categoryId: string; readonly categoryLabel: string; readonly legacyDestination: string; readonly welcomeSummary: string }

const adapters: Readonly<Record<RootStageOneDepartment, RootStageOneAdapter>> = Object.freeze({
  CARS: Object.freeze({ departmentId: "CARS", endpoint: "/api/cars/conversation/v3", categoryField: "categoryId", mode: "CARS_V3" }),
  APPLIANCES: Object.freeze({ departmentId: "APPLIANCES", endpoint: "/api/appliances/conversation", categoryField: "productType", mode: "DURABLE_CRUD" }),
  ELECTRONICS: Object.freeze({ departmentId: "ELECTRONICS", endpoint: "/api/electronics/conversation", categoryField: "categoryId", mode: "DURABLE_CRUD" }),
  BABY_AND_CHILD: Object.freeze({ departmentId: "BABY_AND_CHILD", endpoint: "/api/baby/conversation", categoryField: "categoryId", mode: "DURABLE_CRUD" }),
  MOBILITY: Object.freeze({ departmentId: "MOBILITY", endpoint: "/api/mobility/conversation", categoryField: "categoryId", mode: "DURABLE_CRUD" }),
  TOOLS: Object.freeze({ departmentId: "TOOLS", endpoint: "/api/tools/conversation", categoryField: "categoryId", mode: "SIGNED_CRUD" }),
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
    if (!adapter) return [];
    const reentry = requireXpyReentry(department.departmentId as RootStageOneDepartment, categoryId);
    const welcomeSummary = renderXpyWelcomeSummary(honestXpyWelcomeFallback(reentry, "İlk maddi ihtiyacınızı birlikte netleştirelim?"));
    return [{ ...adapter, categoryId, categoryLabel: capability.publicLabelTr, legacyDestination: capability.destination, welcomeSummary }];
  }));
}

const missingRootAdapters = rootStageOneCoverage().filter(row => !row.supported);
if (missingRootAdapters.length) throw new TypeError(`ROOT_STAGE_ONE_ADAPTER_MISSING:${missingRootAdapters.map(row => `${row.departmentId}/${row.categoryId}`).join(",")}`);
