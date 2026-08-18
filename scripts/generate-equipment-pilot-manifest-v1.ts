import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { selectEquipmentPilot } from "@/features/vehicle-data/equipmentPilotSelection";
import { loadProductionCatalogSnapshotForTest } from "@/features/decision/v2/catalog/productionSnapshotFixture.testSupport";
import { projectRelativePriceSegments } from "@/features/decision/v2/affordability/priceSegmentation";
import { PRICE_AUTHORITY_POLICY_V1 } from "@/features/decision/v2/affordability/policy";
import { EQUIPMENT_FEATURE_CODES, type EquipmentPilotMatrixRow } from "@/types/equipmentEvidence";

const RELEASE = "pilot-v1.0.1-catalog-v0.55.1-2026-08-18", OLD_RELEASE = "pilot-v1.0.0-catalog-v0.55.1-2026-08-18", GENERATED_AT = "2026-08-18T20:00:00.000Z";
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
async function immutable(file: string, content: string) { try { await writeFile(file, content, { encoding: "utf8", flag: "wx" }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; if (await readFile(file, "utf8") !== content) throw new Error(`IMMUTABLE_PILOT_ARTIFACT_DIFFERS:${file}`); } }
async function main() {
  const root = process.cwd(), pointer = JSON.parse(await readFile(path.join(root, "data/production/catalog/active.json"), "utf8")) as { active_catalog_release_version: string; catalog_payload_hash: `sha256:${string}` };
  if (pointer.active_catalog_release_version !== "0.55.1") throw new Error("PILOT_REQUIRES_CATALOG_V0.55.1");
  const catalog = JSON.parse(await readFile(path.join(root, "data/production/catalog/releases/v0.55.1/catalog.json"), "utf8")) as { records: Parameters<typeof selectEquipmentPilot>[0]["records"] };
  const loaded = await loadProductionCatalogSnapshotForTest(new Date(GENERATED_AT)); if (loaded.status !== "READY") throw new Error("PRICE_SEGMENTATION_CATALOG_UNAVAILABLE");
  const projection = projectRelativePriceSegments({ snapshot: loaded.snapshot, evaluationTime: GENERATED_AT, priceAuthorityPolicy: PRICE_AUTHORITY_POLICY_V1 });
  const priceSegments = Object.fromEntries(projection.projections.map((item) => [item.exactVariantId, item.globalCatalogPriceSegment === "LOWEST_20" || item.globalCatalogPriceSegment === "VALUE_20_40" ? "MAINSTREAM" : item.globalCatalogPriceSegment === "MID_40_60" ? "MID" : "HIGH"] as const));
  const manifest = selectEquipmentPilot({ records: catalog.records, priceSegments, catalogFingerprint: pointer.catalog_payload_hash, generatedAt: GENERATED_AT, count: 28 });
  const matrix: EquipmentPilotMatrixRow[] = manifest.variants.flatMap((variant) => EQUIPMENT_FEATURE_CODES.map((featureCode) => ({ exactVariantId: variant.exactVariantId, featureCode, disposition: "NOT_RESEARCHED" as const })));
  const dir = path.join(root, "data/production/equipment-evidence/pilots", RELEASE); await mkdir(dir, { recursive: true });
  await immutable(path.join(dir, "pilot-manifest.json"), json(manifest)); await immutable(path.join(dir, "pilot-matrix.json"), json(matrix)); await immutable(path.join(dir, "price-segmentation-reference.json"), json(projection));
  const firstPair = manifest.variants.filter((item) => item.testAxes.includes("PAIRED_TRIM_PACKAGE_PROJECTION")).sort((a, b) => a.pairedFamilyId!.localeCompare(b.pairedFamilyId!) || a.exactVariantId.localeCompare(b.exactVariantId)).slice(0, 2);
  if (firstPair.length !== 2 || firstPair[0]?.pairedFamilyId !== firstPair[1]?.pairedFamilyId) throw new Error("FIRST_BATCH_PAIR_INVALID");
  await immutable(path.join(dir, "batch-001-manifest.json"), json({ batchId: "EE-PILOT-001-BATCH-001", pilotId: "EE-PILOT-001", researchCycleId: "EE-PILOT-001-CYCLE-001", lifecycleState: "PREPARED", exactVariantIds: firstPair.map((item) => item.exactVariantId), featureCodes: EQUIPMENT_FEATURE_CODES, researchStartedAt: null, completedAt: null }));
  const oldDir = path.join(root, "data/production/equipment-evidence/pilots", OLD_RELEASE);
  await immutable(path.join(oldDir, "lifecycle.json"), json({ pilotId: OLD_RELEASE, lifecycleState: "SUPERSEDED_BEFORE_COLLECTION", reason: "PILOT_DISTRIBUTION_AND_PAIRED_TRIM_COVERAGE_INSUFFICIENT", supersededByPilotId: "EE-PILOT-001", researchStartedAt: null, completedAt: null, recordedAt: GENERATED_AT }));
  console.log(JSON.stringify({ release: RELEASE, variants: manifest.variants.length, matrixRows: matrix.length, brands: new Set(manifest.variants.map((item) => item.canonicalBrand)).size, pairedFamilies: new Set(manifest.variants.flatMap((item) => item.pairedFamilyId ? [item.pairedFamilyId] : [])).size }));
}
void main();
