import { describe, expect, it } from "vitest";
import type { CatalogVariantSnapshot } from "../v2/catalog/types";
import { evaluateV3Catalog, getV3MinimumCatalogPriceTry, v34MatchesBudget, v34PriceAuthority } from "./catalogAdapter.server";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { createRecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";

describe("V3.4 estimated and unavailable price governance", () => {
  it("derives the UI minimum budget from the active decision catalog", async () => {
    const catalog = await evaluateV3Catalog([]);
    const expected = Math.min(...catalog.variants.flatMap((variant) => variant.activeNewPrice ? [variant.activeNewPrice.amountTry] : []));
    expect(await getV3MinimumCatalogPriceTry()).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it("uses estimated amounts in a hard-budget query and retains vehicles with no price", async () => {
    const baseline = await evaluateV3Catalog([]); const ceiling = 1;
    let state = createV3ConversationState("price-authority");
    const output = await runV3Turn({ conversationId: state.conversationId, messageId: "1", message: `Kesin bütçem ${ceiling} TL`, expectedRevision: 0, state }); state = output.state;
    const filtered = await evaluateV3Catalog(state.ledger, undefined, "BUDGET_AS_DECISION_FILTER"); const retained = new Set(filtered.candidateIds);
    for (const variant of baseline.variants) {
      const authority = v34PriceAuthority(variant);
      if (authority === "ESTIMATED") expect(retained.has(variant.id)).toBe(variant.activeNewPrice!.amountTry <= ceiling);
      if (authority === "UNAVAILABLE") expect(retained.has(variant.id)).toBe(true);
      if (authority === "VERIFIED" && variant.activeNewPrice!.amountTry > ceiling) expect(retained.has(variant.id)).toBe(false);
    }
  });

  it("treats an estimated amount as the vehicle value without requiring price verification", () => {
    const estimated = { activeNewPrice: { amountTry: 1_900_000 } } as CatalogVariantSnapshot;
    const unavailable = { activeNewPrice: undefined } as CatalogVariantSnapshot;
    expect(v34MatchesBudget(estimated, 2_000_000)).toBe(true);
    expect(v34MatchesBudget(estimated, 1_800_000)).toBe(false);
    expect(v34MatchesBudget(unavailable, 1)).toBe(true);
  });

  it("never projects a price field on a revealed public card", async () => {
    let output = await runV3Turn({ conversationId: "no-price-card", messageId: "1", message: "Yeni araç almak istiyorum", expectedRevision: 0 });
    for (const [id, message] of [["2", "Şehir içinde günlük kullanacağım"], ["3", "Parkı kolay hatchback olsun"], ["4", "Kesin bütçem 3 milyon TL"], ["5", "Elektrikli olsun"], ["6", "Geri görüş kamerası kesin olsun"], ["7", "Tek araç öner"], ["8", "Evet, göster"]] as const) output = await runV3Turn({ conversationId: "no-price-card", messageId: id, message, expectedRevision: output.state.revision, state: output.state, ...(output.state.pendingOffer ? { recommendationTermsAcceptance: createRecommendationTermsAcceptance() } : {}) });
    expect(output.recommendations?.length).toBeGreaterThan(0); expect(output.recommendations?.length).toBeLessThanOrEqual(3); expect(output.recommendations![0]).toMatchObject({ id: expect.any(String), title: expect.any(String), image: expect.any(String), imageStatus: expect.any(String) }); expect(JSON.stringify(output.recommendations)).not.toMatch(/price|fiyat|amount/iu);
  });
});
