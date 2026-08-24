import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.join(process.cwd(), "data/production/personas/evidence/release-readiness/PERSONA-V39-READINESS-2026-08-24-01");
const raw = readFileSync(path.join(root, "readiness-report.json"), "utf8");
const report = JSON.parse(raw);
const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));

describe("persona V3.9 release readiness", () => {
  it("marks the activated persona scope ready with bounded authority", () => {
    expect(report.personaScope).toMatchObject({ status: "READY", familyCount: 385, variantCount: 549, approvedTraitCount: 595, rejectedTraitCount: 5, hardFilterAuthority: "NONE", technicalFactAuthority: "NONE", equipmentAuthority: "NONE" });
  });

  it("records successful shadow, build, type and persona-specific gates", () => {
    expect(report.shadowEvaluation).toMatchObject({ status: "PASS", corpusCount: 7, candidateCount: 549, candidateSetsUnchanged: true, rejectedTraitsExcluded: true, scoreCapRespected: true });
    expect(report.gates.productionBuild.status).toBe("PASS");
    expect(report.gates.typescript.status).toBe("PASS");
    expect(report.gates.targetedPersonaEslint.status).toBe("PASS");
  });

  it("records the green global gates without authorizing deployment", () => {
    expect(report.gates.fullRepositoryTests).toMatchObject({ status: "PASS", passedTests: 3492, failedTests: 0 });
    expect(report.gates.fullRepositoryEslint).toMatchObject({ status: "PASS_WITH_WARNINGS", errors: 0, warnings: 3 });
    expect(report.overallDisposition).toBe("PERSONA_V39_READY_FOR_COMMIT_REVIEW");
    expect(report.deploymentAuthorized).toBe(false);
  });

  it("checksum-binds the readiness report", () => {
    expect(manifest.reportSha256).toBe(`sha256:${createHash("sha256").update(raw).digest("hex")}`);
  });
});
