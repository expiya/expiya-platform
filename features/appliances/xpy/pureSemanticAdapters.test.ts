import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { AppliancesConversationState } from "../contracts";
import { proposePriceInformation, resolvePriceInformation } from "./priceInformation";
import { proposeQuestionDisposition, reduceQuestionDeferral } from "./questionDeferral";
import { proposeBrandControl, reduceBrandControl, validateBrandProposal } from "./brandControl";
import { proposeBudgetControl, reduceBudgetControl } from "./budgetControl";

const state = (overrides: Partial<AppliancesConversationState> = {}): AppliancesConversationState => ({
  conversationId: "00000000-0000-4000-8000-000000000001", schemaVersion: "appliances-conversation/v1", revision: 3,
  departmentId: "APPLIANCES", productType: "WASHING_MACHINE", pinnedCatalogRelease: "catalog", pinnedCatalogDigest: "catalog-digest",
  pinnedSemanticVersion: "semantic", pinnedSemanticDigest: "semantic-digest", intentState: "PRODUCT_TYPE_RESOLVED", ledger: [],
  askedQuestionKeys: [], personaSignals: [], ended: false, createdAt: "2026-09-03T00:00:00.000Z", updatedAt: "2026-09-03T00:00:00.000Z", ...overrides,
});

describe("pure Appliances X/P semantic adapters", () => {
  it("keeps price resolution informational, discloses 19/24 coverage and preserves pending question", () => {
    const products = Array.from({ length: 24 }, (_, index) => ({ productId: `p${index}`, status: index < 19 ? "PRICE_AVAILABLE" : "PRICE_UNKNOWN", representativePriceTRY: index < 19 ? 20_000 + index : undefined, observationRefs: index === 0 ? ["o1"] : [], asOf: "2026-09-03" }));
    const current = state({ lastQuestionKey: "appliances.wm.capacity" });
    expect(proposePriceInformation("en ucuz hangisi?").kind).toBe("PRICE_INFORMATION");
    const outcome = resolvePriceInformation({ state: current, snapshot: { status: "READY", products, observations: [{ observationId: "o1", sourceReference: "source" }], identities: new Map(products.map(item => [item.productId, item.productId])) } });
    expect(outcome).toMatchObject({ kind: "RESPOND", contextMutation: "NONE", contextRevision: 4, resumeQuestionKey: "appliances.wm.capacity" });
    expect(outcome.message).toContain("24 ürünün 19");
    expect(outcome.message).toContain("fiyatı bilinmeyen 5 ürün");
  });

  it("does not invent price authority for a category without a price pack", () => {
    const outcome = resolvePriceInformation({ state: state({ productType: "DISHWASHER" }) });
    expect(outcome.message).toContain("doğrulanmış güncel fiyat bilgisi bu sürümde yok");
  });

  it("records one active deferral for the category-correct pending question", () => {
    const current = state({ lastQuestionKey: "appliances.wm.budget.maximumTry", questionDeferrals: [{ questionKey: "appliances.wm.budget.maximumTry", sourceMessageId: "old", sourceText: "bilmiyorum", createdRevision: 2, status: "ACTIVE" }] });
    const disposition = proposeQuestionDisposition("fiyatı bilmiyorum", current.lastQuestionKey);
    expect(disposition.kind).toBe("DEFER");
    if (disposition.kind !== "DEFER") throw new Error("expected deferral");
    const reduced = reduceQuestionDeferral({ state: current, disposition, messageId: "new", createdAt: "2026-09-03T01:00:00.000Z" });
    expect(reduced.revision).toBe(4);
    expect(reduced.questionDeferrals?.filter(item => item.status === "ACTIVE")).toEqual([{ questionKey: "appliances.wm.budget.maximumTry", sourceMessageId: "new", sourceText: "fiyatı bilmiyorum", createdRevision: 4, status: "ACTIVE" }]);
  });

  it("validates and append-only reduces brand set, correction, clear, relaxation and unknown", () => {
    const brands = [{ id: "bosch", label: "Bosch" }, { id: "beko", label: "Beko" }];
    let current = state({ pinnedBrandPolicyId: "policy", pinnedBrandPolicyDigest: "digest" });
    const set = validateBrandProposal(proposeBrandControl({ message: "Bosch marka olsun", brands, state: current }), brands);
    expect(set.kind).toBe("ACCEPTED");
    if (set.kind !== "ACCEPTED") throw new Error("brand set");
    current = reduceBrandControl({ state: current, proposal: set.proposal, messageId: "b1", message: "Bosch marka olsun", createdAt: "2026-09-03T01:00:00.000Z" });
    expect(current.brandConstraintEvents?.at(-1)).toMatchObject({ brandId: "bosch", status: "ACTIVE", decisionUse: "HARD_FILTER" });
    const correction = validateBrandProposal(proposeBrandControl({ message: "aslında Beko marka olsun", brands, state: current }), brands);
    if (correction.kind !== "ACCEPTED") throw new Error("brand correction");
    current = reduceBrandControl({ state: current, proposal: correction.proposal, messageId: "b2", message: "aslında Beko marka olsun", createdAt: "2026-09-03T02:00:00.000Z" });
    expect(current.brandConstraintEvents?.slice(-2).map(item => item.status)).toEqual(["SUPERSEDED", "ACTIVE"]);
    expect(validateBrandProposal(proposeBrandControl({ message: "Acme marka olsun", brands, state: current }), brands)).toMatchObject({ kind: "UNKNOWN", label: "Acme" });
    const active = current.brandConstraintEvents?.at(-1);
    if (!active) throw new Error("active brand");
    expect(proposeBrandControl({ message: "evet", brands, state: { ...current, pendingBrandRelaxation: { brandEventId: active.eventId, brandId: active.brandId, questionKey: "appliances.brand.relaxation" } } })).toMatchObject({ kind: "RELAX" });
    const clear = validateBrandProposal(proposeBrandControl({ message: "marka kısıtını kaldır", brands, state: current }), brands);
    if (clear.kind !== "ACCEPTED") throw new Error("brand clear");
    current = reduceBrandControl({ state: current, proposal: clear.proposal, messageId: "b3", message: "marka kısıtını kaldır", createdAt: "2026-09-03T03:00:00.000Z" });
    expect(current.brandConstraintEvents?.at(-1)?.status).toBe("CLEARED");
  });

  it("reduces budget mode, amount changes, clear and missing-amount question without inventing price eligibility", () => {
    let current = state();
    const enable = proposeBudgetControl("bütçemi karar filtresi olarak kullan");
    if (enable.kind !== "CONTROL") throw new Error("budget enable");
    let reduced = reduceBudgetControl({ state: current, proposal: enable, messageId: "m1", createdAt: "2026-09-03T01:00:00.000Z" });
    expect(reduced).toMatchObject({ state: { budgetMode: "BUDGET_AS_DECISION_FILTER", budgetMetadata: undefined }, terminalOutcome: { kind: "ASK" } });
    current = reduced.state;
    const amount = proposeBudgetControl("bütçem 30.000 TL");
    if (amount.kind !== "CONTROL") throw new Error("budget amount");
    reduced = reduceBudgetControl({ state: current, proposal: amount, messageId: "m2", createdAt: "2026-09-03T02:00:00.000Z" });
    expect(reduced.state).toMatchObject({ budgetMetadata: { amountTry: 30000, includedInDecision: true, priceSemantics: "FRESH_EXACT_PRICE_ONLY" } });
    const changed = proposeBudgetControl("bütçem 25.000 TL");
    if (changed.kind !== "CONTROL") throw new Error("budget change");
    current = reduceBudgetControl({ state: reduced.state, proposal: changed, messageId: "m3", createdAt: "2026-09-03T03:00:00.000Z" }).state;
    expect(current.budgetMetadata?.amountTry).toBe(25000);
    const clear = proposeBudgetControl("bütçemi unut");
    if (clear.kind !== "CONTROL") throw new Error("budget clear");
    current = reduceBudgetControl({ state: current, proposal: clear, messageId: "m4", createdAt: "2026-09-03T04:00:00.000Z" }).state;
    expect(current.budgetMetadata).toBeUndefined();
  });

  it("has no persistence or transaction capabilities in either pure module", () => {
    for (const file of ["features/appliances/xpy/priceInformation.ts", "features/appliances/xpy/questionDeferral.ts", "features/appliances/xpy/brandControl.ts", "features/appliances/xpy/budgetControl.ts"]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/persistence|ConversationStore|expectedRevision|payloadHash|\bCAS\b|\bcommit\b|\breplay\b|repository/);
    }
  });
});
