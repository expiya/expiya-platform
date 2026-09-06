import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildXpyCatalogCoverageReport } from "../features/xpy/catalog/coverageReport.server";
import { buildCarsExactVariantGapInventory } from "../features/xpy/catalog/carsGapInventory.server";

async function main(): Promise<void> {
  const root = process.cwd();
  const output = path.join(root, "data/governance/xpy-catalog/v0.1/coverage-report.json");
  const carsOutput = path.join(root, "data/governance/xpy-catalog/v0.1/cars-exact-variant-gap-inventory.json");
  const previous = JSON.parse(await readFile(output, "utf8")) as { generatedAt?: string };
  const generatedAt = process.argv.includes("--preserve-timestamp") && previous.generatedAt ? previous.generatedAt : new Date().toISOString();
  const [report, carsInventory] = await Promise.all([buildXpyCatalogCoverageReport(root, generatedAt), buildCarsExactVariantGapInventory(root, generatedAt)]);
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(carsOutput, `${JSON.stringify(carsInventory, null, 2)}\n`, "utf8");
  console.log(`XPY Catalog coverage report written: ${output}`);
  console.log(`Cars exact-variant gap inventory written: ${carsOutput}`);
}

void main();
