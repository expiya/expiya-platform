import "server-only";

import { buildActiveCatalogInventory } from "@/features/semantic-decision-projection/v2/activeCatalogInventory.server";
import { XPY_STAGE_TWO_READINESS_INVENTORY, type XpyStageTwoReadiness } from "./registry";

export interface CurrentCatalogStageTwoReadiness {
  readonly departmentId: string;
  readonly categoryId: string;
  readonly exactOfferingCount: number;
  readonly readiness: XpyStageTwoReadiness;
  readonly missing: readonly string[];
}

/** Joins the production membership inventory to Stage 2 authority without promoting either. */
export async function buildCurrentCatalogStageTwoReadiness(root = process.cwd()): Promise<readonly CurrentCatalogStageTwoReadiness[]> {
  const inventory = await buildActiveCatalogInventory(root);
  const byKey = new Map(XPY_STAGE_TWO_READINESS_INVENTORY.map(item => [`${item.departmentId}:${item.categoryId}`, item]));
  return Object.freeze(inventory.map(item => {
    const stageTwo = byKey.get(`${item.departmentId}:${item.categoryId}`);
    return Object.freeze({ departmentId: item.departmentId, categoryId: item.categoryId, exactOfferingCount: item.exactOfferingIds.length, readiness: stageTwo?.readiness ?? "MISSING_STAGE_TWO_AUTHORITY", missing: stageTwo?.missing ?? ["SIGNED_STAGE_ONE_TO_STAGE_TWO_HANDOFF", "STAGE_TWO_DOMAIN_ADAPTER", "CATEGORY_COMPARISON_ROWS"] });
  }));
}
