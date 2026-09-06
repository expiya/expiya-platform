import { describe, expect, it } from "vitest";
import { APPLIANCES_CATEGORY_REGISTRY } from "../categoryRegistry";
import { loadBatchBAuthorityAssessment } from "./authority.server";

describe("new appliance category Batch B authority", () => {
  it("preserves the historical partial assessment while allowing later exact-pair activation", async () => {
    const loaded = await loadBatchBAuthorityAssessment(process.cwd());
    expect(loaded.status).toBe("VALID_PARTIAL");
    if (loaded.status !== "VALID_PARTIAL") return;
    for (const result of loaded.report.categoryResults) expect(APPLIANCES_CATEGORY_REGISTRY.find(item => item.categoryId === result.categoryId)?.status).toBe("ACTIVE");
    expect(loaded.report.runtimeEffect).toMatchObject({ catalogMembersAdded: 9, activePointersCreated: 3, splitRouteOpened: false });
  });
});
