import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { XPY_DOMAIN_PACKS } from "./domainPacks";
import { bindXpyRuntime, XPY_RUNTIME_CONTRACT, XPY_RUNTIME_DIGEST, XPY_RUNTIME_VERSION } from "./runtimeContract";

describe("XPY_RUNTIME/v0.1 authority binding", () => {
  it("keeps the executable ownership contract digest-bound", () => {
    expect(createHash("sha256").update(JSON.stringify(XPY_RUNTIME_CONTRACT)).digest("hex")).toBe(XPY_RUNTIME_DIGEST);
    expect(XPY_RUNTIME_CONTRACT).toMatchObject({
      version: XPY_RUNTIME_VERSION,
      order: ["PREFLIGHT", "X", "VALIDATION", "P", "Y", "COMMIT", "PRESENT"],
      compatibility: "LEGACY_DOMAIN_ENGINES_MAY_ONLY_RUN_BEHIND_XPY_PORTS",
    });
  });

  it("binds every registered active department capability to one runtime version", () => {
    const bindings = Object.values(XPY_DOMAIN_PACKS).flatMap(pack => pack.categories.map(category => bindXpyRuntime(pack, category)));
    // Cars, all Appliances categories, and all 24 Electronics categories share this runtime.
    expect(bindings).toHaveLength(49);
    expect(new Set(bindings.map(binding => binding.version))).toEqual(new Set([XPY_RUNTIME_VERSION]));
    expect(new Set(bindings.map(binding => binding.digest))).toEqual(new Set([XPY_RUNTIME_DIGEST]));
    expect(bindings.map(binding => `${binding.domainPackId}:${binding.category}`).slice(0, 25)).toEqual([
      "cars-stage1/v3.8:NEW_CAR",
      "appliances-stage1/v1:WASHING_MACHINE",
      "appliances-stage1/v1:REFRIGERATOR",
      "appliances-stage1/v1:DISHWASHER",
      "appliances-stage1/v1:DRYER",
      "appliances-stage1/v1:VACUUM",
      "appliances-stage1/v1:ROBOT_VACUUM",
      "appliances-stage1/v1:FREEZER",
      "appliances-stage1/v1:BUILT_IN_OVEN",
      "appliances-stage1/v1:FREESTANDING_COOKER",
      "appliances-stage1/v1:HOB",
      "appliances-stage1/v1:RANGE_HOOD",
      "appliances-stage1/v1:COUNTERTOP_MICROWAVE_OVEN",
      "appliances-stage1/v1:BUILT_IN_MICROWAVE_OVEN",
      "appliances-stage1/v1:AIR_PURIFIER",
      "appliances-stage1/v1:FULLY_AUTOMATIC_ESPRESSO_MACHINE",
      "appliances-stage1/v1:MANUAL_ESPRESSO_MACHINE",
      "appliances-stage1/v1:FILTER_COFFEE_MACHINE",
      "appliances-stage1/v1:TURKISH_COFFEE_MACHINE",
      "appliances-stage1/v1:AIR_FRYER",
      "appliances-stage1/v1:BLENDER",
      "appliances-stage1/v1:FOOD_PROCESSOR",
      "appliances-stage1/v1:ELECTRIC_STORAGE_WATER_HEATER",
      "appliances-stage1/v1:INSTANTANEOUS_ELECTRIC_WATER_HEATER",
      "appliances-stage1/v1:SPLIT_AIR_CONDITIONER",
    ]);
    expect(bindings.filter(binding => binding.domainPackId === "electronics-stage1/v1")).toHaveLength(24);
  });
});
