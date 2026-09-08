import { ELECTRONICS_CATEGORY_REGISTRY } from "../architectureBaseline";

export const ELECTRONICS_STAGE_TWO_READINESS = Object.freeze(ELECTRONICS_CATEGORY_REGISTRY.map(category => Object.freeze({
  categoryId: category.categoryId,
  publicLabelTr: category.publicLabelTr,
  readiness: "ACTIVATION_READY" as const,
  missing: Object.freeze(["MIGRATION_0018_APPLY", "SIGNING_KEY_CONFIGURATION", "RUNTIME_ADAPTER_REGISTRATION"] as const),
})));

export function electronicsStageTwoReadiness(categoryId: string) {
  return ELECTRONICS_STAGE_TWO_READINESS.find(item => item.categoryId === categoryId);
}
