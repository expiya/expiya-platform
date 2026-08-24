import { describe, expect, it } from "vitest";
import { evaluateV3Catalog, v35EquipmentMatchAuthority, v35EquipmentSelectionWarning } from "./catalogAdapter.server";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import type { PreferenceEvent, V3ConversationState } from "./types";

async function conversation(id: string, messages: readonly string[]) {
  let state: V3ConversationState = createV3ConversationState(id); let output;
  for (const [index, message] of messages.entries()) { output = await runV3Turn({ conversationId: id, messageId: `${id}-${index}`, message, expectedRevision: state.revision, state }); state = output.state; }
  return output!;
}

describe("V3.5 unverified equipment selection", () => {
  it("includes reviewed but unverified equipment associations in catalog evaluation", async () => {
    const output = await conversation("unverified-query", ["Anahtarsız çalıştırmalı yeni araç istiyorum"]);
    const catalog = await evaluateV3Catalog(output.state.ledger);
    const unverified = catalog.variants.filter((variant) => v35EquipmentMatchAuthority(variant, "KEYLESS_START") === "UNVERIFIED");
    expect(unverified.length).toBeGreaterThan(0);
    expect(v35EquipmentSelectionWarning(unverified[0]!, output.state.ledger)).toMatch(/henüz doğrulanmamıştır/iu);
  });

  it("does not warn when the selected equipment match is verified", async () => {
    const catalog = await evaluateV3Catalog([]);
    const verified = catalog.variants.find((variant) => v35EquipmentMatchAuthority(variant, "KEYLESS_START") === "VERIFIED");
    const preference = { concept: "equipmentFeature", field: "equipmentFeature", normalizedValue: "KEYLESS_START", strength: "EXPLICIT_STRONG", status: "ACTIVE", decisionUse: "HARD_FILTER" } as PreferenceEvent;
    expect(verified).toBeDefined();
    expect(v35EquipmentSelectionWarning(verified!, [preference])).toBeUndefined();
  });

  it("publishes the warning on a card selected through unverified equipment", async () => {
    const output = await conversation("unverified-card", [
      "Aile kullanımı için SUV araç almak istiyorum", "Anahtarsız çalıştırma kesin olsun", "Bütçe sorun değil",
      "Dizel olsun", "Alfa Romeo Tonale olabilir", "Tek araç öner", "Evet, göster",
    ]);
    expect(output.recommendations).toHaveLength(1);
    expect(output.recommendations![0]?.warning).toMatch(/donanım bilgisi henüz doğrulanmamıştır/iu);
  });
});
