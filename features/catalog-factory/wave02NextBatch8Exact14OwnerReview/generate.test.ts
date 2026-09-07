import { describe, expect, it } from "vitest";
import { generateNextBatch8Exact14OwnerReview } from "./generate";

describe("next-batch 8 exact-14 owner review candidate", () => {
  it("fails closed because canonical production authority is exact-105, not historical exact-94", async () => {
    await expect(generateNextBatch8Exact14OwnerReview()).rejects.toThrow("EXACT14_RUNTIME_CLOSURE_NOT_BOUND");
  });
});
