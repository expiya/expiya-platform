import { readFile } from "node:fs/promises";
import path from "node:path";

import { createHash } from "node:crypto";

import { loadActiveEquipmentEvidenceStatus } from "@/features/vehicle-data/equipmentEvidenceResolver";
import { parseEquipmentEvidenceLayer, parseEquipmentEvidenceManifest } from "@/features/vehicle-data/equipmentEvidenceSchema";
import { validateEquipmentEvidenceCompatibility } from "@/features/vehicle-data/validateEquipmentEvidenceLayer";

async function main() {
  const root = process.cwd();
  const pointer = JSON.parse(await readFile(path.join(root, "data/production/equipment-evidence/active.json"), "utf8")) as { activeEquipmentEvidenceRelease: string; compatibleCatalogRelease: string; compatibleCatalogFingerprint: string; payloadSha256: string; schemaVersion: string };
  const catalogPointer = JSON.parse(await readFile(path.join(root, "data/production/catalog/active.json"), "utf8")) as { active_catalog_release_version: string; catalog_payload_hash: string };
  const dir = path.join(root, "data/production/equipment-evidence/releases", pointer.activeEquipmentEvidenceRelease);
  const [raw, rawManifest, rawCatalog] = await Promise.all([readFile(path.join(dir, "equipment-evidence.json"), "utf8"), readFile(path.join(dir, "manifest.json"), "utf8"), readFile(path.join(root, `data/production/catalog/releases/v${catalogPointer.active_catalog_release_version}/catalog.json`), "utf8")]);
  const manifest = parseEquipmentEvidenceManifest(JSON.parse(rawManifest));
  const catalog = JSON.parse(rawCatalog) as { records: { variant: { id: string } }[] };
  const issues: { code: string }[] = [];
  if (pointer.schemaVersion === "1.2.1") {
    const layer = parseEquipmentEvidenceLayer(JSON.parse(raw));
    issues.push(...validateEquipmentEvidenceCompatibility({ layer, manifest, rawPayload: raw, catalogRelease: `v${catalogPointer.active_catalog_release_version}`,
      catalogFingerprint: catalogPointer.catalog_payload_hash, catalogVariantIds: catalog.records.map((item) => item.variant.id) }));
  } else {
    const status = loadActiveEquipmentEvidenceStatus();
    const checksum = `sha256:${createHash("sha256").update(raw).digest("hex")}`;
    if (pointer.schemaVersion !== "1.0.0-rc" || checksum !== pointer.payloadSha256 || status.catalogCompatibility !== "READY"
      || status.verifiedAssertionCount !== 47 || status.verifiedTrimLinkCount !== 2 || status.coveredExactVariantCount !== 2
      || status.uncoveredExactVariantCount !== catalog.records.length - 2 || status.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED"
      || status.hardFilterEligible || status.softPreferenceEnabled || status.questionGenerationEnabled || status.userExplanationEnabled) {
      issues.push({ code: "ACTIVE_PILOT_RELEASE_INVALID" });
    }
  }
  if (pointer.activeEquipmentEvidenceRelease !== manifest.releaseVersion || pointer.payloadSha256 !== manifest.payloadSha256
    || pointer.compatibleCatalogRelease !== manifest.compatibleCatalogRelease || pointer.compatibleCatalogFingerprint !== manifest.compatibleCatalogFingerprint) issues.push({ code: "ACTIVE_POINTER_MISMATCH" });
  if (issues.length) throw new Error(`ACTIVE_EQUIPMENT_EVIDENCE_INVALID:${issues.map((item) => item.code).join(",")}`);
  console.log(JSON.stringify({ status: "PASS", release: manifest.releaseVersion, features: manifest.featureCount, aliases: manifest.aliasCount,
    assertions: manifest.assertionCount, trimLinks: manifest.trimLinkCount, coverage: manifest.variantCoverageCount, checksum: manifest.payloadSha256 }));
}
void main();
