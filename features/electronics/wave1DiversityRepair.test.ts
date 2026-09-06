import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateWave1DiversityRepair, type Wave1DiversityRepairRelease } from "./wave1DiversityRepair";

const root = path.join(process.cwd(), "data/production/electronics/wave-1-repair/releases/ELECTRONICS-WAVE-1-DIVERSITY-REPAIR-TR-v0.1");
const release = JSON.parse(readFileSync(path.join(root, "repair-release.json"), "utf8")) as Wave1DiversityRepairRelease;
const sha = (name: string) => `sha256:${createHash("sha256").update(readFileSync(path.join(root, name))).digest("hex")}`;

describe("Electronics Wave 1 diversity and evidence repair", () => {
  it("passes the repair contract and makes all six categories evidence-ready", () => {
    expect(validateWave1DiversityRepair(release)).toEqual([]);
    expect(release.categoryReadiness).toHaveLength(6);
    expect(release.categoryReadiness.every(row => row.readiness === "DECISION_EVIDENCE_READY" && row.policyStatus === "REVIEW_REQUIRED_NON_ACTIVE")).toBe(true);
  });
  it("adds manufacturer diversity to the four affected categories", () => {
    for (const categoryId of ["SMARTPHONE", "LAPTOP", "TABLET", "MONITOR"]) {
      const products = release.products.filter(row => row.categoryId === categoryId);
      expect(products.length).toBeGreaterThanOrEqual(3);
      expect(new Set(products.map(row => row.manufacturer)).size).toBeGreaterThanOrEqual(2);
    }
  });
  it("preserves television and e-reader evidence byte-equivalently", () => {
    expect(release.carryForward).toMatchObject({ categories: ["TELEVISION", "E_READER"], byteEquivalent: true });
    expect(release.carryForward.childSubsetDigest).toBe(release.carryForward.parentSubsetDigest);
  });
  it("keeps international, commerce, semantic and unknown authority isolated", () => {
    expect(release.sources.filter(row => row.authority === "INTERNATIONAL_BOUNDED" || row.authority === "COMMERCE_DISCOVERY").every(row => row.trApplicabilityAuthority === "NONE" && row.decisionAuthority === "NONE")).toBe(true);
    expect(release.personaSignals.every(row => row.decisionUse === "NONE" && row.directCandidateEffect === "NONE")).toBe(true);
    expect(release.dailyLifeInterpretations.every(row => row.technicalTruthAuthority === "NONE" && row.directCandidateEffect === "NONE")).toBe(true);
    expect(release.unknownsAndConflicts.every(row => row.effect === "NEUTRAL_FAIL_CLOSED")).toBe(true);
    expect(release.boundaries).toMatchObject({ l7Experience: "ABSENT", l10YEffect: "NONE", amazonStatusEffect: "NONE", activationPerformed: false });
  });
  it("binds generated artifacts and the complete immutable parent digest", () => {
    const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
    expect(manifest.parent.artifactDigest).toBe("sha256:2545954078b5cddbafcb0acc7251301b6c0790b94aca6b7d4ac6bdfeb9e2997e");
    for (const [name, digest] of Object.entries(manifest.artifacts as Record<string, string>)) expect(sha(name)).toBe(digest);
    expect(manifest.activation.performed).toBe(false);
  });
});
