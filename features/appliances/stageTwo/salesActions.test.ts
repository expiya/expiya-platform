import { describe, expect, it } from "vitest";
import { APPLIANCES_PRODUCT_TYPES } from "../contracts";
import type { CurrentProductCommerce, ExactOfferObservation } from "../commerce/types";
import { BoundedSalesActionIdempotencyLedger, buildAppliancesSalesActions, executeBoundedAppliancesSalesAction } from "./salesActions";

const offer = (overrides: Partial<ExactOfferObservation> = {}): ExactOfferObservation => ({ exactProductId: "product-1", categoryId: "WASHING_MACHINE", merchant: "Tarafsız Satıcı", marketplace: false, seller: "Tarafsız Satıcı", sellerIdentity: "tarafsizsatici", canonicalListingUrl: "https://www.example.com/exact", amount: 25_000, currency: "TRY", shippingInclusion: "UNKNOWN", availability: "IN_STOCK", observedAt: "2026-09-04T08:00:00.000Z", expiresAt: "2099-09-05T08:00:00.000Z", sourceKind: "INDEPENDENT_MERCHANT", identityMatchEvidence: ["exact model"], exactModelMatched: true, observationFingerprint: "a".repeat(64), ...overrides });
const commerce = (offers: readonly ExactOfferObservation[]): CurrentProductCommerce => ({ snapshotId: "snapshot", snapshotDigest: "b".repeat(64), media: null, offers, independentFreshOfferCount: offers.length, priceRange: null, coverageNotice: "test" });
const base = { exactProductId: "product-1", productType: "WASHING_MACHINE" as const, revision: 7 };

describe("Appliances AŞAMA 2 sales-action standard", () => {
  it("publishes the same six-action contract for all 24 categories", () => {
    for (const productType of APPLIANCES_PRODUCT_TYPES) {
      const actions = buildAppliancesSalesActions({ exactProductId: "product-1", productType });
      expect(actions.map(item => item.kind)).toEqual(["VIEW_EXACT_OFFER", "WATCH_PRICE", "INQUIRE_AUTHORIZED_AVAILABILITY", "SAVE_DECISION", "SHARE_DECISION", "REQUEST_COMPARISON_REPORT"]);
      expect(actions.find(item => item.kind === "VIEW_EXACT_OFFER")?.availability).toBe("UNAVAILABLE");
      expect(actions.filter(item => item.availability === "COMING_SOON")).toHaveLength(0);
      expect(actions.filter(item => item.availability === "UNAVAILABLE")).toHaveLength(4);
    }
  });

  it("allows only an exact, category-matched, unexpired offer and never uses affiliate URLs", () => {
    const affiliate = offer({ affiliate: { program: "high-payout", attributionOnly: true, url: "https://affiliate.example/redirect" } });
    expect(buildAppliancesSalesActions({ ...base, commerce: commerce([affiliate]), now: new Date("2026-09-04T09:00:00Z") })[0]).toMatchObject({ availability: "AVAILABLE", merchant: "Tarafsız Satıcı" });
    const ready = executeBoundedAppliancesSalesAction({ ...base, handoff: "signed", action: "VIEW_EXACT_OFFER", verified: { ...base, commerce: commerce([affiliate]) } });
    expect(ready).toMatchObject({ status: "READY", url: "https://www.example.com/exact" });
    expect(JSON.stringify(ready)).not.toContain("affiliate");
    expect(buildAppliancesSalesActions({ ...base, commerce: commerce([offer({ categoryId: "DRYER" })]) })[0].availability).toBe("UNAVAILABLE");
    expect(buildAppliancesSalesActions({ ...base, commerce: commerce([offer({ expiresAt: "2026-09-03T08:00:00Z" })]), now: new Date("2026-09-04T09:00:00Z") })[0].availability).toBe("UNAVAILABLE");
  });

  it("rejects cross-product, cross-category, and stale-revision action attempts", () => {
    for (const change of [{ exactProductId: "other" }, { productType: "DRYER" as const }, { revision: 8 }]) {
      expect(executeBoundedAppliancesSalesAction({ ...base, ...change, handoff: "signed", action: "SHARE_DECISION", verified: base })).toMatchObject({ status: "UNAVAILABLE", message: expect.stringContaining("eşleşmiyor") });
    }
  });

  it("enters comparison and sharing flows without claiming a charge, order, lead, or save", () => {
    expect(executeBoundedAppliancesSalesAction({ ...base, handoff: "signed", action: "REQUEST_COMPARISON_REPORT", verified: base })).toEqual({ status: "READY", kind: "REQUEST_COMPARISON_REPORT", flow: "COMPARISON_REPORT_OFFER" });
    expect(executeBoundedAppliancesSalesAction({ ...base, handoff: "signed", action: "SHARE_DECISION", verified: base })).toMatchObject({ status: "READY", kind: "SHARE_DECISION", sharePath: expect.stringContaining("handoff=signed") });
    for (const action of ["WATCH_PRICE", "INQUIRE_AUTHORIZED_AVAILABILITY", "SAVE_DECISION"] as const) expect(executeBoundedAppliancesSalesAction({ ...base, handoff: "signed", action, verified: base }).status).toBe("UNAVAILABLE");
  });

  it("replays duplicate intent outcomes only inside a bounded recovery window", () => {
    let now = 10; const ledger = new BoundedSalesActionIdempotencyLedger<string>(100, 2, () => now);
    ledger.set("same-session-action-key", "first-result");
    expect(ledger.get("same-session-action-key")).toBe("first-result");
    now = 111; expect(ledger.get("same-session-action-key")).toBeUndefined();
    ledger.set("a", "a"); ledger.set("b", "b"); ledger.set("c", "c");
    expect(ledger.get("a")).toBeUndefined(); expect(ledger.get("c")).toBe("c");
  });
});
