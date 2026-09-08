import { describe, expect, it } from "vitest";
import { loadActivePMaterialityWave } from "./activeWaveLoader.server";

describe("active P-materiality wave loader", () => {
  it("loads the digest-bound atomic Wave-1A pointer fail closed", async () => {
    const loaded = await loadActivePMaterialityWave(process.cwd());
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    expect(loaded.wave.categories).toHaveLength(48);
    expect(loaded.wave.categories).toEqual(expect.arrayContaining(["AIR_FRYER", "BICYCLE", "CORDLESS_DRILL", "DISHWASHER", "ELECTRIC_BICYCLE", "ELECTRIC_SCOOTER", "LAPTOP", "NEW_CAR", "REFRIGERATOR", "SMARTPHONE", "STROLLER", "VACUUM"]));
    expect(loaded.wave.projections).toHaveLength(50);
    expect(new Set(loaded.wave.projections.flatMap((projection) => projection.offerings.map((offering) => offering.exactOfferingId))).size).toBe(754);
    expect(loaded.wave.yAuthority).toBe("UNCHANGED_NONE_GRANTED");
  });

  it("fails closed when no active pointer exists", async () => {
    await expect(loadActivePMaterialityWave("/tmp/definitely-absent-sdp-v2-root")).resolves.toEqual({ status: "FAILED_CLOSED", reason: "ACTIVE_WAVE_UNAVAILABLE" });
  });
});
