import { describe, expect, it } from "vitest";
import { assessUsedCarsAlertCheckout, usedCarsAlertProCheckoutDraft } from "./alerts/checkoutBoundary";

describe("used-cars alert checkout boundary", () => {
  it("uses a distinct used-cars product rather than the new-cars report product", () => {
    expect(usedCarsAlertProCheckoutDraft.productCode).toBe("USED_CARS_ALERT_PRO");
    expect(usedCarsAlertProCheckoutDraft.newCarsComparisonReportProductReuseAllowed).toBe(false);
  });
  it("keeps checkout, collection and activation closed until commercial gates pass", () => {
    expect(assessUsedCarsAlertCheckout()).toMatchObject({ ready: false, checkoutNavigationAuthorized: false, paymentCollectionAuthorized: false, entitlementActivationAuthorized: false });
  });
  it("does not sell ranking priority", () => expect(usedCarsAlertProCheckoutDraft.rankingBenefitIncluded).toBe(false));
});
