import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const categories = ["AIR_FRYER", "BLENDER", "FOOD_PROCESSOR"] as const;
const schema = z.object({
  schemaVersion: z.literal("appliances-new-category-batch-d-authority-report/v1"),
  releaseVersion: z.literal("APPLIANCES-NEW-CATEGORY-BATCH-D-TR-v0.1"),
  parentAuthority: z.object({ authorityId: z.literal("APPLIANCES-NEW-CATEGORY-PORTFOLIO-TR/v0.1"), payloadDigest: z.literal("sha256:719090386cd90a2959e6632c40da8c605229da83f10f69cb0b22941433cdadab") }),
  runtimeCompatibility: z.object({ runtime: z.literal("XPY_RUNTIME/v0.1"), catalog: z.literal("XPY_CATALOG/v0.1"), secondEngineCreated: z.literal(false) }),
  verdict: z.literal("ACTIVE"),
  categoryResults: z.array(z.object({ categoryId:z.enum(categories), status:z.literal("ACTIVE"), releaseVersion:z.string(), releaseDigest:z.string().regex(/^sha256:[a-f0-9]{64}$/u), members:z.array(z.string()).length(3), brands:z.array(z.string()).min(2), sourceCount:z.number().int().positive(), manualCoverage:z.string(), mediaCoverage:z.string(), priceCoverage:z.string(), l0ToL10:z.string(), unknowns:z.array(z.string()) })).length(3),
  policyBoundaries: z.object({ manualL9:z.string(), persona:z.literal("PLANNING_ONLY_NO_Y_EFFECT"), advisor:z.literal("READ_ONLY_NOT_Y"), affiliate:z.literal("NEVER_RANKS"), unknown:z.literal("NEUTRAL_NON_ADVANTAGING") }).passthrough(),
  runtimeEffect: z.object({ catalogMembersAdded:z.literal(9), activePointersCreated:z.literal(3), productionDeployment:z.literal(false), databaseMigrationApplied:z.literal(false) }).passthrough(),
  nextWorkUnit: z.literal("WU-XPY-APPL-NEW-CATEGORY-BATCH-05-ELECTRIC-WATER-HEATING-AUTHORITY-01"),
}).passthrough();
const sha=(raw:string)=>createHash("sha256").update(raw).digest("hex");
export async function loadBatchDAuthorityAssessment(root:string){try{const base=path.join(root,"data/governance/appliances/new-category-batch-d/releases/APPLIANCES-NEW-CATEGORY-BATCH-D-TR-v0.1");const manifest=JSON.parse(await readFile(path.join(base,"manifest.json"),"utf8")) as {files:{path:string;sha256:string}[]};for(const file of manifest.files)if(`sha256:${sha(await readFile(path.join(base,file.path),"utf8"))}`!==file.sha256)throw new Error("DIGEST_MISMATCH");const report=schema.parse(JSON.parse(await readFile(path.join(base,"authority-report.json"),"utf8")));if(new Set(report.categoryResults.map(x=>x.categoryId)).size!==3||report.categoryResults.some(x=>new Set(x.brands).size<2||!x.priceCoverage.includes("BUDGET_ELIGIBILITY_UNKNOWN")))throw new Error("BOUNDARY");return{status:"VALID_ACTIVE" as const,report};}catch{return{status:"FAILED_CLOSED" as const,reason:"BATCH_D_AUTHORITY_ASSESSMENT_INVALID" as const};}}
