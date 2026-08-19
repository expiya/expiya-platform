import { describe, expect, it } from "vitest";
import { loadActiveProductionSnapshotForTest } from "../catalog/productionSnapshotFixture.testSupport";
import { createExplicitFunctionalPreferenceSignals } from "./constraintSignals";

describe("explicit functional preference signals", () => {
  it("ranks matching hatchbacks without filtering otherwise eligible candidates", async () => {
    const loaded = await loadActiveProductionSnapshotForTest();
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    const signals = createExplicitFunctionalPreferenceSignals({ snapshot: loaded.snapshot, constraints: [{ constraintId: "c", sourceEventId: "c", fieldId: "bodyStyle", decisionEffect: "STRONG_RANK", normalizedValue: { operator: "EQUALS", value: "Hatchback" } }] });
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((signal) => loaded.snapshot.variantById.get(signal.exactVariantId)?.decisionFacts.bodyStyle.value === "Hatchback")).toBe(true);
  });

  it("uses verified consumption as a non-filtering running-cost signal and ignores missing facts", async () => {
    const loaded = await loadActiveProductionSnapshotForTest(); expect(loaded.status).toBe("READY"); if (loaded.status !== "READY") return;
    const signals = createExplicitFunctionalPreferenceSignals({ snapshot: loaded.snapshot, constraints: [{ constraintId: "running", sourceEventId: "running", fieldId: "runningCostPreference", decisionEffect: "STRONG_RANK", normalizedValue: "LOW_RUNNING_COST" }] });
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((signal) => loaded.snapshot.variantById.has(signal.exactVariantId))).toBe(true);
    expect(signals.every((signal) => signal.reasonCode.startsWith("VERIFIED_LOW_RUNNING_COST_"))).toBe(true);
    expect(signals.length).toBeLessThanOrEqual(loaded.snapshot.variants.length);
  });
});
