import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const base = path.join(process.cwd(), "data/production/personas/evidence/research-completion/release-candidates/v3.9.0-deferred-150-2026-08-24");
const raw = readFileSync(path.join(base, "research-completion.json"), "utf8");
type Claim = { neutralSummary: string; supportedSpanOrTimestamp: string; sourceIds: string[]; exactVariantIds: string[] };
type Candidate = { status: string; authority: string };
type Family = {
  familyId: string;
  exactVariantIds: string[];
  contaminationChecks: { exactFamilyBound: boolean; generationVerified: boolean };
  claims: Claim[];
  regionalDiscoveryCandidates: Candidate[];
  ownerReviewRequired: boolean;
  rankingMutationAllowed: boolean;
};
type Release = {
  families: Family[];
  researchPolicy: { regionalDiscoveryIsAuthority: boolean };
  activationPerformed: boolean;
  rankingMutationAllowed: boolean;
};
type Manifest = { payloadSha256: string; familyCount: number; claimCount: number; emptyTraitCount: number };
const release = JSON.parse(raw) as Release;
const manifest = JSON.parse(readFileSync(path.join(base, "manifest.json"), "utf8")) as Manifest;

describe("persona V3.9 deferred 150 family research completion", () => {
  it("covers exactly all 150 deferred families and 353 claims", () => {
    expect(release.families).toHaveLength(150);
    expect(release.families.flatMap((family) => family.claims)).toHaveLength(353);
    expect(new Set(release.families.map((family) => family.familyId)).size).toBe(150);
  });

  it("leaves no researched trait without summary, exact span and two source ids", () => {
    for (const family of release.families) {
      expect(family.exactVariantIds.length).toBeGreaterThan(0);
      expect(family.contaminationChecks.exactFamilyBound).toBe(true);
      expect(family.contaminationChecks.generationVerified).toBe(true);
      for (const claim of family.claims) {
        expect(claim.neutralSummary.length).toBeGreaterThan(0);
        expect(claim.supportedSpanOrTimestamp.length).toBeGreaterThan(0);
        expect(claim.sourceIds.length).toBeGreaterThanOrEqual(2);
        expect(claim.exactVariantIds).toEqual(family.exactVariantIds);
      }
    }
    expect(manifest.emptyTraitCount).toBe(0);
  });

  it("keeps discovery candidates non-authoritative until exact review", () => {
    expect(release.researchPolicy.regionalDiscoveryIsAuthority).toBe(false);
    for (const candidate of release.families.flatMap((family) => family.regionalDiscoveryCandidates)) {
      expect(candidate.status).toBe("DISCOVERED_NOT_PROMOTED");
      expect(candidate.authority).toBe("NONE_UNTIL_EXACT_REVIEW");
    }
  });

  it("cannot activate or mutate ranking before owner review", () => {
    expect(release.activationPerformed).toBe(false);
    expect(release.rankingMutationAllowed).toBe(false);
    expect(release.families.every((family) => family.ownerReviewRequired && !family.rankingMutationAllowed)).toBe(true);
  });

  it("has a checksum-bound manifest", () => {
    expect(manifest.payloadSha256).toBe(`sha256:${createHash("sha256").update(raw).digest("hex")}`);
    expect(manifest.familyCount).toBe(150);
    expect(manifest.claimCount).toBe(353);
  });
});
