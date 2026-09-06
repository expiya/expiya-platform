import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { loadActiveCatalogSnapshot } from "@/features/decision/v2/catalog/snapshot";
import { createProductionCatalogReleaseRepository } from "@/features/decision/v2/catalog/fileSystemRepository.server";
import { loadProductionDecisionLayers } from "@/features/decision/v2/layers/productionAdapter.server";
import { parseEquipmentReviewedAssociationCandidate } from "@/features/vehicle-data/equipmentReviewedAssociationAdapter";

const root = process.cwd();
const attempt = process.argv[2] ?? "004";
if (!/^(?:004|005)$/u.test(attempt)) throw new Error("UNSUPPORTED_SIMULATION_ATTEMPT");
const dry = path.join(root, `data/production/catalog/release-candidates/v0.55.3/activation-dry-run-attempt-${attempt}`);
const output = path.join(dry, "runtime-simulation-result.json");
const sha = (value: Buffer | string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const layerPaths = {
  catalog: ["catalog", "activeCatalog.generated.ts"],
  dailyLife: ["technical-daily-life", "activeTechnicalDailyLife.generated.ts"],
  persona: ["personas/safe-traits", "activeVehiclePersonaSafeTraits.generated.ts"],
  equipment: ["equipment-evidence", "activeEquipmentEvidence.generated.ts"],
} as const;
async function main(): Promise<void> {
 const plan = JSON.parse(await readFile(path.join(dry, "preflight-plan.json"), "utf8")) as { dryRunId: string; [key: string]: unknown };
 const stage = await mkdtemp(path.join(tmpdir(), "expiya-attempt-004-"));
 try {
  for (const [key, [directory, moduleName]] of Object.entries(layerPaths)) {
    const target = path.join(stage, "data/production", directory);
    await mkdir(target, { recursive: true });
    await symlink(path.join(root, "data/production", directory, "releases"), path.join(target, "releases"));
    await writeFile(path.join(target, "active.json"), await readFile(path.join(dry, "proposed-pointers", `${key}.json`)));
    await writeFile(path.join(target, moduleName), await readFile(path.join(dry, "proposed-generated-modules", `${key}.ts.txt`)));
  }
  const catalogResult = await loadActiveCatalogSnapshot({ repository: createProductionCatalogReleaseRepository(stage), now: new Date("2026-08-19T18:30:00.000+03:00") });
  if (catalogResult.status !== "READY") throw new Error(`CATALOG_LOADER:${JSON.stringify(catalogResult)}`);
  const snapshot = catalogResult.snapshot;
  if (snapshot.variants.length !== 549) throw new Error("CATALOG_COUNT");
  const layers = await loadProductionDecisionLayers(snapshot, stage);
  if (layers.dailyLife.status !== "READY" || layers.persona.status !== "READY" || layers.diagnostics.length) throw new Error(`LAYER_ADAPTER:${JSON.stringify(layers.diagnostics)}`);
  const equipmentBase = path.join(stage, "data/production/equipment-evidence");
  const equipmentPointer = JSON.parse(await readFile(path.join(equipmentBase, "active.json"), "utf8"));
  const equipmentRaw = await readFile(path.join(equipmentBase, "releases", equipmentPointer.activeEquipmentEvidenceRelease, "equipment-evidence.json"), "utf8");
  const equipment = parseEquipmentReviewedAssociationCandidate(JSON.parse(equipmentRaw));
  const coverage = equipment.coverage;
  if (coverage?.catalogVariantCount !== 549 || coverage.verifiedAssertionCoverage?.exactVariantCount !== 4 || coverage.reviewedAssociationOnlyCoverage?.exactVariantCount !== 2 || coverage.uncoveredCoverage?.exactVariantCount !== 543 || equipment.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED") throw new Error("EQUIPMENT_RUNTIME_COVERAGE_OR_AUTHORITY");
  const quarantine = JSON.parse(await readFile(path.join(root, "data/production/catalog/releases/v0.55.3/quarantine-registry.json"), "utf8")).records.map((item: { exactVariantId: string }) => item.exactVariantId);
  const refs = [equipment.verifiedAssertions, equipment.reviewedAssociations, equipment.verifiedTrimLinks, equipment.projections].flat().filter((item) => quarantine.includes(item.exactVariantId));
  if (refs.length) throw new Error("EQUIPMENT_QUARANTINE_REFERENCE");
  const imported: Record<string, boolean> = {};
  for (const [key, [directory, moduleName]] of Object.entries(layerPaths)) {
    const importedModule = await import(`${pathToFileURL(path.join(stage, "data/production", directory, moduleName)).href}?attempt${attempt}`);
    imported[key] = Object.keys(importedModule).length > 0;
    if (!imported[key]) throw new Error(`${key.toUpperCase()}_MODULE_EMPTY`);
  }
  const result = { status: "PASSED", dryRunId: plan.dryRunId, productionCatalogSnapshotLoader: "READY", catalog: { release: snapshot.authority.releaseVersion, fingerprint: snapshot.authority.catalogFingerprint, recordCount: snapshot.variants.length, quarantineAbsent: true }, dailyLife: { status: layers.dailyLife.status, mappingCount: layers.dailyLife.status === "READY" ? layers.dailyLife.mappings.length : 0, candidateCoverage: layers.dailyLife.status === "READY" ? layers.dailyLife.candidateCoverage : 0 }, persona: { status: layers.persona.status, candidateCoverage: layers.persona.status === "READY" ? layers.persona.candidateCoverage : 0 }, equipment: { status: "READY_SHADOW_ONLY", coverage: { verified: 4, associationOnly: 2, uncovered: 543, total: 549 }, quarantineReferenceCount: 0, authority: equipment.decisionAuthority, payloadChecksum: sha(equipmentRaw) }, generatedModules: imported, v2CatalogLayerCompositionBoundary: "READY", prePostValidatorParity: "SHARED_PRODUCTION_LOADERS_USED", activeProductionPointersChanged: false };
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  const ready = { ...plan, status: "READY_FOR_RENEWED_EXPLICIT_ATOMIC_ACTIVATION_APPROVAL", runtimeSimulationChecksum: sha(await readFile(output)), runtimeSimulation: result };
  await writeFile(path.join(dry, "atomic-activation-plan.json"), `${JSON.stringify(ready, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
 } catch (error) {
   const message = error instanceof Error ? error.message : String(error);
   const temporal = message.includes("TEMPORAL_INVARIANT_VIOLATION");
   const failure = { status: "FAILED_FAIL_CLOSED", dryRunId: plan.dryRunId, blocker: temporal ? "CATALOG_TEMPORAL_INVARIANT_VIOLATION" : "CATALOG_RUNTIME_SCHEMA_REJECTED", error: message, activeProductionPointersChanged: false, activationReady: false };
   await writeFile(output, `${JSON.stringify(failure, null, 2)}\n`);
   await writeFile(path.join(dry, "atomic-activation-plan.json"), `${JSON.stringify({ ...plan, status: temporal ? "BLOCKED_CATALOG_TEMPORAL_INVARIANT" : "BLOCKED_CATALOG_RUNTIME_TIMESTAMP_SCHEMA", runtimeSimulationChecksum: sha(await readFile(output)), runtimeSimulation: failure }, null, 2)}\n`);
   console.error(JSON.stringify(failure, null, 2));
   process.exitCode = 1;
 } finally {
   await rm(stage, { recursive: true, force: true });
 }
}

void main();
