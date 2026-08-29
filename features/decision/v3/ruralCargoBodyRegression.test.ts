import { describe, expect, it } from "vitest";
import { evaluateV3Catalog } from "./catalogAdapter.server";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { activeDecisionPreferences, applyPreferenceMessage } from "./ledger";

describe("rural cargo body continuity", () => {
  it("keeps an explicit pick-up answer active and never falls back to a hatchback question", async () => {
    let output = await runV3Turn({
      conversationId: "rural-pickup-continuity",
      messageId: "m1",
      message:
        "Köyde yaşıyorum. Bağ bahçe işleriyle uğraşıyorum; şehirden ekipman, fide ve toprak alıp bu malzemeleri taşımam gerekiyor. Bana uygun bir araç önerir misin?",
      expectedRevision: 0,
    });

    expect(output.state.ledger).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ concept: "primaryUsage", normalizedValue: "RURAL_DAILY" }),
        expect.objectContaining({ concept: "cargoRequirement", normalizedValue: "GOODS_TRANSPORT" }),
      ]),
    );
    expect(output.state.lastQuestionKey).toBe("ruralRoadCondition");

    output = await runV3Turn({
      conversationId: output.state.conversationId,
      messageId: "m2",
      message: "Bozuk ve stabilize yollar var; malzemeyi güvenle taşımalıyım.",
      expectedRevision: output.state.revision,
      state: output.state,
    });
    expect(output.state.lastQuestionKey).toBe("mixedRoadBody");

    output = await runV3Turn({
      conversationId: output.state.conversationId,
      messageId: "m3",
      message: "Pick-up",
      expectedRevision: output.state.revision,
      state: output.state,
    });

    const active = activeDecisionPreferences(output.state.ledger);
    expect(active).toContainEqual(
      expect.objectContaining({ concept: "bodyStyle", normalizedValue: "PICKUP" }),
    );
    expect(output.state.lastQuestionKey).not.toBe("bodyStyle");
    expect(output.message).not.toMatch(/kompakt|hatchback|park kolaylığı/iu);
    const catalog = await evaluateV3Catalog(output.state.ledger);
    expect(catalog.variants.length).toBeGreaterThan(0);
    expect(catalog.variants.length).toBeLessThan(80);
    expect(
      catalog.variants.every((variant) =>
        variant.decisionFacts.bodyStyle.value.toUpperCase().includes("PICKUP"),
      ),
    ).toBe(true);
  });

  it("normalizes common pick-up spellings to the same hard body preference", async () => {
    for (const [index, answer] of ["Pick-up", "Pickup", "Pick up"].entries()) {
      const state = {
        ...createV3ConversationState(`pickup-spelling-${index}`),
        lastQuestionKey: "mixedRoadBody",
        askedQuestionKeys: ["mixedRoadBody"],
      };
      const output = applyPreferenceMessage(state, "m2", answer);
      expect(activeDecisionPreferences(output.ledger)).toContainEqual(
        expect.objectContaining({ concept: "bodyStyle", normalizedValue: "PICKUP" }),
      );
    }
  });
});
