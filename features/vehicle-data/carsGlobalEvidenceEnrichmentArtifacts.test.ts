import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const release = "data/production/cars-global-evidence/release-candidates/v1.0.0-catalog-v0.55.4-2026-09-05";
const load = async (name: string) => JSON.parse(await readFile(path.join(root, release, name), "utf8"));
const digest = (bytes: Buffer) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

describe("Cars global evidence enrichment candidate", () => {
  it("preserves all 549 exact Türkiye identities with one researched ledger row each", async () => {
    const [catalog, ledger] = await Promise.all([
      readFile(path.join(root, "data/production/catalog/releases/v0.55.4/catalog.json"), "utf8").then(JSON.parse),
      load("research-ledger.json"),
    ]);
    const catalogIds = catalog.records.map((record: { variant: { id: string } }) => record.variant.id).sort();
    const ledgerIds = ledger.rows.map((row: { exactVariantId: string }) => row.exactVariantId).sort();
    expect(ledger.rowCount).toBe(549);
    expect(new Set(ledgerIds).size).toBe(549);
    expect(ledgerIds).toEqual(catalogIds);
    expect(ledger.rows.every((row: { exactTechnicalEvidence: { sources: unknown[] }; manualResearch: { targetPrimarySources: unknown[] } }) => row.exactTechnicalEvidence.sources.length > 0 || row.manualResearch.targetPrimarySources.length > 0)).toBe(true);
  });

  it("keeps family and international manual evidence out of exact equipment authority", async () => {
    const ledger = await load("research-ledger.json");
    for (const row of ledger.rows) {
      if (row.manualResearch.l9Authority === "FAMILY_SCOPED_NOT_EXACT") {
        expect(row.manualResearch.l9ByteReady).toBe(false);
      }
      expect(row.dailyLife.authority === "NONE" || row.dailyLife.authority === "EXPLANATION_ONLY").toBe(true);
    }
  });

  it("requires preserved bytes, reviewed exact applicability and locators for L9 readiness", async () => {
    const [manuals, ledger] = await Promise.all([load("manual-index.json"), load("research-ledger.json")]);
    expect(manuals.artifacts).toHaveLength(3);
    for (const artifact of manuals.artifacts) {
      const bytes = await readFile(path.join(root, release, artifact.relativePath));
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(digest(bytes)).toBe(artifact.expectedSha256);
      expect(artifact.locators.length).toBeGreaterThan(0);
      expect(artifact.reviewedDecisionIds.length).toBeGreaterThan(0);
      const row = ledger.rows.find((item: { exactVariantId: string }) => item.exactVariantId === artifact.exactVariantId);
      expect(row.manualResearch.l9Authority).toBe("READ_ONLY_EXACT_TR");
    }
  });

  it("binds the repaired BYD locator pages into both L9 and daily-life projections", async () => {
    const [manuals, dailyLife] = await Promise.all([
      load("manual-index.json"),
      load("daily-life-exact-applications.json"),
    ]);
    const byd = manuals.artifacts.find((artifact: { sourceId: string }) => artifact.sourceId === "OM-ART-BYD-SEAL-U-EV-TR");
    const expected = new Map([
      ["OM-TR-OWNER-99CA516FD63C60027D22", { physicalPdfPage: 118, sectionHeading: "Adaptif Hız Sabitleme Sistemi (AHSS)" }],
      ["OM-TR-OWNER-6EEAE89B6D0F883D6DE1", { physicalPdfPage: 134, sectionHeading: "Kör Nokta Destek Sistemi" }],
    ]);

    for (const [decisionId, locator] of expected) {
      const manualIndex = byd.reviewedDecisionIds.indexOf(decisionId);
      expect(manualIndex).toBeGreaterThanOrEqual(0);
      expect(byd.locators[manualIndex]).toMatchObject(locator);
      const application = dailyLife.applications.find(
        (item: { manualEvidence?: { decisionId: string } }) => item.manualEvidence?.decisionId === decisionId,
      );
      expect(application.manualEvidence).toMatchObject(locator);
      expect(application.decisionUse).toBe("NONE");
      expect(application.directCandidateEffect).toBe("NONE");
    }
  });

  it("records bounded gains without fabricating strict Advisor or comparison readiness", async () => {
    const report = await load("coverage-report.json");
    expect(report.metrics.exactVerifiedCatalogFields).toEqual({ before: 11154, after: 11154, delta: 0 });
    expect(report.metrics.equipmentCoveredVariants).toEqual({ before: 6, after: 10, delta: 4 });
    expect(report.metrics.manualL9ReadyVariants).toEqual({ before: 0, after: 3, delta: 3 });
    expect(report.metrics.exactDailyLifeApplications).toEqual({ before: 0, after: 20, delta: 20 });
    expect(report.metrics.strictAdvisorReadyVariants.after).toBe(0);
    expect(report.metrics.strictComparisonReadyVariants.after).toBe(0);
    expect(report.metrics.improvedVariants + report.metrics.unchangedVariants).toBe(549);
  });

  it("passes the dry-run and proves active pointers are byte-identical", async () => {
    const [candidate, dryRun] = await Promise.all([load("candidate.json"), load("dry-run-validation.json")]);
    expect(candidate.state).toBe("IMMUTABLE_RELEASE_CANDIDATE_NOT_ACTIVE");
    expect(candidate.activationPerformed).toBe(false);
    expect(dryRun.status).toBe("PASS");
    expect(Object.values(dryRun.checks).every(Boolean)).toBe(true);
    expect(dryRun.activePointerHashesAfter).toEqual(dryRun.activePointerHashesBefore);
    for (const [relativePath, expected] of Object.entries(dryRun.activePointerHashesAfter)) {
      const bytes = await readFile(path.join(root, relativePath));
      expect(digest(bytes)).toBe(expected);
    }
  });

  it("binds every candidate artifact to its immutable digest", async () => {
    const [checksums, manifest] = await Promise.all([load("checksums.json"), load("manifest.json")]);
    for (const [relativePath, expected] of Object.entries(checksums.files)) {
      const bytes = await readFile(path.join(root, release, relativePath));
      expect(digest(bytes)).toBe(expected);
    }
    expect(manifest.releaseDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(manifest.files["daily-life-exact-applications.json"]).toBe(checksums.files["daily-life-exact-applications.json"]);
  });
});
