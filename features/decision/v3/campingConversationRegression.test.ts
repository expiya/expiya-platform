import { afterEach, describe, expect, it } from "vitest";
import { activeDecisionPreferences } from "./ledger";
import { runV3Turn } from "./engine.server";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => {
  if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED;
  else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled;
});

describe("camping conversation regressions", () => {
  it("does not treat the current sedan or camping alone as desired hard filters", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({
      conversationId: "camp-current-sedan",
      messageId: "1",
      message: "Merhaba. Kamp yapmayı seviyorum ancak şu an kullandığım sedan araç ile pek mümkün olmuyor. Bana yeni bir araç öner.",
      expectedRevision: 0,
    });
    const active = activeDecisionPreferences(output.state.ledger);

    expect(active.some((item) => item.concept === "bodyStyle")).toBe(false);
    expect(active.some((item) => item.concept === "primaryUsage" && item.normalizedValue === "MIXED_ROAD")).toBe(false);
    expect(output.state.lastQuestionKey).toBe("campingLimitation");
    expect(output.message).toMatch(/ekipmanlarının sığmaması.*bozuk veya stabilize.*araç içinde konaklama/iu);
    expect(output.state.lastQuestionKey).not.toMatch(/^verifiedEquipment:/u);
  });

  it("resolves an offered equipment group when the user says none is required", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const id = "camp-equipment-none";
    let output = await runV3Turn({
      conversationId: id,
      messageId: "1",
      message: "Bozuk ve stabilize yollarda kullanmak için sıfır bir SUV öner.",
      expectedRevision: 0,
    });
    expect(output.state.lastQuestionKey).toMatch(/^verifiedEquipment:/u);

    output = await runV3Turn({
      conversationId: id,
      messageId: "2",
      message: "Bu seçeneklerden hiçbiri şart değil",
      expectedRevision: output.state.revision,
      state: output.state,
    });

    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "equipmentNotImportant", status: "ACTIVE" }));
    expect(output.state.lastQuestionKey).not.toBe("decisionDifferentiator");
    expect(output.state.lastQuestionKey).not.toMatch(/^verifiedEquipment:/u);
  });
});
