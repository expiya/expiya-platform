import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildActiveCatalogInventory } from "../features/semantic-decision-projection/v2/activeCatalogInventory.server";
import { immutableDigest } from "../features/semantic-decision-projection/v2/canonical";

const root = process.cwd();
const output = path.join(root, "outputs/all-active-catalog-p-materiality-production-01/checkpoint-01-inventory");
const authorization = Object.freeze({
  workUnit: "WU-XPY-ALL-ACTIVE-CATALOG-P-MATERIALITY-PRODUCTION-01",
  grantedInTask: true,
  allowed: Object.freeze(["READ_ONLY_RESEARCH", "OFFICIAL_AND_INDEPENDENT_WEB_EVIDENCE", "FILES_AND_DETERMINISTIC_GENERATION", "TEST_BUILD_BROWSER_QA", "OWNER_REVIEW_AND_APPEND_ONLY_RECEIPTS", "FAIL_CLOSED_ATOMIC_ACTIVATION", "NON_FORCE_FEATURE_BRANCH_COMMIT_AND_PUSH", "EXACT_SHA_VERCEL_PREVIEW", "SINGLE_GUARDED_PRODUCTION_CUTOVER", "ROLLBACK_ON_FAILED_SMOKE", "SERVER_ONLY_SCOPED_SECRET_USE_WITHOUT_VALUE_DISCLOSURE"]),
  forbidden: Object.freeze(["FORCE_PUSH", "DIRECT_MAIN_MUTATION", "REPOSITORY_PROJECT_OR_DOMAIN_DELETE", "DESTRUCTIVE_SCHEMA_MIGRATION", "REAL_USER_DATA_MUTATION", "UNBOUNDED_CLEANUP", "SECRET_DISCLOSURE_LOG_OR_COMMIT", "UNAUTHORIZED_EXTERNAL_MESSAGE_FORM_OR_ACCOUNT_ACTION", "BYPASS_ACTION_TIME_APPROVAL"]),
});
const lineage = Object.freeze({ sourceCommit: "fcf916b9be578265379d1278df0678c8d1f8a517", sourceBranch: "codex/smartphone-p-materiality-current-production-integration-01", productionDeployment: "dpl_Gwiu7XW8vbHViUDiYEqpRZ3qaKEx", rollbackDeployment: "dpl_6yDLb3XejPR5v8eqF5d1r6VXps3a" });

async function main() {
  const inventory = await buildActiveCatalogInventory(root);
  const categories = inventory.map((entry) => ({
    ...entry,
    exactOfferingCount: entry.exactOfferingIds.length,
    readiness: entry.categoryId === "SMARTPHONE"
      ? { information: "READY", p: "ACTIVE_VERIFIED_REFERENCE", y: "NOT_READY" }
      : entry.departmentId === "CARS"
        ? { information: "READY", p: "REFERENCE_CHARACTERIZATION_REQUIRES_SDP_V2_ADMISSION", y: "EXISTING_OWNER_AUTHORITY_UNCHANGED" }
        : { information: "AUDIT_REQUIRED", p: "BLOCKED_NO_PRODUCTION_EXACT_SDP_V2_PACKAGE", y: "NOT_READY" },
    questionCount: entry.categoryId === "SMARTPHONE" ? 4 : 0,
    unknownGap: entry.categoryId === "SMARTPHONE" ? "SOURCE_ACTIVATED; EXACT DAILY_LIFE COVERAGE AUDIT_REMAINS" : "EXACT_DAILY_LIFE_SEMANTIC_AND_CANDIDATE_EFFECT_AUDIT_REQUIRED",
  }));
  const waves = Object.freeze([
    { wave: 0, categories: ["ELECTRONICS:SMARTPHONE", "CARS:NEW_CAR"], purpose: "REFERENCE_CHARACTERIZATION_AND_INVARIANT_LOCK" },
    { wave: 1, categories: categories.filter((entry) => ["APPLIANCES", "BABY_AND_CHILD", "MOBILITY", "TOOLS"].includes(entry.departmentId)).map((entry) => `${entry.departmentId}:${entry.categoryId}`), purpose: "HIGH_IMPACT_EXISTING_DOMAIN_PACKS" },
    { wave: 2, categories: categories.filter((entry) => entry.departmentId === "ELECTRONICS" && entry.categoryId !== "SMARTPHONE").map((entry) => `${entry.departmentId}:${entry.categoryId}`), purpose: "ELECTRONICS_EVIDENCE_RICH_CATEGORY_WAVES" },
    { wave: 3, categories: ["CATALOG_FACTORY:ACTIVE_OVERLAY_105", "FUTURE_DOMAIN_PACKS"], purpose: "FACTORY_READINESS_V2_AND_FUTURE_ADMISSION" },
  ]);
  const payload = { schemaVersion: "all-active-catalog-p-materiality-inventory/v1", generatedAt: "2026-09-08T00:00:00.000+03:00", lineage, authorization, totals: { departments: new Set(categories.map((entry) => entry.departmentId)).size, categories: categories.length, exactOfferings: categories.reduce((sum, entry) => sum + entry.exactOfferingCount, 0), informationReady: categories.filter((entry) => entry.readiness.information === "READY").length, pActive: categories.filter((entry) => entry.readiness.p === "ACTIVE_VERIFIED_REFERENCE").length, yOpenedByThisProgram: 0 }, categories, waves };
  const digest = immutableDigest(payload);
  await mkdir(output, { recursive: true });
  await Promise.all([writeFile(path.join(output, "inventory-readiness.json"), `${JSON.stringify(payload, null, 2)}\n`), writeFile(path.join(output, "inventory-readiness.sha256"), `${digest}\n`)]);
  process.stdout.write(`${JSON.stringify({ digest, totals: payload.totals, waves: waves.map((wave) => ({ wave: wave.wave, categoryCount: wave.categories.length })) })}\n`);
}
void main();
