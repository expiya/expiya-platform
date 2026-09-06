import { APPLIANCES_PRODUCT_TYPES } from "@/features/appliances/contracts";
import { ELECTRONICS_CATEGORY_IDS } from "@/features/electronics/architectureBaseline";

export const XPY_STAGE_ONE_ADAPTER_REGISTRY = Object.freeze({
  TOOLS: Object.freeze({ CORDLESS_DRILL: "cordless-drill-stage1-presentation/v1" }),
  CARS: Object.freeze({ NEW_CAR: "cars-stage1-presentation/v1" }),
  APPLIANCES: Object.freeze(Object.fromEntries(APPLIANCES_PRODUCT_TYPES.map(category => [category, "appliances-stage1-presentation/v1"])) as Record<typeof APPLIANCES_PRODUCT_TYPES[number], string>),
  ELECTRONICS: Object.freeze(Object.fromEntries(ELECTRONICS_CATEGORY_IDS.map(category => [category, "electronics-stage1-presentation/v1"])) as Record<typeof ELECTRONICS_CATEGORY_IDS[number], string>),
  BABY_AND_CHILD: Object.freeze({ STROLLER: "baby-stroller-stage1-presentation/v1" }),
  MOBILITY: Object.freeze({ ELECTRIC_SCOOTER: "mobility-stage1-presentation/v1", ELECTRIC_BICYCLE: "mobility-stage1-presentation/v1", BICYCLE: "mobility-stage1-presentation/v1" }),
});

export function requireXpyStageOneAdapter(departmentId: keyof typeof XPY_STAGE_ONE_ADAPTER_REGISTRY, categoryId: string): string {
  const adapter = (XPY_STAGE_ONE_ADAPTER_REGISTRY[departmentId] as Readonly<Record<string, string>>)[categoryId];
  if (!adapter) throw new TypeError("STAGE_ONE_PRESENTATION_ADAPTER_MISSING");
  return adapter;
}
