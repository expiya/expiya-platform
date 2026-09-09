import { describe, expect, it } from "vitest";
import { requireActiveCategoryPMateriality } from "./runtimeAdmission.server";
import {
  bindPendingPMaterialityQuestion,
  createPMaterialityRuntimeSlice,
  nextPMaterialityRuntimeQuestion,
  projectPMaterialityCandidates,
  recordPMaterialityRuntimeAnswer,
} from "./runtimeConsumer";

const infoOnly = new Set(["AIR_PURIFIER", "BUILT_IN_MICROWAVE_OVEN", "HEADPHONES", "HOB", "SPLIT_AIR_CONDITIONER", "WASHING_MACHINE"]);
const categories = [
  "AIR_FRYER","AIR_PURIFIER","BICYCLE","BLENDER","BUILT_IN_MICROWAVE_OVEN","BUILT_IN_OVEN","COMPUTER_AUDIO","CORDLESS_DRILL","COUNTERTOP_MICROWAVE_OVEN","DIGITAL_CAMERA","DISHWASHER","DRYER","E_READER","ELECTRIC_BICYCLE","ELECTRIC_SCOOTER","ELECTRIC_STORAGE_WATER_HEATER","EXTERNAL_STORAGE","FILTER_COFFEE_MACHINE","FITNESS_TRACKER","FOOD_PROCESSOR","FREESTANDING_COOKER","FREEZER","FULLY_AUTOMATIC_ESPRESSO_MACHINE","GAME_CONSOLE","HEADPHONES","HOB","HOME_SECURITY_CAMERA","INSTANTANEOUS_ELECTRIC_WATER_HEATER","LAPTOP","MANUAL_ESPRESSO_MACHINE","MONITOR","NETWORK_ATTACHED_STORAGE","NEW_CAR","PORTABLE_SPEAKER","PRINTER","PROJECTOR","RANGE_HOOD","REFRIGERATOR","ROBOT_VACUUM","SMART_HOME_HUB","SMARTPHONE","SMARTWATCH","SOUNDBAR","SPLIT_AIR_CONDITIONER","STROLLER","TABLET","TELEVISION","TURKISH_COFFEE_MACHINE","UNINTERRUPTIBLE_POWER_SUPPLY","VACUUM","VIDEO_DOORBELL","WASHING_MACHINE","WEBCAM","WIFI_ROUTER_MESH",
] as const;

describe("active P-materiality runtime consumer", () => {
  it("separates artifact readiness from executable runtime consumption for all 54 categories", async () => {
    const rows = await Promise.all(categories.map(async categoryId => {
      const authority = await requireActiveCategoryPMateriality(categoryId);
      const slice = createPMaterialityRuntimeSlice({ departmentId: "TEST", authority });
      const next = nextPMaterialityRuntimeQuestion(slice, authority);
      expect(projectPMaterialityCandidates(slice, authority)).toHaveLength(authority.exactOfferingIds.length);
      return { categoryId, readiness: authority.readiness, consumption: next.runtimeConsumption };
    }));
    expect(rows).toHaveLength(54);
    expect(rows.filter(row => row.readiness === "P_READY" && row.consumption === "EXECUTABLE_MATERIAL_QUESTION")).toHaveLength(47);
    expect(rows.find(row => row.categoryId === "SMARTPHONE")).toMatchObject({ readiness: "P_READY", consumption: "NO_MATERIAL_QUESTION" });
    expect(rows.filter(row => row.readiness === "INFORMATION_ONLY" && row.consumption === "NO_MATERIAL_QUESTION").map(row => row.categoryId).sort()).toEqual([...infoOnly].sort());
  });

  it("runs Television's active 65-inch projection first and changes only soft order", async () => {
    const authority = await requireActiveCategoryPMateriality("TELEVISION");
    let slice = createPMaterialityRuntimeSlice({ departmentId: "ELECTRONICS", authority });
    const selected = nextPMaterialityRuntimeQuestion(slice, authority);
    expect(selected.selectedProjectionId).toBe("wave2.electronics.television.display_inches");
    expect(selected.selectedQuestion?.publicTurkishQuestion).toContain("65 inç");
    expect(selected.selectedQuestion?.publicTurkishQuestion).not.toMatch(/ROOM|CONTENT|PANEL|PLATFORM_SUPPORT|ne kadar önemli/iu);
    slice = bindPendingPMaterialityQuestion(slice, selected.selectedQuestion!.questionId);
    slice = recordPMaterialityRuntimeAnswer({ slice, authority, eventId: "tv-yes", operation: "ANSWER", answerId: "YES" });
    const candidates = projectPMaterialityCandidates(slice, authority);
    expect(candidates.map(item => item.exactProductId).sort()).toEqual([...authority.exactOfferingIds].sort());
    expect(candidates[0]).toMatchObject({ exactProductId: "electronics:television:samsung:qe75qn90fatxtk", manufacturer: "Samsung", modelCode: "QE75QN90FATXTK", softPreferred: true });
    expect(candidates.slice(1).every(item => !item.softPreferred)).toBe(true);
  });

  it("keeps UNKNOWN neutral and supports append-only correction and clear", async () => {
    const authority = await requireActiveCategoryPMateriality("TELEVISION");
    let slice = createPMaterialityRuntimeSlice({ departmentId: "ELECTRONICS", authority });
    const question = nextPMaterialityRuntimeQuestion(slice, authority).selectedQuestion!;
    slice = bindPendingPMaterialityQuestion(slice, question.questionId);
    slice = recordPMaterialityRuntimeAnswer({ slice, authority, eventId: "unknown", operation: "ANSWER", answerId: "UNKNOWN" });
    expect(projectPMaterialityCandidates(slice, authority).every(item => !item.softPreferred)).toBe(true);
    slice = recordPMaterialityRuntimeAnswer({ slice, authority, eventId: "correct", operation: "CORRECT", answerId: "YES" });
    expect(slice.answerLedger).toHaveLength(2);
    expect(projectPMaterialityCandidates(slice, authority)[0]?.softPreferred).toBe(true);
    slice = recordPMaterialityRuntimeAnswer({ slice, authority, eventId: "clear", operation: "CLEAR" });
    expect(slice.answerLedger).toHaveLength(3);
    expect(nextPMaterialityRuntimeQuestion(slice, authority).selectedQuestion?.questionId).toBe(question.questionId);
  });
});
