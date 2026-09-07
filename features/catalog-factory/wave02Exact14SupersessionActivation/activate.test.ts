import { describe, expect, it } from "vitest";
import { activateWave02Exact14Supersession } from "./activate";

describe("Wave-02 exact-14 supersession atomic activation", () => {
  it("rejects the superseded exact-95 CAS base on current exact-105 production", async () => {
    await expect(activateWave02Exact14Supersession(process.cwd(), { dryRun: true })).rejects.toThrow(/OWNER_APPROVAL_CHAIN_MISMATCH|CAS_OLD_POINTER_MISMATCH/);
  });
});
