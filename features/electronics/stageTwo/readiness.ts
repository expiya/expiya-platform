import { ELECTRONICS_CATEGORY_REGISTRY } from "../architectureBaseline";

export const ELECTRONICS_STAGE_TWO_READINESS = Object.freeze(ELECTRONICS_CATEGORY_REGISTRY.map(category => Object.freeze({
  categoryId: category.categoryId,
  publicLabelTr: category.publicLabelTr,
  readiness: "MISSING_STAGE_TWO_AUTHORITY" as const,
  missing: Object.freeze(["SIGNED_STAGE_ONE_TO_STAGE_TWO_HANDOFF", "EXPLICIT_STAGE_TWO_CONSENT", "STAGE_TWO_HANDOFF_KEY_AUTHORITY", "CATEGORY_COMPARISON_ROWS"] as const),
})));

export function electronicsStageTwoReadiness(categoryId: string) {
  return ELECTRONICS_STAGE_TWO_READINESS.find(item => item.categoryId === categoryId);
}
