import { describe, expect, it } from "vitest";
import { activateWave03RepairedExact3 } from "./activate";

describe("Wave-03 repaired exact3 atomic activation", () => {
  it("rejects replay after the canonical exact-105 pointer has already advanced", async () => {
    await expect(activateWave03RepairedExact3(process.cwd(), true)).rejects.toThrow("CAS_ACTIVE_POINTER_MISMATCH");
  });
});
