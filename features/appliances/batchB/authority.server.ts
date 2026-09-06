import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const activeCategories = ["COUNTERTOP_MICROWAVE_OVEN", "BUILT_IN_MICROWAVE_OVEN", "AIR_PURIFIER"] as const;
const reportSchema = z.object({
  schemaVersion: z.literal("appliances-new-category-batch-b-authority-report/v1"),
  releaseVersion: z.literal("APPLIANCES-NEW-CATEGORY-BATCH-B-TR-v0.1"),
  parentAuthority: z.object({ authorityId: z.literal("APPLIANCES-NEW-CATEGORY-PORTFOLIO-TR/v0.1"), payloadDigest: z.literal("sha256:719090386cd90a2959e6632c40da8c605229da83f10f69cb0b22941433cdadab") }),
  runtimeCompatibility: z.object({ runtime: z.literal("XPY_RUNTIME/v0.1"), catalog: z.literal("XPY_CATALOG/v0.1"), secondEngineCreated: z.literal(false) }),
  verdict: z.literal("PARTIAL"),
  categoryResults: z.array(z.object({ categoryId: z.enum([...activeCategories, "SPLIT_AIR_CONDITIONER"]), status: z.enum(["ACTIVE", "PARTIAL"]), members: z.array(z.string()), brands: z.array(z.string()), unknowns: z.array(z.string()) })).length(4),
  runtimeEffect: z.object({ catalogMembersAdded: z.literal(9), activePointersCreated: z.literal(3), splitRouteOpened: z.literal(false), productionDeployment: z.literal(false), databaseMigrationApplied: z.literal(false) }),
  nextWorkUnit: z.literal("WU-XPY-APPL-NEW-CATEGORY-BATCH-03-COFFEE-AUTHORITY-01"),
}).passthrough();
const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");

export async function loadBatchBAuthorityAssessment(root: string) {
  try {
    const base = path.join(root, "data/governance/appliances/new-category-batch-b/releases/APPLIANCES-NEW-CATEGORY-BATCH-B-TR-v0.1");
    const manifest = JSON.parse(await readFile(path.join(base, "manifest.json"), "utf8")) as { files: { path: string; sha256: string }[] };
    for (const file of manifest.files) if (`sha256:${sha256(await readFile(path.join(base, file.path), "utf8"))}` !== file.sha256) throw new Error("DIGEST_MISMATCH");
    const report = reportSchema.parse(JSON.parse(await readFile(path.join(base, "authority-report.json"), "utf8")));
    const active = report.categoryResults.filter(result => result.status === "ACTIVE");
    if (active.length !== 3 || active.some(result => result.members.length !== 3 || new Set(result.brands).size < 2)) throw new Error("MEMBERSHIP_MISMATCH");
    const split = report.categoryResults.find(result => result.categoryId === "SPLIT_AIR_CONDITIONER");
    if (split?.status !== "PARTIAL" || split.members.length !== 0) throw new Error("PAIR_BOUNDARY_MISMATCH");
    return { status: "VALID_PARTIAL" as const, report };
  } catch { return { status: "FAILED_CLOSED" as const, reason: "BATCH_B_AUTHORITY_ASSESSMENT_INVALID" as const }; }
}
