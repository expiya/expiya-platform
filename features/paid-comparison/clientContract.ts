export const PAID_COMPARISON_HANDOFF_STORAGE_KEY = "expiya:paid-comparison-handoff";

export function storePaidComparisonHandoff(
  storage: Pick<Storage, "setItem">,
  token: string,
): void {
  storage.setItem(PAID_COMPARISON_HANDOFF_STORAGE_KEY, token);
}
