import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createProductionCatalogReleaseRepository } from "../features/decision/v2/catalog/fileSystemRepository.server";
import { loadActiveCatalogSnapshot } from "../features/decision/v2/catalog/snapshot";
import { listPaidComparisonAlternatives } from "../features/paid-comparison/eligibility";
import { buildPaidComparisonReportDraft } from "../features/paid-comparison/reportDraft";
import { createPaidComparisonPdf } from "../features/paid-comparison/pdfDocument.server";
import { resolveVehicleImage } from "../features/vehicle-data/resolveVehicleImage";

async function main() {
const loaded = await loadActiveCatalogSnapshot({ repository: createProductionCatalogReleaseRepository(process.cwd()), now: new Date() });
if (loaded.status !== "READY") throw new Error("ACTIVE_CATALOG_NOT_READY");
const decision = loaded.snapshot.variants.find((variant) => {
  const image = resolveVehicleImage({ variantId: variant.id, brand: variant.brand, model: variant.model, bodyStyle: variant.decisionFacts.bodyStyle.value, modelYear: variant.decisionFacts.modelYear.value });
  return image.status !== "PLACEHOLDER" && listPaidComparisonAlternatives({ decisionVariantId: variant.id, variants: loaded.snapshot.variants }).filter((item) => resolveVehicleImage({ variantId: item.id, brand: item.brand, model: item.model, bodyStyle: item.decisionFacts.bodyStyle.value, modelYear: item.decisionFacts.modelYear.value }).status !== "PLACEHOLDER").length >= 2;
});
if (!decision) throw new Error("PDF_FIXTURE_VARIANT_NOT_FOUND");
const alternatives = listPaidComparisonAlternatives({ decisionVariantId: decision.id, variants: loaded.snapshot.variants }).filter((item) => resolveVehicleImage({ variantId: item.id, brand: item.brand, model: item.model, bodyStyle: item.decisionFacts.bodyStyle.value, modelYear: item.decisionFacts.modelYear.value }).status !== "PLACEHOLDER").slice(0, 2);
if (!alternatives[0] || !alternatives[1]) throw new Error("PDF_FIXTURE_ALTERNATIVES_NOT_FOUND");
const report = buildPaidComparisonReportDraft({ catalogReleaseVersion: loaded.snapshot.authority.releaseVersion, catalogFingerprint: loaded.snapshot.authority.catalogFingerprint, generatedAt: new Date().toISOString(), approvedNeeds: [{ concept: "bodyStyle", summary: `Araç sınıfı: ${decision.decisionFacts.bodyStyle.value}`, value: decision.decisionFacts.bodyStyle.value }], variants: [decision, alternatives[0], alternatives[1]] });
const bytes = await createPaidComparisonPdf(report);
const outputDirectory = path.join(process.cwd(), "output", "pdf");
await mkdir(outputDirectory, { recursive: true });
const output = path.join(outputDirectory, "expiya-cars-dinamik-karsilastirma-raporu.pdf");
await writeFile(output, bytes);
console.log(JSON.stringify({ output, bytes: bytes.length }));
}

void main();
