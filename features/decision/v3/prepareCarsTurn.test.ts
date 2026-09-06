import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { activeDecisionPreferences } from "./ledger";
import { createV3ConversationState } from "./engine.server";
import { prepareCarsTurn } from "./prepareCarsTurn.server";

const input = (conversationId: string, messageId: string, message: string) => ({ conversationId, messageId, message, expectedRevision: Number(messageId) - 1 });
beforeAll(() => { process.env.CARS_V31_PROVIDER_DISABLED = "true"; });

describe("prepareCarsTurn", () => {
  it("rejects invalid and cross-conversation proposals before preparation", async () => {
    await expect(prepareCarsTurn(createV3ConversationState("cars"), input("cars", "1", "   "))).rejects.toThrow("V3_PROPOSAL_INVALID");
    await expect(prepareCarsTurn(createV3ConversationState("cars"), input("appliances", "1", "Buzdolabı arıyorum"))).rejects.toThrow("V3_STATE_BINDING_INVALID");
  });

  it("prepares correction and clear events append-only", async () => {
    const initial = createV3ConversationState("budget-prepare");
    const added = await prepareCarsTurn(initial, input("budget-prepare", "1", "Araç almak istiyorum, bütçem maksimum 2 milyon"));
    const corrected = await prepareCarsTurn(added.base, input("budget-prepare", "2", "Düzeltme: bütçem maksimum 3 milyon"));
    const cleared = await prepareCarsTurn(corrected.base, input("budget-prepare", "3", "Bütçeyi kaldır"));
    expect(cleared.ledger.filter((event) => event.concept === "budgetMax").length).toBeGreaterThanOrEqual(3);
    expect(activeDecisionPreferences(cleared.ledger).some((event) => event.concept === "budgetMax")).toBe(false);
  });

  it("prepares purchase-intent transitions without selecting a question", async () => {
    const prepared = await prepareCarsTurn(createV3ConversationState("intent-prepare"), input("intent-prepare", "1", "Yeni bir araç satın almak istiyorum"));
    expect(prepared.purchaseIntent).toBe("EXPLICIT");
    expect(prepared.base.purchaseIntent).toBe("EXPLICIT");
    expect(prepared.base.askedQuestionKeys).toEqual([]);
    expect(prepared.base.lastQuestionKey).toBeUndefined();
  });

  it("resolves catalog entities and binds the immutable candidate snapshot", async () => {
    const prepared = await prepareCarsTurn(createV3ConversationState("entity-prepare"), input("entity-prepare", "1", "Benzinli Volkswagen Golf satın almak istiyorum"));
    expect(activeDecisionPreferences(prepared.ledger)).toEqual(expect.arrayContaining([
      expect.objectContaining({ concept: "brandPreference", normalizedValue: "Volkswagen" }),
      expect.objectContaining({ concept: "modelPreference", normalizedValue: "Golf" }),
    ]));
    expect(prepared.catalog?.variants.length).toBeGreaterThan(0);
    expect(prepared.catalog?.variants.every((variant) => variant.brand === "Volkswagen" && variant.model === "Golf")).toBe(true);
    expect(Object.isFrozen(prepared)).toBe(true);
  });

  it("has no question, offer, authorization, card, or commit authority", () => {
    const source = readFileSync(new URL("./prepareCarsTurn.server.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/selectCarsQuestion|recordAskedQuestion|createV31Offer|revealV31Offer|projectEquipmentCardDisclosure|resolveVehicleImage|\bcommit\s*\(/u);
  });
});
