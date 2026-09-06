import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ELECTRONICS_WAVE_2_CATEGORY_IDS, ELECTRONICS_WAVE_2_PARENT_DIGEST, validateWave2EvidenceClosure, type Wave2EvidenceRelease } from "./wave2EvidenceClosure";

const root = process.cwd();
const releaseDir = path.join(root, "data/production/electronics/wave-2-evidence/releases/ELECTRONICS-WAVE-2-EVIDENCE-TR-v0.1");
const release = JSON.parse(readFileSync(path.join(releaseDir, "evidence-release.json"), "utf8")) as Wave2EvidenceRelease;

describe("Wave 2 evidence closure", () => {
  it("covers the exact six baseline categories and satisfies the release contract", () => {
    expect(ELECTRONICS_WAVE_2_CATEGORY_IDS).toHaveLength(6);
    expect(validateWave2EvidenceClosure(release)).toEqual([]);
  });
  it("has multiple candidates, manufacturers, and comparable fields in every category", () => {
    expect(release.categoryReadiness.every(row => row.candidateCount >= 2 && row.manufacturerCount >= 2 && row.comparableFieldCount >= 4)).toBe(true);
  });
  it("keeps unresolved identity out of decision-evidence-ready categories", () => {
    const ready = new Set(release.categoryReadiness.filter(row => row.readiness === "DECISION_EVIDENCE_READY").map(row => row.categoryId));
    expect(release.products.filter(row => ready.has(row.categoryId)).every(row => row.unresolvedIdentityDiscriminators.length === 0)).toBe(true);
  });
  it("binds exact local manuals to their recorded checksums", () => {
    for (const manual of release.manuals) expect(`sha256:${createHash("sha256").update(readFileSync(path.join(root, manual.localPath))).digest("hex")}`).toBe(manual.sha256);
  });
  it("pins Wave 1 and preserves authority and activation boundaries", () => {
    const parentRaw = readFileSync(path.join(root, "data/production/electronics/wave-1-repair/releases/ELECTRONICS-WAVE-1-DIVERSITY-REPAIR-TR-v0.1/repair-release.json"), "utf8");
    expect(`sha256:${createHash("sha256").update(parentRaw).digest("hex")}`).toBe(ELECTRONICS_WAVE_2_PARENT_DIGEST);
    expect(release.boundaries).toEqual({ l7Experience: "ABSENT", mediaImported: false, l10YEffect: "NONE", amazonStatusEffect: "NONE", activationPerformed: false, registryChanged: false, runtimeChanged: false, databaseChanged: false, pointerChanged: false, deploymentPerformed: false });
  });
});
