import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const categories = ["ELECTRIC_STORAGE_WATER_HEATER", "INSTANTANEOUS_ELECTRIC_WATER_HEATER"] as const;
const schema = z.object({
  schemaVersion: z.literal("appliances-new-category-batch-e-authority-report/v1"),
  releaseVersion: z.literal("APPLIANCES-NEW-CATEGORY-BATCH-E-TR-v0.1"),
  workUnitId: z.literal("WU-XPY-APPL-NEW-CATEGORY-BATCH-05-ELECTRIC-WATER-HEATING-AUTHORITY-01"),
  verdict: z.literal("ACTIVE_WITH_MANDATORY_PROFESSIONAL_SITE_GATE"),
  categoryResults: z.array(z.object({ categoryId: z.enum(categories), status: z.literal("ACTIVE"), releaseVersion: z.string(), releaseDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/u), members: z.array(z.string()).length(3), brands: z.array(z.string()).length(3), safetyGate: z.literal("PROFESSIONAL_EXACT_MODEL_SITE_VERIFICATION_REQUIRED_BEFORE_Y"), manualCoverage: z.string(), mediaCoverage: z.string(), priceCoverage: z.string(), l0ToL10: z.string(), unknowns: z.array(z.string()) })).length(2),
  policyBoundaries: z.object({ separation: z.literal("STORAGE_AND_INSTANTANEOUS_NEVER_CROSS_MAP"), manualL9: z.string(), persona: z.literal("PLANNING_ONLY_NO_Y_EFFECT"), advisor: z.literal("READ_ONLY_NOT_Y"), affiliate: z.literal("NEVER_RANKS"), unknown: z.literal("ASK_CLARIFY_OR_FAIL_CLOSED_NEUTRAL") }).passthrough(),
  runtimeEffect: z.object({ catalogMembersAdded: z.literal(6), activePointersCreated: z.literal(2), productionDeployment: z.literal(false), databaseMigrationApplied: z.literal(false) }).passthrough(),
  nextWorkUnit: z.literal("WU-XPY-APPL-24-CATEGORY-COMPLETION-MEDIA-COMMERCE-UX-AUDIT-01"),
}).passthrough();
const sha = (raw: string) => createHash("sha256").update(raw).digest("hex");
export async function loadBatchEAuthorityAssessment(root: string) { try { const base = path.join(root, "data/governance/appliances/new-category-batch-e/releases/APPLIANCES-NEW-CATEGORY-BATCH-E-TR-v0.1"); const manifest = JSON.parse(await readFile(path.join(base, "manifest.json"), "utf8")) as { files: { path: string; sha256: string }[] }; for (const file of manifest.files) if (`sha256:${sha(await readFile(path.join(base, file.path), "utf8"))}` !== file.sha256) throw new Error("DIGEST"); const report = schema.parse(JSON.parse(await readFile(path.join(base, "authority-report.json"), "utf8"))); if (new Set(report.categoryResults.map(result => result.categoryId)).size !== 2 || report.categoryResults.some(result => !result.priceCoverage.includes("BUDGET_ELIGIBILITY_UNKNOWN"))) throw new Error("BOUNDARY"); return { status: "VALID_ACTIVE" as const, report }; } catch { return { status: "FAILED_CLOSED" as const, reason: "BATCH_E_AUTHORITY_ASSESSMENT_INVALID" as const }; } }
