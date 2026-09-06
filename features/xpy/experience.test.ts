import { describe, expect, it } from "vitest";
import { defineXpyExperienceAdapter, XPY_EXPERIENCE_VERSION } from "./experience";
import { APPLIANCES_EXPERIENCE, APPLIANCES_STAGE_ONE_VISUAL_PACK, CARS_EXPERIENCE, CARS_STAGE_ONE_VISUAL_PACK, XPY_GLOBAL_STAGE_ONE_TOKENS } from "./visualPacks";

describe("XPY Experience System", () => {
  it("propagates global accessibility and structure tokens to every domain", () => {
    for (const pack of [CARS_STAGE_ONE_VISUAL_PACK, APPLIANCES_STAGE_ONE_VISUAL_PACK]) expect(pack.tokens).toBe(XPY_GLOBAL_STAGE_ONE_TOKENS);
  });

  it("isolates domain art direction without forking structure", () => {
    expect(CARS_STAGE_ONE_VISUAL_PACK.sceneConcept).toBe("ROAD");
    expect(APPLIANCES_STAGE_ONE_VISUAL_PACK.sceneConcept).toBe("STUDIO_CYCLORAMA");
    expect(CARS_STAGE_ONE_VISUAL_PACK.slots).toEqual(APPLIANCES_STAGE_ONE_VISUAL_PACK.slots);
    expect(CARS_STAGE_ONE_VISUAL_PACK.visualPackId).not.toBe(APPLIANCES_STAGE_ONE_VISUAL_PACK.visualPackId);
  });

  it("contains no executable authority hooks", () => {
    for (const pack of [CARS_STAGE_ONE_VISUAL_PACK, APPLIANCES_STAGE_ONE_VISUAL_PACK]) expect(Object.values(pack).some(value => typeof value === "function")).toBe(false);
  });

  it("registers all stages while keeping AŞAMA 3 unavailable", () => {
    expect(CARS_EXPERIENCE.stages.map(stage => stage.id)).toEqual(APPLIANCES_EXPERIENCE.stages.map(stage => stage.id));
    expect(APPLIANCES_EXPERIENCE.stages[1].availability).toBe("REQUIRES_HANDOFF");
    expect(APPLIANCES_EXPERIENCE.stages[2].availability).toBe("UNAVAILABLE");
  });

  it("allows a future department to register data without copying a shell", () => {
    const future = defineXpyExperienceAdapter({ experienceVersion: XPY_EXPERIENCE_VERSION, departmentId: "HOTELS", visualPack: { ...APPLIANCES_STAGE_ONE_VISUAL_PACK, visualPackId: "hotels-visual/test", domainPackId: "hotels/test", publicName: "Hotels", sceneConcept: "NEUTRAL" }, stages: [
      { id: "STAGE_1_DECISION", label: "Aşama 1", href: "/hotels", availability: "AVAILABLE" },
      { id: "STAGE_2_EVALUATION", label: "Aşama 2", href: "/hotels/stage/2", availability: "UNAVAILABLE", unavailableReason: "Test boundary" },
      { id: "STAGE_3_ACTION", label: "Aşama 3", href: "/hotels/stage/3", availability: "UNAVAILABLE", unavailableReason: "Test boundary" },
    ] });
    expect(future.departmentId).toBe("HOTELS");
    expect(future.stages).toHaveLength(3);
  });
});
