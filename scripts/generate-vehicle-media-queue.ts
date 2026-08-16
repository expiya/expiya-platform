import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ProductionCatalogReleasePayload } from "@/features/vehicle-data/productionCatalogRelease";

interface MediaFamily {
  brand: string;
  model: string;
  generation: string;
  bodyStyle: string;
  modelYearFrom: number;
  modelYearTo: number;
  variantIds: string[];
}

const inputPath = path.resolve("data/production/catalog/releases/v0.55.0/catalog.json");
const outputPath = path.resolve("data/production/media/vehicle-media-collection-queue.csv");
const csv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export async function generateVehicleMediaQueue(): Promise<{ families: number; variants: number; outputPath: string }> {
  const payload = JSON.parse(await readFile(inputPath, "utf8")) as ProductionCatalogReleasePayload;
  const families = new Map<string, MediaFamily>();

  for (const { variant } of payload.records) {
    const brand = variant.brand.value.trim();
    const model = variant.model.value.trim();
    const generation = variant.generation?.value.trim() ?? "";
    const bodyStyle = variant.bodyStyle.value.trim();
    const modelYear = variant.modelYear.value;
    const key = [brand, model, generation, bodyStyle].map((value) => value.toLocaleUpperCase("tr-TR")).join("|");
    const current = families.get(key);
    if (current) {
      current.modelYearFrom = Math.min(current.modelYearFrom, modelYear);
      current.modelYearTo = Math.max(current.modelYearTo, modelYear);
      current.variantIds.push(variant.id);
    } else {
      families.set(key, { brand, model, generation, bodyStyle, modelYearFrom: modelYear, modelYearTo: modelYear, variantIds: [variant.id] });
    }
  }

  const ordered = [...families.values()].sort((left, right) =>
    `${left.brand}|${left.model}|${left.bodyStyle}`.localeCompare(`${right.brand}|${right.model}|${right.bodyStyle}`, "tr"));
  const header = ["family_key", "brand", "model", "generation", "body_style", "model_year_from", "model_year_to", "variant_count", "variant_ids", "collection_status", "rights_status", "candidate_source_url", "review_notes"];
  const rows = ordered.map((family) => [
    [family.brand, family.model, family.generation, family.bodyStyle].filter(Boolean).join("|"),
    family.brand, family.model, family.generation, family.bodyStyle, family.modelYearFrom, family.modelYearTo,
    family.variantIds.length, family.variantIds.sort().join("|"), "NOT_STARTED", "NOT_REVIEWED", "", "",
  ].map(csv).join(","));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${header.map(csv).join(",")}\n${rows.join("\n")}\n`, "utf8");
  return { families: ordered.length, variants: payload.records.length, outputPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateVehicleMediaQueue().then((result) => console.log(JSON.stringify(result)));
}
