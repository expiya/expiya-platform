import portfolio from "@/data/governance/appliances/new-category-portfolio/releases/APPLIANCES-NEW-CATEGORY-PORTFOLIO-TR-v0.1/portfolio.json";

export const APPLIANCES_PORTFOLIO_AUTHORITY_ID = "APPLIANCES-NEW-CATEGORY-PORTFOLIO-TR/v0.1" as const;
export const APPLIANCES_PORTFOLIO_DIGEST = "sha256:719090386cd90a2959e6632c40da8c605229da83f10f69cb0b22941433cdadab" as const;

export const ACTIVE_APPLIANCES_CATEGORY_IDS = ["WASHING_MACHINE", "REFRIGERATOR", "DISHWASHER", "DRYER", "VACUUM", "ROBOT_VACUUM", "FREEZER", "BUILT_IN_OVEN", "FREESTANDING_COOKER", "HOB", "RANGE_HOOD", "COUNTERTOP_MICROWAVE_OVEN", "BUILT_IN_MICROWAVE_OVEN", "AIR_PURIFIER", "FULLY_AUTOMATIC_ESPRESSO_MACHINE", "MANUAL_ESPRESSO_MACHINE", "FILTER_COFFEE_MACHINE", "TURKISH_COFFEE_MACHINE", "AIR_FRYER", "BLENDER", "FOOD_PROCESSOR", "ELECTRIC_STORAGE_WATER_HEATER", "INSTANTANEOUS_ELECTRIC_WATER_HEATER", "SPLIT_AIR_CONDITIONER"] as const;
export const INACTIVE_APPLIANCES_CATEGORY_IDS = [] as const;
export const APPLIANCES_CATEGORY_IDS = [...ACTIVE_APPLIANCES_CATEGORY_IDS, ...INACTIVE_APPLIANCES_CATEGORY_IDS] as const;
export type ActiveAppliancesCategoryId = typeof ACTIVE_APPLIANCES_CATEGORY_IDS[number];
export type InactiveAppliancesCategoryId = typeof INACTIVE_APPLIANCES_CATEGORY_IDS[number];
export type AppliancesCategoryId = typeof APPLIANCES_CATEGORY_IDS[number];
export type AppliancesCategoryStatus = "ACTIVE" | "NOT_READY";

const activeLabels: Readonly<Record<ActiveAppliancesCategoryId, string>> = Object.freeze({
  WASHING_MACHINE: "Çamaşır makinesi", REFRIGERATOR: "Buzdolabı", DISHWASHER: "Bulaşık makinesi",
  DRYER: "Kurutma makinesi", VACUUM: "Kablolu torbasız süpürge", ROBOT_VACUUM: "Robot süpürge",
  FREEZER: "Derin dondurucu", BUILT_IN_OVEN: "Ankastre fırın", FREESTANDING_COOKER: "Solo fırınlı ocak", HOB: "Ankastre ocak", RANGE_HOOD: "Davlumbaz ve aspiratör",
  COUNTERTOP_MICROWAVE_OVEN: "Tezgâh üstü mikrodalga fırın", BUILT_IN_MICROWAVE_OVEN: "Ankastre mikrodalga fırın", AIR_PURIFIER: "Hava temizleyici", SPLIT_AIR_CONDITIONER: "Ev tipi split klima",
  FULLY_AUTOMATIC_ESPRESSO_MACHINE: "Tam otomatik espresso makinesi", MANUAL_ESPRESSO_MACHINE: "Manuel espresso makinesi", FILTER_COFFEE_MACHINE: "Filtre kahve makinesi", TURKISH_COFFEE_MACHINE: "Türk kahvesi makinesi",
  AIR_FRYER: "Airfryer / sıcak hava fritözü", BLENDER: "Blender", FOOD_PROCESSOR: "Mutfak robotu", ELECTRIC_STORAGE_WATER_HEATER: "Elektrikli termosifon", INSTANTANEOUS_ELECTRIC_WATER_HEATER: "Elektrikli şofben",
});

const inactiveIds = new Set<string>(INACTIVE_APPLIANCES_CATEGORY_IDS);
const frozenCategories = portfolio.payload.categories;
if (portfolio.payloadDigest !== APPLIANCES_PORTFOLIO_DIGEST || portfolio.payload.authorityId !== APPLIANCES_PORTFOLIO_AUTHORITY_ID ||
    frozenCategories.length !== 18 || frozenCategories.some(({ categoryId }) => !inactiveIds.has(categoryId) && !(ACTIVE_APPLIANCES_CATEGORY_IDS as readonly string[]).includes(categoryId))) {
  throw new TypeError("APPLIANCES_PORTFOLIO_REGISTRY_MISMATCH");
}

export interface AppliancesCategoryRegistration {
  readonly categoryId: AppliancesCategoryId;
  readonly publicLabelTr: string;
  readonly status: AppliancesCategoryStatus;
  readonly authorityBinding?: string;
  readonly route: `/appliances?category=${string}#asama-1`;
}

const inactive = frozenCategories.filter(({ categoryId }) => inactiveIds.has(categoryId)).map(({ categoryId, publicLabelTr }) => Object.freeze({
  categoryId: categoryId as InactiveAppliancesCategoryId, publicLabelTr, status: "NOT_READY" as const,
  route: `/appliances?category=${categoryId}#asama-1` as const,
}));
export const APPLIANCES_CATEGORY_REGISTRY: readonly AppliancesCategoryRegistration[] = Object.freeze([
  ...ACTIVE_APPLIANCES_CATEGORY_IDS.map(categoryId => Object.freeze({ categoryId, publicLabelTr: activeLabels[categoryId], status: "ACTIVE" as const, authorityBinding: categoryId, route: `/appliances?category=${categoryId}#asama-1` as const })),
  ...inactive,
]);
const byId = new Map(APPLIANCES_CATEGORY_REGISTRY.map(entry => [entry.categoryId, entry] as const));

export const isAppliancesCategoryId = (value: string): value is AppliancesCategoryId => byId.has(value as AppliancesCategoryId);
export const isActiveAppliancesCategoryId = (value: AppliancesCategoryId): value is ActiveAppliancesCategoryId => (ACTIVE_APPLIANCES_CATEGORY_IDS as readonly string[]).includes(value);
export const resolveAppliancesCategory = (value: string): AppliancesCategoryRegistration | undefined => isAppliancesCategoryId(value) ? byId.get(value) : undefined;
export function parseAppliancesCategoryRoute(value: string | string[] | undefined): { status: "ACTIVE" | "NOT_READY"; category: AppliancesCategoryRegistration } | { status: "UNSUPPORTED" } {
  const raw = Array.isArray(value) ? value[0] : value;
  const category = raw ? resolveAppliancesCategory(raw) : undefined;
  return category ? { status: category.status, category } : { status: "UNSUPPORTED" };
}
export const validatePersistedAppliancesCategory = (value: string) => parseAppliancesCategoryRoute(value);
