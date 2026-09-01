import { describe, expect, it } from "vitest";
import { evaluateV3Catalog } from "./catalogAdapter.server";
import { runV3Turn } from "./engine.server";
import { latestActiveLedgerEvent } from "./ledger";

describe("V3 negative and comparative preferences", () => {
  it("excludes a rejected catalog model instead of treating it as a desired model", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "reject-model", messageId: "1", message: "Tesla Model Y istemiyorum fakat menzili iyi; elektrikli bir araç arıyorum", expectedRevision: 0 });
    expect(latestActiveLedgerEvent(output.state.ledger, "excludedModel")?.normalizedValue).toBe("Model Y");
    expect(latestActiveLedgerEvent(output.state.ledger, "modelPreference")).toBeUndefined();
    expect((await evaluateV3Catalog(output.state.ledger)).variants.every((variant) => variant.model !== "Model Y")).toBe(true);
  });
  it("turns a relative economy request into a soft consumption priority", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "relative-economy", messageId: "1", message: "Tucson kadar yüksek ama daha ekonomik bir araç almak istiyorum", expectedRevision: 0 });
    expect(latestActiveLedgerEvent(output.state.ledger, "candidateConsumptionPriority")).toMatchObject({ normalizedValue: "MINIMIZE", decisionUse: "SOFT_RANK" });
  });
});
