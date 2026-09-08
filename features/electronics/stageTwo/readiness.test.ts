import { describe, expect, it } from "vitest";
import { ELECTRONICS_CATEGORY_IDS } from "../architectureBaseline";
import { ELECTRONICS_STAGE_TWO_READINESS } from "./readiness";

describe("Electronics shared Stage 2 adapter admission", () => {
  it("keeps all 24 categories fail-closed until signed decision and consent authority exists", () => {
    expect(ELECTRONICS_STAGE_TWO_READINESS.map(item => item.categoryId)).toEqual(ELECTRONICS_CATEGORY_IDS);
    expect(ELECTRONICS_STAGE_TWO_READINESS.every(item => item.readiness === "MISSING_STAGE_TWO_AUTHORITY")).toBe(true);
    expect(ELECTRONICS_STAGE_TWO_READINESS.every(item => item.missing.includes("SIGNED_STAGE_ONE_TO_STAGE_TWO_HANDOFF") && item.missing.includes("EXPLICIT_STAGE_TWO_CONSENT"))).toBe(true);
  });
});
