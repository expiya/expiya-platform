import { describe, expect, it } from "vitest";
import { activateNextBatch8 } from "./activate";

describe("next-batch8 atomic activation", () => {
  it("rejects the historical exact-94 CAS base on current exact-105 production", async () => {
    await expect(activateNextBatch8(process.cwd(), true)).rejects.toThrow("CAS_ACTIVE_POINTER_MISMATCH");
  });
});
