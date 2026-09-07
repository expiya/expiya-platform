import { describe, expect, it } from "vitest";
import { generateWave02Exact14SupersessionActivationPreflight } from "./generate";

describe("Exact-14 supersession activation preflight", () => {
  it("fails closed because the old exact-95 pointer is no longer current", async () => {
    await expect(generateWave02Exact14SupersessionActivationPreflight()).rejects.toThrow(/EXACT14_PACKAGE_BINDING_FAILED|OLD_EXACT15_POINTER_CAS_MISMATCH/);
  });
});
