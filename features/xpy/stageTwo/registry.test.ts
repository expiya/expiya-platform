import { afterEach, describe, expect, it } from "vitest";
import { APPLIANCES_PRODUCT_TYPES } from "@/features/appliances/contracts";
import { ELECTRONICS_CATEGORY_IDS } from "@/features/electronics/architectureBaseline";
import { clearXpyStageTwoAdaptersForTests, registerXpyStageTwoAdapter, requireXpyStageTwoAdapter, stageTwoReadinessGate, XPY_STAGE_TWO_READINESS_INVENTORY } from "./registry";

afterEach(clearXpyStageTwoAdaptersForTests);
describe("AŞAMA 2 adapter admission and inventory", () => {
  it("inventories every current Stage 1 category without activating unsupported Stage 2", () => {
    expect(XPY_STAGE_TWO_READINESS_INVENTORY).toHaveLength(1 + APPLIANCES_PRODUCT_TYPES.length + ELECTRONICS_CATEGORY_IDS.length + 1 + 3 + 1);
    expect(XPY_STAGE_TWO_READINESS_INVENTORY.filter(item => item.readiness === "AUTHORIZED_EXISTING_RUNTIME")).toHaveLength(1 + APPLIANCES_PRODUCT_TYPES.length);
    expect(XPY_STAGE_TWO_READINESS_INVENTORY.find(item => item.departmentId === "MOBILITY")?.readiness).toBe("MISSING_STAGE_TWO_AUTHORITY");
    expect(XPY_STAGE_TWO_READINESS_INVENTORY.find(item => item.departmentId === "TOOLS")?.readiness).toBe("MISSING_STAGE_TWO_AUTHORITY");
  });
  it("fails closed when an authorized surface has no registered adapter", () => {
    expect(() => requireXpyStageTwoAdapter("CARS", "NEW_CAR")).toThrow("XPY_STAGE_TWO_ADAPTER_MISSING");
    expect(stageTwoReadinessGate().find(item => item.departmentId === "CARS")?.readiness).toBe("MISSING_ADAPTER");
  });
  it("rejects registrations outside existing signed authority", () => {
    expect(() => registerXpyStageTwoAdapter({ adapterVersion: "test", departmentId: "ELECTRONICS", categories: ["SMARTPHONE"], handoffAuthorityVersions: ["invented"], projectionSchemaVersions: ["invented"], comparisonRowsOwnedBy: "CATEGORY_DOMAIN_PACK", openSignedHandoff: async value => value, project: () => { throw new Error("not used"); }, answer: () => ({ status: "UNKNOWN", message: "" }) })).toThrow("XPY_STAGE_TWO_ADAPTER_UNAUTHORIZED");
  });
});
