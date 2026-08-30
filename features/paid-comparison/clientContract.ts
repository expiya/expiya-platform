export const PAID_COMPARISON_HANDOFF_STORAGE_KEY = "expiya:paid-comparison-handoff";
export const PAID_COMPARISON_RETURN_URL_STORAGE_KEY = "expiya:paid-comparison-return-url";

export function storePaidComparisonHandoff(
  storage: Pick<Storage, "setItem">,
  token: string,
): void {
  storage.setItem(PAID_COMPARISON_HANDOFF_STORAGE_KEY, token);
}

export function storePaidComparisonReturnUrl(
  storage: Pick<Storage, "setItem">,
  returnUrl: string,
): void {
  if (returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
    storage.setItem(PAID_COMPARISON_RETURN_URL_STORAGE_KEY, returnUrl);
  }
}
