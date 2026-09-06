import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const batchCategories = ["FREEZER", "BUILT_IN_OVEN", "FREESTANDING_COOKER", "HOB", "RANGE_HOOD"] as const;
const reportSchema = z.object({
  schemaVersion: z.literal("appliances-new-category-batch-a-authority-report/v1"),
  releaseVersion: z.literal("APPLIANCES-NEW-CATEGORY-BATCH-A-TR-v0.1"),
  parentAuthority: z.object({ authorityId: z.literal("APPLIANCES-NEW-CATEGORY-PORTFOLIO-TR/v0.1"), payloadDigest: z.literal("sha256:719090386cd90a2959e6632c40da8c605229da83f10f69cb0b22941433cdadab") }),
  runtimeCompatibility: z.object({ runtime: z.literal("XPY_RUNTIME/v0.1"), catalog: z.literal("XPY_CATALOG/v0.1"), secondEngineCreated: z.literal(false) }),
  verdict: z.literal("ACTIVE"),
  categoryResults: z.array(z.object({ categoryId: z.enum(batchCategories), status: z.literal("ACTIVE"), exactProduct: z.object({ brand: z.string(), model: z.string() }), manual: z.string(), media: z.string(), price: z.string() })).length(5),
  runtimeEffect: z.object({ registryStatusesChanged: z.literal(true), catalogMembersAdded: z.literal(5), activePointersCreated: z.literal(5), routesOpened: z.literal(true), advisorEnabled: z.literal(true), paidComparisonEnabled: z.literal(true), productionDeployment: z.literal(false), databaseMigrationApplied: z.literal(false) }),
  nextWorkUnit: z.literal("WU-XPY-APPL-NEW-CATEGORY-BATCH-02-MICROWAVE-CLIMATE-AUTHORITY-01"),
}).passthrough();

const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");
export async function loadBatchAAuthorityAssessment(root: string) {
  try {
    const base = path.join(root, "data/governance/appliances/new-category-batch-a/releases/APPLIANCES-NEW-CATEGORY-BATCH-A-TR-v0.1");
    const manifest = JSON.parse(await readFile(path.join(base, "manifest.json"), "utf8")) as { files: { path: string; sha256: string }[] };
    for (const file of manifest.files) {
      const raw = await readFile(path.join(base, file.path), "utf8");
      if (`sha256:${sha256(raw)}` !== file.sha256) throw new Error("DIGEST_MISMATCH");
    }
    const report = reportSchema.parse(JSON.parse(await readFile(path.join(base, "authority-report.json"), "utf8")));
    if (new Set(report.categoryResults.map(item => item.categoryId)).size !== batchCategories.length) throw new Error("MEMBERSHIP_MISMATCH");
    return { status: "VALID_ACTIVE" as const, report };
  } catch {
    return { status: "FAILED_CLOSED" as const, reason: "BATCH_A_AUTHORITY_ASSESSMENT_INVALID" as const };
  }
}
