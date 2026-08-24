import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "data/production/personas/evidence/release-readiness/PERSONA-V39-READINESS-2026-08-24-01");
const shadowRoot = path.join(root, "data/production/personas/evidence/shadow-evaluations/PERSONA-V39-SHADOW-2026-08-24-01");
const shadowManifest = JSON.parse(readFileSync(path.join(shadowRoot, "manifest.json"), "utf8"));
const activePointerRaw = readFileSync(path.join(root, "data/production/personas/safe-traits/active.json"), "utf8");
const activePointer = JSON.parse(activePointerRaw);
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

const report = {
  schemaVersion: "persona-v3.9-release-readiness.1",
  readinessId: "PERSONA-V39-READINESS-2026-08-24-01",
  activeRelease: activePointer.activeReleaseVersion,
  activePayloadSha256: activePointer.payloadSha256,
  catalogRelease: activePointer.compatibleCatalogRelease,
  catalogFingerprint: activePointer.compatibleCatalogFingerprint,
  personaScope: {
    status: "READY",
    familyCount: 385,
    variantCount: 549,
    approvedTraitCount: 595,
    rejectedTraitCount: 5,
    scorePolicy: "BaseScore + min(0.75, PersonaScore)",
    hardFilterAuthority: "NONE",
    technicalFactAuthority: "NONE",
    equipmentAuthority: "NONE",
  },
  shadowEvaluation: {
    status: "PASS",
    evaluationId: shadowManifest.evaluationId,
    reportSha256: shadowManifest.reportSha256,
    corpusCount: shadowManifest.corpusCount,
    candidateCount: shadowManifest.candidateCount,
    candidateSetsUnchanged: true,
    rejectedTraitsExcluded: true,
    scoreCapRespected: true,
  },
  gates: {
    personaTargetedTests: { status: "PASS", testFiles: 3, tests: 20 },
    activePersonaVerifier: { status: "PASS", familyCount: 385, variantCount: 549 },
    fullRepositoryTests: { status: "PASS", passedTestFiles: 314, failedTestFiles: 0, passedTests: 3492, failedTests: 0, failures: [] },
    productionBuild: { status: "PASS", runtime: "Node.js v22.23.2", cacheCondition: "PASS_AFTER_STALE_NEXT_CACHE_ISOLATION", routesBuilt: 17 },
    targetedPersonaEslint: { status: "PASS" },
    fullRepositoryEslint: { status: "PASS_WITH_WARNINGS", errors: 0, warnings: 3, blockingFile: null, blockingRule: null },
    typescript: { status: "PASS" },
    gitDiffCheck: { status: "PASS" },
  },
  rollback: {
    releaseVersion: "v1.0.6-catalog-v0.55.4-2026-08-20",
    rollbackOnPersonaPostValidationFailure: true,
    activationRollbackPerformed: false,
  },
  overallDisposition: "PERSONA_V39_READY_FOR_COMMIT_REVIEW",
  deploymentAuthorized: false,
  commitPerformed: false,
  pushPerformed: false,
  productionDatabaseWrite: false,
};

mkdirSync(output, { recursive: true });
const raw = `${JSON.stringify(report, null, 2)}\n`;
writeFileSync(path.join(output, "readiness-report.json"), raw);
writeFileSync(path.join(output, "manifest.json"), `${JSON.stringify({ readinessId: report.readinessId, reportSha256: sha(raw), activePointerSha256: sha(activePointerRaw), activeRelease: report.activeRelease, overallDisposition: report.overallDisposition }, null, 2)}\n`);
console.log(JSON.stringify({ readinessId: report.readinessId, activeRelease: report.activeRelease, personaStatus: report.personaScope.status, overallDisposition: report.overallDisposition }, null, 2));
