import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.join(process.cwd(), "data/production/personas/evidence/shadow-evaluations/PERSONA-V39-SHADOW-2026-08-24-01");
const raw = readFileSync(path.join(root, "shadow-report.json"), "utf8");
const report = JSON.parse(raw);
const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));

describe("persona V3.9 shadow evaluation", () => {
  it("evaluates all seven persona corpora over the unchanged eligible set", () => {
    expect(report.corpusCount).toBe(7);
    expect(report.evaluations).toHaveLength(7);
    expect(report.evaluations.every((item: { candidateCountBefore: number; candidateCountAfter: number; candidateSetChanged: boolean }) => item.candidateCountBefore === report.candidateCount && item.candidateCountAfter === report.candidateCount && !item.candidateSetChanged)).toBe(true);
  });

  it("keeps every persona score bounded to 0.75", () => {
    expect(report.evaluations.every((item: { capRespected: boolean; maxNewPersonaScore: number }) => item.capRespected && item.maxNewPersonaScore <= 0.75)).toBe(true);
    expect(report.invariants.personaScoreCapRespected).toBe(true);
  });

  it("excludes all five owner-rejected traits", () => {
    expect(report.rejectedTraitChecks).toHaveLength(5);
    expect(report.rejectedTraitChecks.every((item: { excluded: boolean }) => item.excluded)).toBe(true);
    expect(report.invariants.allRejectedTraitsExcluded).toBe(true);
  });

  it("preserves filtering, fact, affordability and offer-governance boundaries", () => {
    expect(report.invariants).toMatchObject({ identicalExactVariantCoverage: true, allCorporaCandidateSetsUnchanged: true, hardFilterAuthority: "NONE", technicalFactAuthority: "NONE", equipmentAuthority: "NONE", affordabilityMutation: "NONE", offerGovernanceMutation: "NONE" });
    expect(report.disposition).toBe("PASS");
  });

  it("checksum-binds the shadow report", () => {
    expect(manifest.reportSha256).toBe(`sha256:${createHash("sha256").update(raw).digest("hex")}`);
  });
});
