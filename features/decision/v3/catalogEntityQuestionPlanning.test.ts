import { afterEach, describe, expect, it } from "vitest";
import { evaluateV3Catalog, resolveV3CatalogEntities } from "./catalogAdapter.server";
import { runV3Turn } from "./engine.server";
import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

describe("V3 catalog entity and candidate-aware question planning", () => {
  it("resolves brand and model names from the active catalog instead of a hand-written model list", async () => {
    const signals = await resolveV3CatalogEntities("Benzinli bir Volkswagen Golf almayı planlıyorum.");
    expect(signals.brands).toContain("Volkswagen");
    expect(signals.models).toContain("Golf");
  });

  it("filters Golf variants and does not ask usage after an exact model choice", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "golf-model", messageId: "1", message: "Benzinli, otomatik vites bir Volkswagen Golf almayı planlıyorum.", expectedRevision: 0 });
    expect(activeDecisionPreferences(output.state.ledger)).toEqual(expect.arrayContaining([
      expect.objectContaining({ concept: "brandPreference", normalizedValue: "Volkswagen" }),
      expect.objectContaining({ concept: "modelPreference", normalizedValue: "Golf" }),
    ]));
    expect(output.message).not.toMatch(/nerede ve ne için|günlük ihtiyaç/iu);
    expect(output.message).toMatch(/en uygun aracı seçebilirim/iu);
    const catalog = await evaluateV3Catalog(output.state.ledger);
    expect(catalog.variants.length).toBeGreaterThan(0);
    expect(catalog.variants).toHaveLength(1);
    expect(catalog.variants.length).toBeLessThan(catalog.initialCount);
    expect(catalog.variants.every((item) => item.brand === "Volkswagen" && item.model === "Golf")).toBe(true);
  });

  it.each([
    "Bütçem hazır; 360 derece kameralı bir Volvo XC40 arıyorum.",
    "Bütçemi ayarladım, koltuk ısıtmalı bir Peugeot 3008 alacağım.",
    "4x4 bir Dacia Duster arıyorum, bütçem net.",
  ])("does not mistake equipment, model or drivetrain numbers for money: %s", async (message) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: message, messageId: "1", message, expectedRevision: 0 });
    expect(latestActiveLedgerEvent(output.state.ledger, "budgetMax")).toBeUndefined();
  });

  it("accepts compact million notation without confusing it with a model number", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "compact-budget", messageId: "1", message: "2.5M TL bütçeyle alınacak en iyi 3 arabayı söyle.", expectedRevision: 0 });
    expect(latestActiveLedgerEvent(output.state.ledger, "budgetMax")?.normalizedValue).toBe(2_500_000);
  });
});
