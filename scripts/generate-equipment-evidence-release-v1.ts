import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { EQUIPMENT_FEATURE_DEFINITIONS, EQUIPMENT_INTENT_ALIASES } from "@/features/vehicle-data/equipmentEvidencePolicy";
import { equipmentEvidenceSha256, validateEquipmentEvidenceCompatibility } from "@/features/vehicle-data/validateEquipmentEvidenceLayer";
import type { EquipmentEvidenceLayer, EquipmentEvidenceManifest } from "@/types/equipmentEvidence";

const ROOT = process.cwd(), RELEASE = "v1.2.1-catalog-v0.55.1-2026-08-18" as const, GENERATED_AT = "2026-08-18T20:05:00.000Z";
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
async function immutable(file: string, content: string) { try { await writeFile(file, content, { encoding: "utf8", flag: "wx" }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; if (await readFile(file, "utf8") !== content) throw new Error(`IMMUTABLE_RELEASE_ARTIFACT_DIFFERS:${file}`); } }

async function main() {
  const catalogPointer = JSON.parse(await readFile(path.join(ROOT, "data/production/catalog/active.json"), "utf8")) as { active_catalog_release_version: string; catalog_payload_hash: `sha256:${string}` };
  if (catalogPointer.active_catalog_release_version !== "0.55.1") throw new Error("EQUIPMENT_RELEASE_REQUIRES_CATALOG_V0.55.1");
  const catalog = JSON.parse(await readFile(path.join(ROOT, "data/production/catalog/releases/v0.55.1/catalog.json"), "utf8")) as { records: { variant: { id: string } }[] };
  const layer: EquipmentEvidenceLayer = { schemaVersion: "1.2.1", releaseVersion: RELEASE, compatibleCatalogRelease: "v0.55.1",
    compatibleCatalogFingerprint: catalogPointer.catalog_payload_hash, market: "TR", vocabularyVersion: "1.1.0", cohortPolicyVersion: "1.0.0", collectionProtocolVersion: "1.0.1", canonicalIdentityPolicyVersion: "1.0.0", state: "PILOT_EMPTY",
    generatedAt: GENERATED_AT, featureDefinitions: EQUIPMENT_FEATURE_DEFINITIONS, intentAliases: EQUIPMENT_INTENT_ALIASES,
    assertions: [], packageVariantLinks: [], trimVariantLinks: [], researchLedger: [], reviewEvents: [], projections: [] };
  const raw = json(layer);
  const manifest: EquipmentEvidenceManifest = { releaseVersion: RELEASE, schemaVersion: "1.2.1", compatibleCatalogRelease: "v0.55.1",
    compatibleCatalogFingerprint: catalogPointer.catalog_payload_hash, payloadSha256: equipmentEvidenceSha256(raw), vocabularyVersion: "1.1.0", cohortPolicyVersion: "1.0.0", collectionProtocolVersion: "1.0.1", canonicalIdentityPolicyVersion: "1.0.0",
    featureCount: layer.featureDefinitions.length, aliasCount: layer.intentAliases.length, assertionCount: 0, packageLinkCount: 0, trimLinkCount: 0, researchLedgerCount: 0, reviewEventCount: 0,
    projectionCount: 0, variantCoverageCount: 0, validationStatus: "VALIDATED", generatedAt: GENERATED_AT,
    declaredLimitations: ["empty-pilot-release-no-vehicle-equipment-claims", "legacy-safety-feature-codes-not-migrated-without-exact-package-applicability", "decision-engine-integration-not-enabled", "source-assertions-must-reference-vehicle-evidence-source-registry-and-immutable-snapshots"] };
  const errors = validateEquipmentEvidenceCompatibility({ layer, manifest, rawPayload: raw, catalogRelease: "v0.55.1",
    catalogFingerprint: catalogPointer.catalog_payload_hash, catalogVariantIds: catalog.records.map((item) => item.variant.id) });
  if (errors.length) throw new Error(`EQUIPMENT_RELEASE_INVALID:${errors.map((item) => item.code).join(",")}`);
  const dir = path.join(ROOT, "data/production/equipment-evidence/releases", RELEASE); await mkdir(dir, { recursive: true });
  await immutable(path.join(dir, "equipment-evidence.json"), raw); await immutable(path.join(dir, "manifest.json"), json(manifest));
  const pointer = { state: "ACTIVE", activeEquipmentEvidenceRelease: RELEASE, compatibleCatalogRelease: "v0.55.1",
    compatibleCatalogFingerprint: catalogPointer.catalog_payload_hash, payloadSha256: manifest.payloadSha256, schemaVersion: "1.2.1" };
  await mkdir(path.join(ROOT, "data/production/equipment-evidence"), { recursive: true });
  await writeFile(path.join(ROOT, "data/production/equipment-evidence/active.json"), json(pointer), "utf8");
  console.log(JSON.stringify({ release: RELEASE, features: manifest.featureCount, aliases: manifest.aliasCount, checksum: manifest.payloadSha256 }));
}
void main();
