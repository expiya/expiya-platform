export const MOBILITY_DEPARTMENT_ID = "MOBILITY" as const;
export const MOBILITY_CATEGORY_IDS = ["ELECTRIC_SCOOTER", "ELECTRIC_BICYCLE", "BICYCLE"] as const;
export type MobilityCategoryId = typeof MOBILITY_CATEGORY_IDS[number];
export type Known<T> = T | "UNKNOWN";
export interface MobilityProduct {
  readonly exactProductId: string; readonly categoryId: MobilityCategoryId; readonly brand: string; readonly family: string; readonly model: string; readonly variant: string;
  readonly configurationIdentity: string; readonly trApplicability: { readonly status: "VERIFIED"; readonly evidenceIds: readonly string[] };
  readonly facts: Readonly<Partial<Record<string, Known<string | number | boolean | readonly number[]>>>>;
  readonly capabilities: readonly string[]; readonly limitations: readonly string[]; readonly evidenceIds: readonly string[];
  readonly persona: { readonly hierarchy: readonly [string, string, string, string, string]; readonly status: "GOVERNED" | "UNKNOWN"; readonly evidenceClass: "INTENDED_POSITIONING" | "UNKNOWN" };
}
export const MOBILITY_NEEDS = ["USE", "PORTABILITY", "TERRAIN", "RANGE", "CARGO", "FIT", "FOLDING", "BUDGET"] as const;
export type MobilityNeed = typeof MOBILITY_NEEDS[number];
