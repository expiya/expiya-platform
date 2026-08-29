import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { evaluateV3Catalog, rankV3Candidates, v35EquipmentMatchAuthority } from "./catalogAdapter.server";
import { projectV3DecisionPreferences } from "./decisionInput";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import type { PreferenceEvent } from "./types";

const fp = (ledger: readonly PreferenceEvent[], mode: "NEEDS_ONLY" | "BUDGET_AS_DECISION_FILTER") => createHash("sha256").update(JSON.stringify(projectV3DecisionPreferences(ledger, mode).map(({ concept, normalizedValue, decisionUse }) => ({ concept, normalizedValue, decisionUse })))).digest("hex");

describe("V3 verified/unverified and budget decision boundary", () => {
  it("keeps default budget metadata outside the decision fingerprint", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const base = createV3ConversationState("needs-only");
    const withBudget = await runV3Turn({ conversationId: base.conversationId, messageId: "1", message: "Şehir içi kullanıma benzinli otomatik SUV istiyorum. Bütçem kesin 2 milyon TL.", expectedRevision: 0, state: base });
    const withoutBudget = await runV3Turn({ conversationId: "needs-only-2", messageId: "1", message: "Şehir içi kullanıma benzinli otomatik SUV istiyorum.", expectedRevision: 0 });
    expect(withBudget.state.budgetMode).toBe("NEEDS_ONLY");
    expect(withBudget.state.budgetMetadata).toMatchObject({ amountTry: 2_000_000, includedInDecision: false });
    expect(fp(withBudget.state.ledger, "NEEDS_ONLY")).toBe(fp(withoutBudget.state.ledger, "NEEDS_ONLY"));
    const withBudgetCatalog = await evaluateV3Catalog(withBudget.state.ledger);
    const withoutBudgetCatalog = await evaluateV3Catalog(withoutBudget.state.ledger);
    expect(withBudgetCatalog.candidateIds).toEqual(withoutBudgetCatalog.candidateIds);
    expect(rankV3Candidates(withBudgetCatalog.variants, withBudget.state.ledger).map((item) => item.id)).toEqual(rankV3Candidates(withoutBudgetCatalog.variants, withoutBudget.state.ledger).map((item) => item.id));
  });

  it("applies price only after an explicit conversation-scoped mode transition", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "budget-filter", messageId: "1", message: "Şehir içi benzinli otomatik SUV istiyorum. Kesin bütçem 2 milyon TL.", expectedRevision: 0 });
    const needs = await evaluateV3Catalog(output.state.ledger, undefined, "NEEDS_ONLY");
    output = await runV3Turn({ conversationId: "budget-filter", messageId: "2", message: "Bütçemi karar filtresi olarak kullan.", expectedRevision: 1, state: output.state });
    const filtered = await evaluateV3Catalog(output.state.ledger, undefined, "BUDGET_AS_DECISION_FILTER");
    expect(output.state.budgetModeEvents).toHaveLength(1);
    expect(filtered.variants.length).toBeLessThan(needs.variants.length);
    expect(filtered.variants.every((item) => !item.activeNewPrice || item.activeNewPrice.amountTry <= 2_000_000)).toBe(true);
  });

  it("records mode changes append-only and does not inherit them across conversations", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let first = await runV3Turn({ conversationId: "budget-a", messageId: "1", message: "Kesin bütçem 2 milyon TL; bütçemi karar filtresi olarak kullan.", expectedRevision: 0 });
    first = await runV3Turn({ conversationId: "budget-a", messageId: "2", message: "Bütçeyi karardan çıkar, ihtiyaç odaklı devam.", expectedRevision: 1, state: first.state });
    expect(first.state.budgetMode).toBe("NEEDS_ONLY");
    expect(first.state.budgetModeEvents).toMatchObject([
      { revision: 1, from: "NEEDS_ONLY", to: "BUDGET_AS_DECISION_FILTER", authority: "USER_EXPLICIT" },
      { revision: 2, from: "BUDGET_AS_DECISION_FILTER", to: "NEEDS_ONLY", authority: "USER_EXPLICIT" },
    ]);
    expect(first.state.budgetMetadata?.includedInDecision).toBe(false);

    const second = await runV3Turn({ conversationId: "budget-b", messageId: "1", message: "Şehir içi bir araç arıyorum.", expectedRevision: 0 });
    expect(second.state.budgetMode).toBe("NEEDS_ONLY");
    expect(second.state.budgetModeEvents).toEqual([]);
    expect(second.state.budgetMetadata).toBeUndefined();
  });

  it("does not enable the budget filter when the user explicitly rejects inclusion", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "budget-rejected", messageId: "1", message: "Bütçeyi karar filtresine dahil etmek istemiyorum; ihtiyaç odaklı devam.", expectedRevision: 0 });
    expect(output.state.budgetMode).toBe("NEEDS_ONLY");
    expect(output.state.budgetModeEvents).toEqual([]);
  });

  it("ranks exact-verified equipment ahead without treating unknown as verified absence", async () => {
    const catalog = await evaluateV3Catalog([]);
    const equipment = { id: "e", sourceMessageId: "1", sourceTurn: 1, sourceSpan: { start: 0, end: 1, text: "x" }, concept: "equipmentFeature", field: "equipmentFeature", normalizedValue: "REAR_VIEW_CAMERA", strength: "EXPLICIT_STRONG", status: "ACTIVE", decisionUse: "HARD_FILTER", confidence: 1, authority: "USER_EXPLICIT", confirmationRequired: false } as const;
    const withEquipment = await evaluateV3Catalog([equipment]);
    expect(withEquipment.candidateIds).toEqual(catalog.candidateIds);
    expect(withEquipment.appliedEquipment).toHaveLength(1);
    expect(withEquipment.unsupportedEquipment).toHaveLength(0);
    expect(v35EquipmentMatchAuthority(rankV3Candidates(withEquipment.variants, [equipment])[0]!, "REAR_VIEW_CAMERA")).toBe("VERIFIED");
  });

  it("keeps an unverified-only requirement decision-neutral and reports it as unsupported", async () => {
    const baseline = await evaluateV3Catalog([]);
    const equipment = { id: "u", sourceMessageId: "1", sourceTurn: 1, sourceSpan: { start: 0, end: 1, text: "x" }, concept: "equipmentFeature", field: "equipmentFeature", normalizedValue: "ROOF_RAILS", strength: "EXPLICIT_STRONG", status: "ACTIVE", decisionUse: "HARD_FILTER", confidence: 1, authority: "USER_EXPLICIT", confirmationRequired: false } as const;
    const result = await evaluateV3Catalog([equipment]);
    expect(result.candidateIds).toEqual(baseline.candidateIds);
    expect(result.appliedEquipment).toHaveLength(0);
    expect(result.unsupportedEquipment).toHaveLength(1);
  });
});
