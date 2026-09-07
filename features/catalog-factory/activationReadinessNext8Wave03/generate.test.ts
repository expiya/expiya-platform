import { describe, expect, it } from "vitest";
import { generateNext8AndWave03ActivationReadiness } from "./generate";

describe("separate next8 and Wave-03 activation readiness", () => {
  it("rejects the historical 94 CAS base after canonical production advanced to exact-105", async () => {
    await expect(generateNext8AndWave03ActivationReadiness()).rejects.toThrow("ACTIVE_94_CAS_BASE_MISMATCH");
  });
});
