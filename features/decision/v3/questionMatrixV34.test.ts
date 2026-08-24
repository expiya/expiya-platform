import { describe, expect, it } from "vitest";
import { activeDecisionPreferences } from "./ledger";
import { evaluateV3Catalog } from "./catalogAdapter.server";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { usageQuestionOrder } from "./usageQuestionMatrix";

async function turn(state: ReturnType<typeof createV3ConversationState>, id: string, message: string) {
  return runV3Turn({ conversationId: state.conversationId, messageId: id, message, expectedRevision: state.revision, state });
}

describe("V3.4 usage-specific question matrix", () => {
  it("prioritizes parking equipment before body and fuel for urban use", async () => {
    let state = createV3ConversationState("urban-matrix");
    state = (await turn(state, "1", "Yeni araç almak istiyorum")).state;
    const output = await turn(state, "2", "Şehir içinde günlük kullanacağım");
    expect(output.state.lastQuestionKey).toBe("parkingEquipment");
    expect(output.message).toMatch(/geri görüş kamerası|park sensörleri/iu);
  });

  it("prioritizes fuel before body for commercial load use", async () => {
    let state = createV3ConversationState("commercial-matrix");
    state = (await turn(state, "1", "Araç almak istiyorum")).state;
    const output = await turn(state, "2", "İşim için yük ve malzeme taşıyacağım");
    expect(output.state.lastQuestionKey).toBe("fuelType");
  });

  it("keeps budget immediately after body once earlier usage priorities are resolved", async () => {
    let state = createV3ConversationState("urban-budget-order");
    for (const [id, message] of [["1", "Araç almak istiyorum"], ["2", "Şehir içinde günlük kullanacağım"], ["3", "Geri görüş kamerası kesin olsun"], ["4", "Parkı kolay hatchback olsun"]] as const) state = (await turn(state, id, message)).state;
    expect(state.lastQuestionKey).toBe("budget");
  });

  it("projects an explicit equipment answer as a hard catalog preference", async () => {
    let state = createV3ConversationState("equipment-ledger");
    state = (await turn(state, "1", "Geri görüş kamerası olan yeni bir araç istiyorum")).state;
    expect(activeDecisionPreferences(state.ledger)).toEqual(expect.arrayContaining([expect.objectContaining({ concept: "equipmentFeature", field: "equipmentFeature", normalizedValue: "REAR_VIEW_CAMERA", decisionUse: "HARD_FILTER" })]));
    const catalog = await evaluateV3Catalog(state.ledger);
    expect(catalog.variants.length).toBeGreaterThan(0);
    expect(catalog.variants.every((variant) => variant.decisionFacts.safetyFeatureCodes.some((fact) => fact.value === "REAR_CAMERA"))).toBe(true);
  });

  it("publishes deterministic matrix order by usage type", () => {
    expect(usageQuestionOrder("URBAN_DAILY").slice(0, 2)).toEqual(["parkingEquipment", "bodyStyle"]);
    expect(usageQuestionOrder("COMMERCIAL").slice(0, 2)).toEqual(["fuelType", "bodyStyle"]);
    expect(usageQuestionOrder("LONG_DISTANCE")[0]).toBe("longDistanceEquipment");
  });
});
