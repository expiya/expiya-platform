import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireActiveCategoryPMateriality } from "@/features/semantic-decision-projection/v2/runtimeAdmission.server";
import { createPMaterialityRuntimeSlice, nextPMaterialityRuntimeQuestion } from "@/features/semantic-decision-projection/v2/runtimeConsumer";

const endpoints: Readonly<Record<string, string>> = Object.freeze({ APPLIANCES: "/api/appliances/conversation", ELECTRONICS: "/api/electronics/conversation", BABY_AND_CHILD: "/api/baby/conversation", MOBILITY: "/api/mobility/conversation", TOOLS: "/api/tools/conversation", CARS: "/api/cars/conversation/v3" });
async function main() {
  const root = process.cwd();
  const report = JSON.parse(await readFile(path.join(root, "outputs/all-active-catalog-p-materiality-production-01/final-report/category-readiness.json"), "utf8")) as { releaseId: string; categories: readonly { departmentId: string; categoryId: string; exactOfferingCount: number; p: string }[] };
  const rows = [];
  for (const category of report.categories) {
    const authority = await requireActiveCategoryPMateriality(category.categoryId, root);
    const slice = createPMaterialityRuntimeSlice({ departmentId: category.departmentId, authority });
    const execution = nextPMaterialityRuntimeQuestion(slice, authority);
    rows.push({ departmentId: category.departmentId, categoryId: category.categoryId, authority: { releaseId: authority.releaseId, readiness: authority.readiness, projectionIds: authority.projections.map(item => item.identity.projectionId), exactOfferingCount: authority.exactOfferingIds.length, questionAdmission: authority.questionAdmission }, transport: { rootEndpoint: category.categoryId === "SMARTPHONE" ? endpoints[category.departmentId] : "/api/platform/p-materiality", preservedDomainEndpoint: endpoints[category.departmentId] }, runtimeConsumption: execution.runtimeConsumption, legacyEquivalentRuntime: category.categoryId === "SMARTPHONE" ? "ACTIVE_DIGEST_BOUND_BESPOKE" : null, selectedQuestionId: execution.selectedQuestion?.questionId ?? null, candidatePoolUnchanged: true, suppressionHonored: authority.readiness === "INFORMATION_ONLY" ? execution.runtimeConsumption === "NO_MATERIAL_QUESTION" : null, yAuthority: "UNCHANGED_NONE_GRANTED" });
  }
  const artifact = { schemaVersion: "p-materiality-runtime-consumption-matrix/v1", sourceReleaseId: report.releaseId, sourceBaseCommit: "5d6a1b9731786d925dd2da97dbeb8b14d6f1a9ce", totals: { categories: rows.length, artifactPReady: rows.filter(row => row.authority.readiness === "P_READY").length, executableActiveV4PReady: rows.filter(row => row.authority.readiness === "P_READY" && row.runtimeConsumption === "EXECUTABLE_MATERIAL_QUESTION").length, bespokeEquivalentPReady: rows.filter(row => row.legacyEquivalentRuntime).length, runtimePReady: rows.filter(row => row.authority.readiness === "P_READY" && (row.runtimeConsumption === "EXECUTABLE_MATERIAL_QUESTION" || row.legacyEquivalentRuntime)).length, informationOnly: rows.filter(row => row.authority.readiness === "INFORMATION_ONLY").length, suppressionHonored: rows.filter(row => row.suppressionHonored).length }, rows };
  const output = path.join(root, "outputs/all-category-p-runtime-consumer-closure-01");
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "runtime-consumption-matrix.json"), `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify(artifact.totals));
}
void main();
