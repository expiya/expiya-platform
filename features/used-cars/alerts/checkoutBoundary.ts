export const usedCarsAlertProCheckoutDraft = Object.freeze({
  productCode: "USED_CARS_ALERT_PRO" as const,
  offerPresentation: "PRICE_SCOPE_CHECKOUT_CTA" as const,
  priceTryMonthly: null,
  checkoutUrl: null,
  termsVersion: null,
  cancellationAndRefundPolicyVersion: null,
  paymentProvider: null,
  newCarsComparisonReportProductReuseAllowed: false as const,
  rankingBenefitIncluded: false as const,
  checkoutNavigationAuthorized: false as const,
  paymentCollectionAuthorized: false as const,
  entitlementActivationAuthorized: false as const,
});

export function assessUsedCarsAlertCheckout() {
  const missing = [
    ["priceApproved", usedCarsAlertProCheckoutDraft.priceTryMonthly !== null],
    ["checkoutUrlConfigured", usedCarsAlertProCheckoutDraft.checkoutUrl !== null],
    ["termsApproved", usedCarsAlertProCheckoutDraft.termsVersion !== null],
    ["cancellationAndRefundApproved", usedCarsAlertProCheckoutDraft.cancellationAndRefundPolicyVersion !== null],
    ["paymentProviderApproved", usedCarsAlertProCheckoutDraft.paymentProvider !== null],
  ].filter(([, ready]) => !ready).map(([key]) => key as string);
  return Object.freeze({ ready: missing.length === 0, missing: Object.freeze(missing), checkoutNavigationAuthorized: false as const, paymentCollectionAuthorized: false as const, entitlementActivationAuthorized: false as const });
}
