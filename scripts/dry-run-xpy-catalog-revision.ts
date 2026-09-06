import path from "node:path";

import { APPLIANCES_PRODUCT_TYPES, type AppliancesProductType } from "@/features/appliances/contracts";
import { validateCatalogRevisionManifest } from "@/features/xpy/catalog/revision";
import { dryRunAppliancesCatalogRevision, dryRunCarsCatalogRevision, loadAllActiveAppliancesCatalogRevisions } from "@/features/xpy/catalog/revisionAdapters.server";

const args = process.argv.slice(2);
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const domain = value("--domain");
const release = value("--release");
const category = value("--category");
const root = path.resolve(value("--root") ?? process.cwd());

async function main(): Promise<void> {
  if (domain === "cars") {
    if (!release) throw new TypeError("USAGE: --domain cars --release <version>");
    const report = await dryRunCarsCatalogRevision(root, release);
    console.log(JSON.stringify(report, null, 2));
    if (report.validation.status !== "PASS") process.exitCode = 1;
    return;
  }
  if (domain === "appliances" && args.includes("--all-active")) {
    const revisions = await loadAllActiveAppliancesCatalogRevisions(root);
    const categories = revisions.map((manifest) => ({ categoryId: manifest.scope.categoryId, releaseVersion: manifest.release.version, memberCount: manifest.release.memberCount, validationIssues: validateCatalogRevisionManifest(manifest) }));
    const report = {
      schemaVersion: "xpy-appliances-catalog-portfolio-dry-run/v1",
      departmentId: "APPLIANCES",
      categoryCount: categories.length,
      exactProductCount: revisions.reduce((total, manifest) => total + manifest.release.memberCount, 0),
      validation: categories.every((item) => item.validationIssues.length === 0) ? "PASS" : "FAIL",
      categories,
      activationGate: { status: "REPORT_ONLY", automaticActivation: false, activePointersMutated: false },
    };
    console.log(JSON.stringify(report, null, 2));
    if (report.validation !== "PASS") process.exitCode = 1;
    return;
  }
  if (domain === "appliances") {
    if (!category || !release || !(APPLIANCES_PRODUCT_TYPES as readonly string[]).includes(category)) throw new TypeError("USAGE: --domain appliances --category <CATEGORY_ID> --release <version>, or --all-active");
    const report = await dryRunAppliancesCatalogRevision(root, category as AppliancesProductType, release);
    console.log(JSON.stringify(report, null, 2));
    if (report.validation.status !== "PASS") process.exitCode = 1;
    return;
  }
  throw new TypeError("USAGE: --domain cars|appliances [--category <CATEGORY_ID>] --release <version>; Appliances inventory: --domain appliances --all-active");
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ schemaVersion: "xpy-catalog-revision-dry-run-error/v1", status: "FAILED_CLOSED", error: error instanceof Error ? error.message : "UNKNOWN_ERROR", activePointerMutated: false }, null, 2));
  process.exitCode = 1;
});
