import { describe, expect, it } from "vitest";
import { generateWave02Exact14IdentitySupersession } from "./generate";

describe("Wave-02 exact-15 identity supersession", () => {
  it("fails closed instead of regenerating historical exact-14 artifacts on current exact-105 production", async () => {
    await expect(generateWave02Exact14IdentitySupersession()).rejects.toThrow("HISTORICAL_EXACT15_POINTER_NOT_CURRENT");
  });
});
