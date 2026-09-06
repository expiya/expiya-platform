import { describe, expect, it } from "vitest";
import { APPLIANCES_CATEGORY_REGISTRY } from "../categoryRegistry";
import { loadBatchCAuthorityAssessment } from "./authority.server";

describe("new appliance category Batch C authority", () => {
  it("activates four separately digested coffee journeys with closed policy boundaries", async () => {
    const loaded = await loadBatchCAuthorityAssessment(process.cwd());
    expect(loaded.status).toBe("VALID_ACTIVE");
    if (loaded.status !== "VALID_ACTIVE") return;
    expect(new Set(loaded.report.categoryResults.map(result => result.releaseDigest)).size).toBe(4);
    for (const result of loaded.report.categoryResults) {
      expect(APPLIANCES_CATEGORY_REGISTRY.find(item => item.categoryId === result.categoryId)).toMatchObject({ status: "ACTIVE", authorityBinding: result.categoryId });
      expect(result.members).toHaveLength(3);
      expect(new Set(result.brands).size).toBeGreaterThanOrEqual(2);
    }
    expect(loaded.report.policyBoundaries).toMatchObject({ persona: "PLANNING_ONLY_NO_Y_EFFECT", advisor: "READ_ONLY_NOT_Y", affiliate: "NEVER_RANKS", unknown: "NEUTRAL_NON_ADVANTAGING" });
  });
});
