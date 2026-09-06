import { APPLIANCES_PRODUCT_TYPES } from "@/features/appliances/contracts";
import { ELECTRONICS_CATEGORY_IDS } from "@/features/electronics/architectureBaseline";
import { MOBILITY_CATEGORY_IDS } from "@/features/mobility/contracts";
import type { XpyStageTwoDomainAdapter } from "./contracts";

export const XPY_STAGE_TWO_AUTHORIZED_SURFACES = Object.freeze({
  CARS: Object.freeze({ categories: ["NEW_CAR"] as const, handoffAuthorityVersions: ["2.0.0"] as const, projectionSchemaVersions: ["variant-content/v2"] as const }),
  APPLIANCES: Object.freeze({ categories: APPLIANCES_PRODUCT_TYPES, handoffAuthorityVersions: ["appliances-stage2-handoff/v2"] as const, projectionSchemaVersions: ["appliances-advisor-read-projection/v1"] as const }),
});

export type XpyStageTwoReadiness = "AUTHORIZED_EXISTING_RUNTIME" | "MISSING_STAGE_TWO_AUTHORITY" | "MISSING_ADAPTER";
export interface XpyStageTwoReadinessRecord { readonly departmentId: string; readonly categoryId: string; readonly readiness: XpyStageTwoReadiness; readonly missing: readonly string[] }

const declaredCategories = Object.freeze({
  CARS: ["NEW_CAR"] as const,
  APPLIANCES: APPLIANCES_PRODUCT_TYPES,
  ELECTRONICS: ELECTRONICS_CATEGORY_IDS,
  BABY_AND_CHILD: ["STROLLER"] as const,
  MOBILITY: MOBILITY_CATEGORY_IDS,
});

export const XPY_STAGE_TWO_READINESS_INVENTORY: readonly XpyStageTwoReadinessRecord[] = Object.freeze(
  Object.entries(declaredCategories).flatMap(([departmentId, categories]) => categories.map(categoryId => {
    const surface = XPY_STAGE_TWO_AUTHORIZED_SURFACES[departmentId as keyof typeof XPY_STAGE_TWO_AUTHORIZED_SURFACES];
    return surface
      ? { departmentId, categoryId, readiness: "AUTHORIZED_EXISTING_RUNTIME" as const, missing: [] }
      : { departmentId, categoryId, readiness: "MISSING_STAGE_TWO_AUTHORITY" as const, missing: ["SIGNED_STAGE_ONE_TO_STAGE_TWO_HANDOFF", "STAGE_TWO_DOMAIN_ADAPTER", "CATEGORY_COMPARISON_ROWS"] };
  })),
);

const adapters = new Map<string, XpyStageTwoDomainAdapter<unknown>>();
const key = (departmentId: string, categoryId: string) => `${departmentId}:${categoryId}`;

export function registerXpyStageTwoAdapter<Opened>(adapter: XpyStageTwoDomainAdapter<Opened>): void {
  const surface = XPY_STAGE_TWO_AUTHORIZED_SURFACES[adapter.departmentId as keyof typeof XPY_STAGE_TWO_AUTHORIZED_SURFACES];
  if (!surface || adapter.comparisonRowsOwnedBy !== "CATEGORY_DOMAIN_PACK" || adapter.categories.length === 0) throw new TypeError("XPY_STAGE_TWO_ADAPTER_UNAUTHORIZED");
  if (adapter.categories.some(category => !surface.categories.includes(category as never))) throw new TypeError("XPY_STAGE_TWO_ADAPTER_CATEGORY_UNAUTHORIZED");
  if (adapter.handoffAuthorityVersions.some(version => !surface.handoffAuthorityVersions.includes(version as never))) throw new TypeError("XPY_STAGE_TWO_HANDOFF_VERSION_UNAUTHORIZED");
  if (adapter.projectionSchemaVersions.some(version => !surface.projectionSchemaVersions.includes(version as never))) throw new TypeError("XPY_STAGE_TWO_PROJECTION_VERSION_UNAUTHORIZED");
  for (const category of adapter.categories) adapters.set(key(adapter.departmentId, category), adapter as XpyStageTwoDomainAdapter<unknown>);
}

export function requireXpyStageTwoAdapter(departmentId: string, categoryId: string): XpyStageTwoDomainAdapter<unknown> {
  const adapter = adapters.get(key(departmentId, categoryId));
  if (!adapter) throw new TypeError("XPY_STAGE_TWO_ADAPTER_MISSING");
  return adapter;
}

export function clearXpyStageTwoAdaptersForTests(): void { adapters.clear(); }

export function stageTwoReadinessGate(): readonly XpyStageTwoReadinessRecord[] {
  return Object.freeze(XPY_STAGE_TWO_READINESS_INVENTORY.map(record => record.readiness === "AUTHORIZED_EXISTING_RUNTIME" && !adapters.has(key(record.departmentId, record.categoryId))
    ? { ...record, readiness: "MISSING_ADAPTER" as const, missing: ["REGISTERED_STAGE_TWO_ADAPTER"] }
    : record));
}
