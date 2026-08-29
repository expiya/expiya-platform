import { describe, expect, it } from "vitest";
import { applyPreferenceMessage } from "./ledger";
import type { PreferenceEvent, V3ConversationState } from "./types";

const equipment: PreferenceEvent = { id: "equipment", sourceMessageId: "1", sourceTurn: 1, sourceSpan: { start: 0, end: 1, text: "x" }, concept: "equipmentFeature", field: "equipmentFeature", normalizedValue: "POWER_SLIDING_SIDE_DOOR", strength: "EXPLICIT_STRONG", status: "ACTIVE", decisionUse: "HARD_FILTER", confidence: 1, authority: "USER_EXPLICIT", confirmationRequired: false };
const state = (ledger: readonly PreferenceEvent[] = []): V3ConversationState => ({ version: "3.8", conversationId: "owner-manual-v4", revision: 1, processedMessages: {}, purchaseIntent: "ACTIVE_DISCOVERY", intentObservationTurns: 1, ledger, askedQuestionKeys: [], ended: false, pendingAction: "RELAX_UNSUPPORTED_EQUIPMENT" });

describe("owner manual V4 conversation regressions", () => {
  it("does not interpret 'Çıkarma' as consent to remove equipment", () => expect(applyPreferenceMessage(state([equipment]), "2", "Çıkarma.").ledger.some((item) => item.status === "CLEARED")).toBe(false));
  it("does interpret 'Çıkar' as consent to remove equipment", () => expect(applyPreferenceMessage(state([equipment]), "2", "Çıkar.").ledger).toContainEqual(expect.objectContaining({ status: "CLEARED", supersedes: "equipment" })));
  it.each([
    ["180 derece açılır arka kapılar şart.", "REAR_DOOR_OPENING_180"], ["Elektrikli kayar kapı şart.", "POWER_SLIDING_SIDE_DOOR"],
    ["Tavan rayları ve bagaj filesi şart.", "ROOF_RAILS"], ["Entegre arka kapı güneşlikleri olsun.", "INTEGRATED_REAR_DOOR_SUNSHADES"],
  ])("normalizes governed equipment: %s", (text, code) => expect(applyPreferenceMessage(state(), "2", text).ledger).toContainEqual(expect.objectContaining({ concept: "equipmentFeature", normalizedValue: code })));
  it("preserves cargo hooks and an unmapped 12V luggage socket without granting either decision authority", () => {
    const output = applyPreferenceMessage(state(), "2", "Donanımda 12V bagaj soketi ve sabitleme kancaları şart.");
    expect(output.ledger).toContainEqual(expect.objectContaining({ concept: "equipmentFeature", normalizedValue: "CARGO_TIE_DOWN_POINTS" }));
    expect(output.ledger).toContainEqual(expect.objectContaining({ concept: "unmappedEquipmentRequirement", normalizedValue: "12V bagaj soketi", decisionUse: "NONE" }));
  });
  it("does not misclassify rear-seat heating as front-seat heating", () => {
    const output = applyPreferenceMessage(state(), "2", "Arka koltuk ısıtması şart.");
    expect(output.ledger).toContainEqual(expect.objectContaining({ concept: "equipmentFeature", normalizedValue: "HEATED_REAR_SEATS" }));
    expect(output.ledger).not.toContainEqual(expect.objectContaining({ normalizedValue: "HEATED_FRONT_SEATS" }));
  });
  it("does not classify bicycle/outdoor equipment as commercial or rough-road use", () => {
    const ledger = applyPreferenceMessage({ ...state(), lastQuestionKey: "primaryUsage" }, "2", "Bisiklet ve açık hava malzemelerimi taşıyacağım.").ledger;
    expect(ledger).not.toContainEqual(expect.objectContaining({ concept: "primaryUsage", normalizedValue: "COMMERCIAL", status: "ACTIVE" }));
    expect(ledger).not.toContainEqual(expect.objectContaining({ concept: "primaryUsage", normalizedValue: "MIXED_ROAD", status: "ACTIVE" }));
    expect(ledger).toContainEqual(expect.objectContaining({ concept: "cargoPracticality", confirmationRequired: true }));
  });
  it("keeps a three-child MPV request family-oriented", () => expect(applyPreferenceMessage({ ...state(), lastQuestionKey: "primaryUsage" }, "2", "Üç çocuklu aile için MPV istiyorum.").ledger).toContainEqual(expect.objectContaining({ concept: "primaryUsage", normalizedValue: "FAMILY" })));
});
