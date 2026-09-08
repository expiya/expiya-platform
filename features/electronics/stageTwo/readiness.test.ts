import { describe, expect, it } from "vitest";
import { ELECTRONICS_CATEGORY_IDS } from "../architectureBaseline";
import { ELECTRONICS_STAGE_TWO_READINESS } from "./readiness";

describe("Electronics shared Stage 2 adapter admission", () => {
  it("keeps all 24 categories activation-ready but unregistered until migration and key readiness", () => {
    expect(ELECTRONICS_STAGE_TWO_READINESS.map(item => item.categoryId)).toEqual(ELECTRONICS_CATEGORY_IDS);
    expect(ELECTRONICS_STAGE_TWO_READINESS.every(item => item.readiness === "ACTIVATION_READY")).toBe(true);
    expect(ELECTRONICS_STAGE_TWO_READINESS.every(item => item.missing.includes("MIGRATION_0018_APPLY") && item.missing.includes("SIGNING_KEY_CONFIGURATION"))).toBe(true);
  });
});
