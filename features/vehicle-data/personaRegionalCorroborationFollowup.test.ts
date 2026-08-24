import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { personaRegionalCorroborationFollowupSchema } from "./personaRegionalCorroborationFollowup";

const load = (wave: "02" | "03" | "04") => personaRegionalCorroborationFollowupSchema.parse(JSON.parse(readFileSync(path.join(process.cwd(), `data/production/personas/evidence/regional-corroboration/release-candidates/v1.0.0-wave-${wave}-2026-08-24/regional-corroboration.json`), "utf8")) as unknown);

describe("persona regional corroboration follow-up waves", () => {
  const wave02 = load("02");
  const wave03 = load("03");
  const wave04 = load("04");

  it("keeps wave 02 within prestige, value and adventure", () => {
    expect(wave02.includedTraits).toEqual(["PRESTIGE", "VALUE", "ADVENTURE"]);
    expect(wave02.families.flatMap((family) => family.claims).every((claim) => wave02.includedTraits.includes(claim.trait))).toBe(true);
  });

  it("keeps wave 03 within comfort, practicality and technology", () => {
    expect(wave03.includedTraits).toEqual(["COMFORT", "PRACTICALITY", "TECHNOLOGY"]);
    expect(wave03.families.flatMap((family) => family.claims).every((claim) => wave03.includedTraits.includes(claim.trait))).toBe(true);
  });

  it("does not duplicate claims across waves", () => {
    const wave02Claims = new Set(wave02.families.flatMap((family) => family.claims.map((claim) => claim.personaClaimId)));
    expect(wave03.families.flatMap((family) => family.claims).some((claim) => wave02Claims.has(claim.personaClaimId))).toBe(false);
    const priorClaims = new Set([...wave02Claims, ...wave03.families.flatMap((family) => family.claims.map((claim) => claim.personaClaimId))]);
    expect(wave04.families.flatMap((family) => family.claims).some((claim) => priorClaims.has(claim.personaClaimId))).toBe(false);
  });

  it("partitions every editorial-policy persona claim exactly once", () => {
    const persona = JSON.parse(readFileSync(path.join(process.cwd(), "data/production/personas/evidence/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24/persona-evidence.json"), "utf8")) as {
      families: Array<{ claims: Array<{ claimId: string; derivationPolicy: string }> }>;
    };
    const editorialPolicies = new Set(["EDITORIAL_CHARACTER_CONSENSUS", "OFFICIAL_EDITORIAL_CHARACTER_CORROBORATION"]);
    const expected = persona.families.flatMap((family) => family.claims).filter((claim) => editorialPolicies.has(claim.derivationPolicy)).map((claim) => claim.claimId).sort();
    const actual = [wave02, wave03, wave04].flatMap((release) => release.families.flatMap((family) => family.claims.map((claim) => claim.personaClaimId))).sort();
    expect(actual).toEqual(expected);
  });

  it("puts every remaining neutral editorial trait in the final wave", () => {
    expect(wave04.includedTraits).toEqual(["DESIGN", "DRIVING_ENGAGEMENT", "FAMILY", "URBAN", "COMMERCIAL", "SUSTAINABILITY", "MINIMALISM"]);
    expect(wave04.families.flatMap((family) => family.claims).every((claim) => wave04.includedTraits.includes(claim.trait))).toBe(true);
  });

  it("chains each follow-up release checksum to its immediate predecessor", () => {
    const manifest02 = JSON.parse(readFileSync(path.join(process.cwd(), "data/production/personas/evidence/regional-corroboration/release-candidates/v1.0.0-wave-02-2026-08-24/coverage-manifest.json"), "utf8")) as { payloadSha256: string };
    const manifest03 = JSON.parse(readFileSync(path.join(process.cwd(), "data/production/personas/evidence/regional-corroboration/release-candidates/v1.0.0-wave-03-2026-08-24/coverage-manifest.json"), "utf8")) as { payloadSha256: string };
    expect(wave03.predecessorReleaseChecksum).toBe(manifest02.payloadSha256);
    expect(wave04.predecessorReleaseChecksum).toBe(manifest03.payloadSha256);
  });

  it("cannot activate or mutate ranking without owner review", () => {
    for (const release of [wave02, wave03, wave04]) {
      expect(release.activationPerformed).toBe(false);
      expect(release.families.every((family) => !family.rankingMutationAllowed && family.ownerReviewRequired)).toBe(true);
    }
  });
});
