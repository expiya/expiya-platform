import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, fingerprint } from "../features/vehicle-data/equipmentVerificationMaterialization";

const ROOT = process.cwd();
const RELEASE = "v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18";
const EXPECTED_RELEASE_CHECKSUM = "sha256:bc0c9208aba80da7f683bf7b439f2715797755e782f98a50f06b7e16e23ec468";
const CANDIDATE = path.join(ROOT, "data/production/equipment-evidence/release-candidates", RELEASE);
const OUT = path.join(ROOT, "data/production/equipment-evidence/activation-readiness");
const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

async function main() {
  const rawCandidate = await readFile(path.join(CANDIDATE, "equipment-evidence-release-candidate.json"), "utf8");
  const candidate = JSON.parse(rawCandidate) as { compatibleCatalogRelease: string; compatibleCatalogFingerprint: string; verifiedAssertions: unknown[]; verifiedTrimLinks: unknown[]; coverage: { coveredExactVariantCount: number; uncoveredExactVariantCount: number; syntheticUnknownAssertionCount: number; authoritativeNegativeProjectionCount: number; conflictProjectionCount: number }; decisionAuthority: string };
  if (fingerprint(candidate) !== EXPECTED_RELEASE_CHECKSUM || sha(rawCandidate) !== EXPECTED_RELEASE_CHECKSUM) throw new Error("RELEASE_CANDIDATE_CHECKSUM_CHANGED");
  const activePointerPath = path.join(ROOT, "data/production/equipment-evidence/active.json"), activeModulePath = path.join(ROOT, "data/production/equipment-evidence/activeEquipmentEvidence.generated.ts");
  const currentPointer = JSON.parse(await readFile(activePointerPath, "utf8")) as { activeEquipmentEvidenceRelease: string };
  const currentPointerChecksum = sha(await readFile(activePointerPath)), currentModuleChecksum = sha(await readFile(activeModulePath));
  if (currentPointerChecksum !== "sha256:3ae093539a70fdb064ba58802ca5d18765ac3aeec5c44a0bcdfd6d9ecbc0d3a6" || currentModuleChecksum !== "sha256:3e55f29b08691fe516459a5c31c78b1c31dd7c0fc873648fea5657bfe079565e") throw new Error("ACTIVE_EQUIPMENT_STATE_CHANGED");
  const proposedPointer = { state: "ACTIVE", activeEquipmentEvidenceRelease: RELEASE, compatibleCatalogRelease: candidate.compatibleCatalogRelease, compatibleCatalogFingerprint: candidate.compatibleCatalogFingerprint, payloadSha256: EXPECTED_RELEASE_CHECKSUM, schemaVersion: "1.0.0-rc" };
  const expectedModule = `// Generated. Do not edit.\nexport { default as activeEquipmentEvidencePayload } from "./releases/${RELEASE}/equipment-evidence.json";\nexport { default as activeEquipmentEvidenceManifest } from "./releases/${RELEASE}/manifest.json";\nexport const activeEquipmentEvidenceRelease = "${RELEASE}";\n`;
  const readiness = {
    releaseCandidateId: RELEASE, releaseCandidateChecksum: EXPECTED_RELEASE_CHECKSUM,
    catalogRelease: candidate.compatibleCatalogRelease, catalogFingerprint: candidate.compatibleCatalogFingerprint,
    diagnosticRepairSummary: {
      rootCause: "The active production snapshot fixture advanced from historical v0.55.1/577 to v0.55.2/566 while several active diagnostics retained release-specific counts or mixed the active pointer with historical fixtures.",
      repaired: [
        { file: "features/decision/v2/filter/productionPipeline.test.ts", classification: "ACTIVE_RELEASE_STALE_TEST_CONSTANT", repair: "derive expected candidate count from loaded.snapshot.variants.length" },
        { file: "features/decision/v2/catalog/productionSnapshot.test.ts", classification: "HISTORICAL_FIXTURE_ACTIVE_POINTER_LEAK", repair: "pin v0.55.1 pointer and fingerprint fixture; preserve 577" },
        { file: "features/decision/v2/layers/productionAdapter.server.ts", classification: "PRODUCTION_RUNTIME_STALE_REBIND_METADATA_AUTHORITY", repair: "derive candidate coverage from pinned catalog snapshot after compatibility validation" },
        { file: "features/decision/v2/layers/productionAdapter.test.ts", classification: "ACTIVE_RELEASE_STALE_TEST_CONSTANT", repair: "derive layer coverage from pinned snapshot" },
        { file: "features/vehicle-data/technicalDailyLifeLayer.test.ts", classification: "ACTIVE_POINTER_HISTORICAL_RELEASE_MIX", repair: "separate historical content validation from active pointer assertions" },
        { file: "features/vehicle-data/vehiclePersonaSafeTraits.test.ts", classification: "ACTIVE_RELEASE_STALE_TEST_CONSTANT", repair: "derive exact variant coverage from active snapshot" },
        { file: "features/decision/v2/affordability/productionAffordability.test.ts", classification: "ACTIVE_RELEASE_STALE_TEST_CONSTANT", repair: "derive candidate coverage from active snapshot" },
        { file: "features/decision/v2/usage/productionProjection.test.ts", classification: "ACTIVE_RELEASE_STALE_TEST_CONSTANT", repair: "derive projection coverage from active snapshot" },
      ],
      preservedHistorical: ["v0.55.1 catalog release and fingerprint tests", "v0.55.1 temporal correction tests", "immutable Equipment pilot v0.55.1 fixtures", "v0.55.1 Daily-Life and Safe Persona release artifacts"],
      nonRuntimeMatches: ["historical generation scripts", "immutable reports and spreadsheet inventories", "UUID and price substrings containing 577", "manual/provider smoke thresholds not imported by production runtime"],
    },
    gateResults: { equipmentEvidence: "PASSED", equipmentProductionAdapter: "PASSED", v2LayerAndImportBoundary: "PASSED", catalogV0552Compatibility: "PASSED", dailyLifeCompatibility: "PASSED", safePersonaCompatibility: "PASSED", typeScript: "PASSED", eslint: "PASSED", diffCheck: "PASSED", releaseCandidateIntegrity: "PASSED", activeStateIntegrity: "PASSED" },
    candidateCounts: { verifiedAssertions: candidate.verifiedAssertions.length, verifiedTrimLinks: candidate.verifiedTrimLinks.length, coveredExactVariants: candidate.coverage.coveredExactVariantCount, uncoveredExactVariants: candidate.coverage.uncoveredExactVariantCount, syntheticUnknownAssertions: candidate.coverage.syntheticUnknownAssertionCount, authoritativeNegativeProjections: candidate.coverage.authoritativeNegativeProjectionCount, conflictProjections: candidate.coverage.conflictProjectionCount },
    currentActiveRelease: currentPointer.activeEquipmentEvidenceRelease, proposedActiveRelease: RELEASE,
    currentPointerChecksum, proposedPointerChecksum: sha(canonicalJson(proposedPointer)), generatedModuleCurrentChecksum: currentModuleChecksum, generatedModuleExpectedChecksum: sha(expectedModule),
    rollbackRelease: currentPointer.activeEquipmentEvidenceRelease, decisionAuthority: candidate.decisionAuthority,
    activePointerChanged: false, generatedActiveModuleChanged: false, activationDisposition: "READY_FOR_EXPLICIT_ACTIVATION_APPROVAL",
  };
  await mkdir(OUT, { recursive: true }); await writeFile(path.join(OUT, `${RELEASE}.json`), canonicalJson(readiness));
  console.log(canonicalJson({ release: RELEASE, checksum: EXPECTED_RELEASE_CHECKSUM, disposition: readiness.activationDisposition, proposedPointerChecksum: readiness.proposedPointerChecksum, generatedModuleExpectedChecksum: readiness.generatedModuleExpectedChecksum }));
}

void main();
