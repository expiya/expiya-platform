import { describe, expect, it } from "vitest";
import { loadProductionCatalogSnapshotForTest } from "../catalog/productionSnapshotFixture.testSupport";
import { createExplicitFunctionalPreferenceSignals } from "./constraintSignals";

describe("explicit functional preference signals", () => {
  it("ranks matching hatchbacks without filtering otherwise eligible candidates", async () => {
    const loaded = await loadProductionCatalogSnapshotForTest(new Date("2026-08-19T00:00:00.000Z"));
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    const signals = createExplicitFunctionalPreferenceSignals({ snapshot: loaded.snapshot, constraints: [{ constraintId: "c", sourceEventId: "c", fieldId: "bodyStyle", decisionEffect: "STRONG_RANK", normalizedValue: { operator: "EQUALS", value: "Hatchback" } }] });
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((signal) => loaded.snapshot.variantById.get(signal.exactVariantId)?.decisionFacts.bodyStyle.value === "Hatchback")).toBe(true);
  });
});
