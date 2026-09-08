import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function main() {
const root = process.cwd();
const releaseFile = path.join(root, "data/production/semantic-decision-projection/releases/SDP-V2-ALL-ACTIVE-CATALOGS-TR-v4.0/release.json");
const outputDirectory = path.join(root, "outputs/all-active-catalog-p-materiality-production-01/final-report");
const release = JSON.parse(await readFile(releaseFile, "utf8")) as {
  releaseId: string;
  releaseDigest: string;
  sourceProductionCommit: string;
  totals: Record<string, number>;
  coverage: readonly Record<string, unknown>[];
  informationOnlyCategories: readonly string[];
  yAuthority: string;
};
const report = {
  schemaVersion: "all-active-catalog-p-materiality-report/v1",
  releaseId: release.releaseId,
  releaseDigest: release.releaseDigest,
  sourceProductionCommit: release.sourceProductionCommit,
  totals: release.totals,
  yAuthority: release.yAuthority,
  blockerCategories: release.informationOnlyCategories,
  categories: [...release.coverage].sort((left, right) => `${left.departmentId}/${left.categoryId}`.localeCompare(`${right.departmentId}/${right.categoryId}`)),
};
const raw = `${JSON.stringify(report, null, 2)}\n`;
const digest = `sha256:${createHash("sha256").update(raw).digest("hex")}`;
await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "category-readiness.json"), raw);
await writeFile(path.join(outputDirectory, "category-readiness.sha256"), `${digest}\n`);
console.log(JSON.stringify({ event: "all_active_catalog_p_materiality_reported", releaseId: release.releaseId, digest, totals: release.totals }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
