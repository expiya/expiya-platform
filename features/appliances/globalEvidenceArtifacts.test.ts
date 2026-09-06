import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stableJson, verifySha256 } from "./globalEvidence";

const root = process.cwd();
const releaseDir = path.join(root, "data/production/appliances/global-evidence/release-candidates/APPLIANCES-GLOBAL-EVIDENCE-TR-v0.1-rc1");
const researchDir = path.join(root, "data/research/appliances-global-evidence-01");
const readRelease = (name: string) => readFile(path.join(releaseDir, name), "utf8");
const readResearch = (name: string) => readFile(path.join(researchDir, name), "utf8");

describe("repaired Appliances global-evidence candidate artifacts", () => {
  it("uses activation-effective canonical counts instead of raw admissions", async () => {
    const coverage = JSON.parse(await readRelease("coverage-report.json"));
    expect(coverage.before).toMatchObject({ exactVerified: 1253, manuals: 14, l9Entries: 9, absent: 213 });
    expect(coverage.after).toMatchObject({ exactVerified: 1253, familyScoped: 60, manuals: 17, l9Entries: 16, absent: 207, l6Interpretations: 60 });
    expect(coverage.canonicalGains).toEqual({ newManuals: 3, newL9Entries: 7, newManualProducts: 3, newL9Products: 3 });
  });

  it("does not duplicate the active Arzum manual or page-4 L9 grounding", async () => {
    const candidate = JSON.parse(await readRelease("candidate.json"));
    expect(candidate.manualCandidates.map((manual: { productId: string }) => manual.productId)).not.toContain("ARZUM_AR012_LAGUNA_TR");
    const arzum = candidate.l9AdvisorKnowledge.filter((entry: { productId: string }) => entry.productId === "ARZUM_AR012_LAGUNA_TR");
    expect(arzum).toHaveLength(1);
    expect(arzum[0].locator).toEqual({ kind: "INSTALLATION", page: 10, section: "MONTAJ ŞEMASI" });
  });

  it("keeps every manual-researched product out of the unresolved ledger", async () => {
    const [admitted, unresolved] = await Promise.all([
      readResearch("admitted-manuals.json").then(JSON.parse),
      readResearch("unresolved-ledger.json").then(JSON.parse),
    ]);
    const unresolvedIds = new Set(unresolved.rows.map((row: { productId: string }) => row.productId));
    expect(admitted).toHaveLength(4);
    for (const manual of admitted) expect(unresolvedIds.has(manual.productId)).toBe(false);
  });

  it("binds governance inputs, reports, pointers, and manual bytes into the release digest", async () => {
    const [candidateRaw, coverageRaw, dryRunRaw, manifestRaw, completionRaw, ledgerRaw, sourceRegistryRaw, unresolvedRaw, exclusionsRaw, admittedRaw] = await Promise.all([
      readRelease("candidate.json"), readRelease("coverage-report.json"), readRelease("decision-neutrality-dry-run.json"), readRelease("manifest.json"), readRelease("completion-report.md"),
      readResearch("research-ledger.json"), readResearch("source-registry.json"), readResearch("unresolved-ledger.json"), readResearch("manual-exclusions.json"), readResearch("admitted-manuals.json"),
    ]);
    const manifest = JSON.parse(manifestRaw);
    for (const binding of manifest.manualByteBindings) {
      expect(verifySha256(binding.sha256, await readFile(path.join(root, binding.path)))).toBe(true);
    }
    expect(manifest.activePointerHashesAfter).toEqual(manifest.activePointerHashesBefore);
    const composite = { candidate: candidateRaw.trim(), coverage: coverageRaw.trim(), ledger: ledgerRaw.trim(), sourceRegistry: sourceRegistryRaw.trim(), unresolved: unresolvedRaw.trim(), dryRun: dryRunRaw.trim(), completionReport: completionRaw.trim(), manualExclusions: exclusionsRaw.trim(), admittedManuals: admittedRaw.trim(), manualByteBindings: manifest.manualByteBindings, pointerHashesBefore: manifest.activePointerHashesBefore, pointerHashesAfter: manifest.activePointerHashesAfter };
    expect(verifySha256(manifest.releaseDigest, stableJson(composite))).toBe(true);
  });
});
