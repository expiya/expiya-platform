import { describe, expect, it } from "vitest";
import { createExternalBlockerRegister, validateExternalBlockerRegister } from "./readiness/externalBlockerRegister";
describe("used-cars external blocker register", () => {
  it("maps every current open prerequisite to an owner and exit evidence", () => { const records = createExternalBlockerRegister(); expect(records).toHaveLength(176); expect(validateExternalBlockerRegister(records)).toEqual({ valid: true, missing: [], stale: [], duplicates: [], unsafe: [], externalActionsAuthorized: false }); });
  it("does not auto-close or authorize production effects", () => expect(createExternalBlockerRegister().every((item) => !item.autoCloseAllowed && !item.productionEffectAuthorized && item.exitEvidence.length > 0)).toBe(true));
});
