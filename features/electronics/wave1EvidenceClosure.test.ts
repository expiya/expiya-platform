import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ELECTRONICS_WAVE_1_CATEGORY_IDS, validateWave1EvidenceRelease, type Wave1EvidenceRelease } from "./wave1EvidenceClosure";

const root = path.join(process.cwd(), "data/production/electronics/wave-1-evidence/releases/ELECTRONICS-WAVE-1-EVIDENCE-TR-v0.1");
const release = JSON.parse(readFileSync(path.join(root, "evidence-release.json"), "utf8")) as Wave1EvidenceRelease;
const sha = (file: string) => `sha256:${createHash("sha256").update(readFileSync(path.join(root, file))).digest("hex")}`;

describe("Electronics Wave 1 evidence closure", () => {
  it("covers every authoritative Wave 1 category with multiple exact candidates", () => {
    expect(release.categoryReadiness.map(row => row.categoryId)).toEqual(ELECTRONICS_WAVE_1_CATEGORY_IDS);
    expect(release.categoryReadiness.every(row => row.candidateCount >= 2)).toBe(true);
    expect(validateWave1EvidenceRelease(release)).toEqual([]);
  });
  it("keeps exact identities unique and Türkiye applicability independent of international sources", () => {
    expect(new Set(release.products.map(row => row.exactProductId)).size).toBe(release.products.length);
    expect(new Set(release.products.map(row => row.configurationIdentity)).size).toBe(release.products.length);
    for (const product of release.products) expect(product.trApplicabilitySourceIds.some(sourceId => release.sources.some(source => source.sourceId === sourceId && source.market === "TR" && source.trApplicabilityAuthority === "EXACT"))).toBe(true);
    expect(release.sources.filter(source => source.authority === "INTERNATIONAL_BOUNDED").every(source => source.trApplicabilityAuthority === "NONE")).toBe(true);
  });
  it("binds exact manuals to local bytes, checksums and locators", () => {
    expect(release.manuals).toHaveLength(2);
    for (const manual of release.manuals) { expect(sha(manual.path)).toBe(manual.sha256); expect(manual.locator).toMatch(/Pages 1-/); expect(manual.decisionAuthority).toBe("NONE"); }
  });
  it("keeps draft policy, persona, interpretation, unknown and L10 effects neutral", () => {
    expect(release.personaSignals.every(row => row.decisionUse === "NONE" && row.directCandidateEffect === "NONE")).toBe(true);
    expect(release.dailyLifeInterpretations.every(row => row.technicalTruthAuthority === "NONE" && row.directCandidateEffect === "NONE")).toBe(true);
    expect(release.decisionProjections.every(row => row.status === "DRAFT_NON_ACTIVE" && row.unknownTreatment === "NEUTRAL_FAIL_CLOSED")).toBe(true);
    expect(release.unknownsAndConflicts.every(row => row.effect === "NEUTRAL_FAIL_CLOSED")).toBe(true);
    expect(release.boundaries).toMatchObject({ l7Experience: "ABSENT", l10YEffect: "NONE", amazonStatusEffect: "NONE", activationPerformed: false });
  });
  it("preserves the parent richness release as an immutable input", () => {
    const parent = JSON.parse(readFileSync(path.join(process.cwd(), "data/production/electronics/richness/releases/ELECTRONICS-CATALOG-RICHNESS-TR-v0.1/catalog-release.json"), "utf8"));
    expect(parent.releaseDigest).toBe(release.parentRichnessDigest);
  });
});
