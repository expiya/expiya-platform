import { describe, expect, it, vi } from "vitest";

import {
  PAID_COMPARISON_HANDOFF_STORAGE_KEY,
  PAID_COMPARISON_RETURN_URL_STORAGE_KEY,
  storePaidComparisonHandoff,
  storePaidComparisonReturnUrl,
} from "./clientContract";

describe("paid comparison client handoff contract", () => {
  it("stores the raw signed token under the key consumed by the comparison flow", () => {
    const setItem = vi.fn();

    storePaidComparisonHandoff({ setItem }, "p2.signed-token.signature");

    expect(PAID_COMPARISON_HANDOFF_STORAGE_KEY).toBe("expiya:paid-comparison-handoff");
    expect(setItem).toHaveBeenCalledWith(
      "expiya:paid-comparison-handoff",
      "p2.signed-token.signature",
    );
  });

  it("stores only a same-origin relative return URL", () => {
    const values = new Map<string, string>();
    const storage = { setItem: (key: string, value: string) => values.set(key, value) };

    storePaidComparisonReturnUrl(storage, "/decision/v3-car?source=card");
    expect(values.get(PAID_COMPARISON_RETURN_URL_STORAGE_KEY)).toBe("/decision/v3-car?source=card");

    storePaidComparisonReturnUrl(storage, "//attacker.example/path");
    expect(values.get(PAID_COMPARISON_RETURN_URL_STORAGE_KEY)).toBe("/decision/v3-car?source=card");
  });
});
