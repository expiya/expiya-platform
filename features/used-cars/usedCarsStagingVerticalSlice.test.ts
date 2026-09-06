import { describe, expect, it } from "vitest";
import { assessStagingVerticalSlice, usedCarsFirstStagingVerticalSlice } from "./staging/verticalSlice";
describe("used-cars first staging vertical slice", () => {
  it("covers identity through audit in eight checkpoints", () => expect(usedCarsFirstStagingVerticalSlice.map((item) => item.step)).toEqual(["IDENTITY_LOGIN", "TENANT_CONTEXT", "INVENTORY_CREATE", "MODERATION_REVIEW", "PUBLIC_PROJECTION", "LISTING_READ", "FAIL_CLOSED_SUSPENSION", "AUDIT_CHAIN"]));
  it("allows no external side effects", () => expect(usedCarsFirstStagingVerticalSlice.every((item) => !item.externalSideEffectAllowed)).toBe(true));
  it("fails closed before real evidence exists", () => expect(assessStagingVerticalSlice([])).toMatchObject({ complete: false, productionPromotionAuthorized: false, realDataUseAuthorized: false }));
});
