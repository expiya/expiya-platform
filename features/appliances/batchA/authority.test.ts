import { describe, expect, it } from "vitest";
import { APPLIANCES_CATEGORY_REGISTRY } from "../categoryRegistry";
import { loadBatchAAuthorityAssessment } from "./authority.server";

describe("new appliance category Batch A authority", () => {
  it("validates the immutable assessment and active technical authorities independently of partial joins", async () => {
    const loaded = await loadBatchAAuthorityAssessment(process.cwd());
    expect(loaded.status).toBe("VALID_ACTIVE");
    if (loaded.status !== "VALID_ACTIVE") return;
    expect(loaded.report.categoryResults).toHaveLength(5);
    for (const result of loaded.report.categoryResults) {
      expect(result.status).toBe("ACTIVE");
      expect(APPLIANCES_CATEGORY_REGISTRY.find(item => item.categoryId === result.categoryId)?.status).toBe("ACTIVE");
    }
    expect(loaded.report.runtimeEffect).toMatchObject({ catalogMembersAdded: 5, activePointersCreated: 5, routesOpened: true });
  });
});
