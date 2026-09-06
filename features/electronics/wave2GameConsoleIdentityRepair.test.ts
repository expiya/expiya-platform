import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ELECTRONICS_WAVE_2_GAME_CONSOLE_PARENT_DIGEST, validateWave2GameConsoleIdentityRepair, type Wave2GameConsoleIdentityRepairRelease } from "./wave2GameConsoleIdentityRepair";

const root = process.cwd();
const release = JSON.parse(readFileSync(path.join(root, "data/production/electronics/wave-2-repair/releases/ELECTRONICS-WAVE-2-GAME-CONSOLE-IDENTITY-REPAIR-TR-v0.1/repair-release.json"), "utf8")) as Wave2GameConsoleIdentityRepairRelease;

describe("Wave 2 game-console identity repair", () => {
  it("pins the immutable Wave 2 parent and validates the repair", () => {
    const parent = readFileSync(path.join(root, "data/production/electronics/wave-2-evidence/releases/ELECTRONICS-WAVE-2-EVIDENCE-TR-v0.1/evidence-release.json"));
    expect(`sha256:${createHash("sha256").update(parent).digest("hex")}`).toBe(ELECTRONICS_WAVE_2_GAME_CONSOLE_PARENT_DIGEST);
    expect(validateWave2GameConsoleIdentityRepair(release)).toEqual([]);
  });
  it("keeps configurations collision-free and distinguishes the Xbox variant", () => {
    expect(new Set(release.products.map(row => row.configurationIdentity)).size).toBe(release.products.length);
    expect(release.identityRepair.distinctConfigurationKey).toBe("SERIES_S|1TB|ALL_DIGITAL|CARBON_BLACK|MODEL_1883|NO_BUNDLE");
  });
  it("allows revision-sensitive claims only within the official Model 1883 source scope", () => {
    expect(release.identityRepair.revisionSensitiveClaims).toBe("LIMITED_TO_MODEL_1883_SOURCE_SCOPE");
    expect(release.sources.find(row => row.sourceId === release.identityRepair.technicalIdentitySourceId)?.trApplicabilityAuthority).toBe("NONE");
  });
  it("makes game consoles evidence-ready while retaining non-active policy", () => {
    expect(release.categoryReadiness.find(row => row.categoryId === "GAME_CONSOLE")).toMatchObject({ readiness: "DECISION_EVIDENCE_READY", policyStatus: "REVIEW_REQUIRED_NON_ACTIVE" });
  });
  it("proves every non-Xbox Wave 2 entity is byte-equivalent", () => expect(release.unchangedProof).toMatchObject({ byteEquivalent: true }));
});
