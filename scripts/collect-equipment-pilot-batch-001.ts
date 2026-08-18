import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createCanonicalTrimId } from "@/features/vehicle-data/equipmentCanonicalIdentity";
import { createEquipmentOperationalRecordId, EQUIPMENT_OPERATION_IDS } from "@/features/vehicle-data/equipmentCollectionProtocol";
import { EQUIPMENT_FEATURE_CODES } from "@/types/equipmentEvidence";

const ROOT = process.cwd(), STARTED_AT = "2026-08-18T17:38:38.000Z", COMPLETED_AT = "2026-08-18T17:41:08.000Z";
const WORK = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001");
const variants = [
  { exactVariantId: "6fd52c36-be09-5918-a70f-c5b8b3aba511", trim: "essential 5 koltuk Eco-G 120 EDC" },
  { exactVariantId: "ec80fc69-2bfd-566e-bbb8-ebd5ab1c9a36", trim: "expression 5 koltuk Eco-G 120 EDC" },
] as const;
const sources = [
  { sourceId: "SRC-000079", title: "Dacia Türkiye Yeni Jogger donanımları", sourceType: "OFFICIAL_EQUIPMENT_LIST", authority: "TR_DISTRIBUTOR", originalUrl: "https://www.dacia.com.tr/modeller/yeni-jogger/donanim.html", artifactReference: "data/cars/vehicle_evidence/source_snapshots/SRC-000079/2026-08-18/source.html", artifactSha256: "sha256:4245a3e6620b233bbda2704315a2e81baede861defa90278659044e12bfa13cc", finding: "Current official equipment page exposes Expression and Extreme grades, but does not establish either catalog EDC trim as an exact 5-seat version." },
  { sourceId: "SRC-000080", title: "Dacia Türkiye Yeni Jogger 5 koltuk configurator", sourceType: "OFFICIAL_CONFIGURATOR", authority: "OFFICIAL_CONFIGURATOR", originalUrl: "https://www.dacia.com.tr/modeller/yeni-jogger-5-koltuklu/configurator-v2.html", artifactReference: "data/cars/vehicle_evidence/source_snapshots/SRC-000080/2026-08-18/source.html", artifactSha256: "sha256:189b948d45e02a35612125b1a1e4e751f916a490fab5300e3519e6a3aa317ff8", finding: "Current 5-seat configurator identifies expression Eco-G 120 as BVM6/manual; it does not establish expression EDC or essential EDC." },
  { sourceId: "SRC-000081", title: "Dacia Türkiye Yeni Jogger version comparison", sourceType: "OFFICIAL_TECH_SPEC", authority: "TR_DISTRIBUTOR", originalUrl: "https://www.dacia.com.tr/modeller/yeni-jogger/karsilastirma.html", artifactReference: "data/cars/vehicle_evidence/source_snapshots/SRC-000081/2026-08-18/source.html", artifactSha256: "sha256:12e4edd98c431e58f6e3c658128f598409a0abc70098004988994ad55fc55cf9", finding: "Current comparison data identifies Eco-G 120 auto as Extreme 7-seat; it does not establish either catalog 5-seat EDC trim." },
] as const;
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (content: string | Buffer) => createHash("sha256").update(content).digest("hex");
async function deterministicWrite(file: string, content: string) { await writeFile(file, content, "utf8"); }

async function main() {
  await mkdir(path.join(WORK, "snapshots"), { recursive: true });
  const catalog = JSON.parse(await readFile(path.join(ROOT, "data/production/catalog/releases/v0.55.1/catalog.json"), "utf8")) as { records: { variant: { id: string; modelYear: { value: number } } }[] };
  for (const variant of variants) if (!catalog.records.some((item) => item.variant.id === variant.exactVariantId && item.variant.modelYear.value === 2026)) throw new Error(`BATCH_VARIANT_CATALOG_MISMATCH:${variant.exactVariantId}`);
  for (const source of sources) { const raw = await readFile(path.join(ROOT, source.artifactReference)); if (`sha256:${sha(raw)}` !== source.artifactSha256) throw new Error(`SOURCE_CHECKSUM_MISMATCH:${source.sourceId}`); }
  const sourceInventory = sources.map((source) => ({ ...source, sourceRegistryRelease: "v0.4.0-working-extension-ee-pilot-001", observedAt: STARTED_AT, publishedAt: null, effectiveAt: "2026-08-06T00:00:00.000Z", market: "TR", modelYearApplicability: [2026, 2026], snapshotResult: "CAPTURED", applicability: "CURRENT_JOGGER_FAMILY_OR_DIFFERENT_EXACT_CONFIGURATION_NOT_BATCH_EXACT_TRIM" }));
  const ledger = variants.flatMap((variant) => EQUIPMENT_FEATURE_CODES.map((featureCode) => ({ ledgerEntryId: createEquipmentOperationalRecordId("EE-RES", `${EQUIPMENT_OPERATION_IDS.researchCycleId}|${variant.exactVariantId}|${featureCode}`), exactVariantId: variant.exactVariantId, featureCode, disposition: "RESEARCHED_INCONCLUSIVE", researchCycleId: EQUIPMENT_OPERATION_IDS.researchCycleId, batchId: EQUIPMENT_OPERATION_IDS.firstBatchId, updatedAt: COMPLETED_AT, sourceIds: sources.map((item) => item.sourceId), assertionIds: [], collectorRole: "EQUIPMENT_COLLECTOR_PRIMARY", collectorInstanceId: "ACTOR-COLLECTOR-CODEX-CATALOG-001", inconclusiveReasonCodes: [variant.trim.startsWith("essential") ? "OFFICIAL_EXACT_TRIM_NOT_FOUND" : "OFFICIAL_EXPRESSION_TRANSMISSION_MISMATCH", "FAMILY_OR_OTHER_CONFIGURATION_EVIDENCE_NOT_PROJECTABLE"] })));
  const comparison = EQUIPMENT_FEATURE_CODES.map((featureCode) => ({ featureCode, status: "INCONCLUSIVE_FOR_BOTH", essentialExactVariantId: variants[0].exactVariantId, expressionExactVariantId: variants[1].exactVariantId, essentialAssertionIds: [], expressionAssertionIds: [], reason: "No official source establishes the feature for either exact 5-seat Eco-G 120 EDC trim; no inheritance or absence inference is permitted." }));
  const trimIdentityDrafts = variants.map((variant) => ({ exactVariantId: variant.exactVariantId, catalogTrim: variant.trim, deterministicCandidateCanonicalTrimId: createCanonicalTrimId({ market: "TR", brand: "Dacia", modelFamily: "Jogger", modelYear: 2026, trimName: variant.trim, configurationIdentity: variant.exactVariantId }), linkStatus: "NOT_CREATED", reason: "OFFICIAL_EXACT_TRIM_MATCH_NOT_ESTABLISHED" }));
  const registry = sourceInventory.map(({ sourceId, title, sourceType, originalUrl, market, publishedAt, observedAt, authority, artifactSha256, artifactReference, finding }) => ({ source_id: sourceId, publisher: "Dacia Türkiye", source_title: title, source_type: sourceType, source_url: originalUrl, market, publication_date: publishedAt, retrieved_at: observedAt, authority_class: authority, source_status: "WORKING_BATCH", notes: finding, source_url_canonical: originalUrl, source_version_label: "observed-2026-08-18", source_observed_at: observedAt, source_content_hash: artifactSha256.replace("sha256:", ""), source_snapshot_ref: artifactReference }));
  const files: Record<string, unknown> = {
    "source-inventory.json": sourceInventory, "source-registry-extension.json": { baseRegistryRelease: "v0.4.0", extensionId: "v0.4.0-working-extension-ee-pilot-001", records: registry },
    "research-ledger.json": ledger, "assertions.json": [], "trim-links.json": [], "trim-identity-drafts.json": trimIdentityDrafts,
    "package-links.json": [], "review-events.json": [], "trim-comparison.json": comparison,
    "pilot-lifecycle.json": { pilotId: EQUIPMENT_OPERATION_IDS.pilotId, lifecycleState: "COLLECTING", researchStartedAt: STARTED_AT, completedAt: null },
    "batch-lifecycle.json": { batchId: EQUIPMENT_OPERATION_IDS.firstBatchId, lifecycleState: "SECOND_REVIEW_REQUIRED", researchStartedAt: STARTED_AT, collectionCompletedAt: COMPLETED_AT, completedAt: null, collectorRole: "EQUIPMENT_COLLECTOR_PRIMARY", collectorInstanceId: "ACTOR-COLLECTOR-CODEX-CATALOG-001" },
    "snapshots/index.json": sources.map(({ sourceId, artifactReference, artifactSha256 }) => ({ sourceId, canonicalArtifactReference: artifactReference, artifactSha256 })),
  };
  for (const [name, value] of Object.entries(files)) await deterministicWrite(path.join(WORK, name), json(value));
  const report = `# EE-PILOT-001-BATCH-001 Collection Report\n\n- Scope: 2 exact variants × 51 features = 102 dispositions\n- Collector: EQUIPMENT_COLLECTOR_PRIMARY / ACTOR-COLLECTOR-CODEX-CATALOG-001\n- Result: 102 RESEARCHED_INCONCLUSIVE; 0 assertions; 0 trim links; 0 package links; 0 conflicts\n- Official snapshots: 3, all checksum-verified\n- Exact-trim conclusion: current official sources expose Expression manual and Extreme automatic configurations, but neither catalog 5-seat Eco-G 120 EDC trim is established.\n- Safety decision: model-family and other-configuration equipment was not projected. Missing mention was not converted to NOT_AVAILABLE.\n- Review state: batch SECOND_REVIEW_REQUIRED; pilot remains COLLECTING.\n`;
  await deterministicWrite(path.join(WORK, "collection-report.md"), report);
  const serialized = Object.fromEntries(await Promise.all([...Object.keys(files), "collection-report.md"].sort().map(async (name) => [name, sha(await readFile(path.join(WORK, name), "utf8"))])));
  await deterministicWrite(path.join(WORK, "checksums.json"), json(serialized));
  console.log(JSON.stringify({ batchId: EQUIPMENT_OPERATION_IDS.firstBatchId, dispositions: ledger.length, inconclusive: ledger.length, assertions: 0, trimLinks: 0, packageLinks: 0, snapshots: sources.length }));
}
void main();
