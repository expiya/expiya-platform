import { describe, expect, it } from "vitest";
import { APPLIANCES_PRODUCT_TYPES } from "@/features/appliances/contracts";
import { APPLIANCES_XPY_STAGE_TWO_ADAPTER } from "@/features/appliances/stageTwo/xpyStageTwoAdapter.server";
import { CARS_XPY_STAGE_TWO_ADAPTER } from "@/features/sales-advisor/xpyStageTwoAdapter.server";
import { requireXpyStageTwoAdapter, stageTwoReadinessGate } from "./registry";

describe("cross-domain shared Stage 2 registry", () => {
  it("keeps Cars and the single Appliances family independently registered", () => {
    expect(requireXpyStageTwoAdapter("CARS", "NEW_CAR")).toBe(CARS_XPY_STAGE_TWO_ADAPTER);
    for (const category of APPLIANCES_PRODUCT_TYPES) expect(requireXpyStageTwoAdapter("APPLIANCES", category)).toBe(APPLIANCES_XPY_STAGE_TWO_ADAPTER);
    expect(stageTwoReadinessGate().filter(item => item.departmentId === "CARS" || item.departmentId === "APPLIANCES").every(item => item.readiness === "AUTHORIZED_EXISTING_RUNTIME")).toBe(true);
  });
});
