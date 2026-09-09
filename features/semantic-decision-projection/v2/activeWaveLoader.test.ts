import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { loadActivePMaterialityWave } from "./activeWaveLoader.server";
import { ACTIVE_P_MATERIALITY_POINTER_RAW, ACTIVE_P_MATERIALITY_RELEASE_RAW } from "./activeWaveBundle.generated";

const sha = (value: string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

describe("active P-materiality wave loader", () => {
  it("loads the digest-bound atomic Wave-1A pointer fail closed", async () => {
    const loaded = await loadActivePMaterialityWave();
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    expect(loaded.wave.categories).toHaveLength(54);
    expect(loaded.wave.categories).toEqual(expect.arrayContaining(["AIR_FRYER", "AIR_PURIFIER", "BICYCLE", "CORDLESS_DRILL", "DISHWASHER", "ELECTRIC_BICYCLE", "ELECTRIC_SCOOTER", "HEADPHONES", "LAPTOP", "NEW_CAR", "REFRIGERATOR", "SMARTPHONE", "STROLLER", "VACUUM", "WASHING_MACHINE"]));
    expect(loaded.wave.projections).toHaveLength(56);
    expect(new Set(loaded.wave.projections.flatMap((projection) => projection.offerings.map((offering) => offering.exactOfferingId))).size).toBe(813);
    expect(loaded.wave.pCategories).toHaveLength(48);
    expect(loaded.wave.informationOnlyCategories).toEqual(["AIR_PURIFIER", "BUILT_IN_MICROWAVE_OVEN", "HEADPHONES", "HOB", "SPLIT_AIR_CONDITIONER", "WASHING_MACHINE"]);
    expect(loaded.wave.yAuthority).toBe("UNCHANGED_NONE_GRANTED");
  });

  it("bundles byte-exact pointer and release authority without changing either digest", async () => {
    const pointerSource = await readFile("data/production/semantic-decision-projection/active.json", "utf8");
    const pointer = JSON.parse(ACTIVE_P_MATERIALITY_POINTER_RAW) as { releaseFile: string; releaseSha256: string };
    const releaseSource = await readFile(pointer.releaseFile, "utf8");
    expect(ACTIVE_P_MATERIALITY_POINTER_RAW).toBe(pointerSource);
    expect(ACTIVE_P_MATERIALITY_RELEASE_RAW).toBe(releaseSource);
    expect(sha(ACTIVE_P_MATERIALITY_RELEASE_RAW)).toBe(pointer.releaseSha256);
  });

  it("fails closed when no active pointer exists", async () => {
    await expect(loadActivePMaterialityWave("/tmp/definitely-absent-sdp-v2-root")).resolves.toEqual({ status: "FAILED_CLOSED", reason: "ACTIVE_WAVE_UNAVAILABLE" });
  });
});
