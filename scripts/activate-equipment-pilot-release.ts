import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { approvalManifestChecksum, authorizationStatementHash, type EquipmentApprovalManifest, type EquipmentOwnerActorRecord } from "../features/vehicle-data/equipmentOwnerGovernance";
import { canonicalJson, fingerprint } from "../features/vehicle-data/equipmentVerificationMaterialization";

const ROOT = process.cwd(), RELEASE = "v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18";
const CANDIDATE = path.join(ROOT, "data/production/equipment-evidence/release-candidates", RELEASE);
const RELEASES = path.join(ROOT, "data/production/equipment-evidence/releases"), PRODUCTION = path.join(RELEASES, RELEASE);
const GOVERNANCE = path.join(ROOT, "data/production/equipment-evidence/governance/activations");
const POINTER = path.join(ROOT, "data/production/equipment-evidence/active.json"), MODULE = path.join(ROOT, "data/production/equipment-evidence/activeEquipmentEvidence.generated.ts");
const RELEASE_SHA = "sha256:bc0c9208aba80da7f683bf7b439f2715797755e782f98a50f06b7e16e23ec468", POINTER_SHA = "sha256:aec85d8f92c51ef3e5126a9f0dcf7db19bad3b9cb31a8851b58c2ef833950765", MODULE_SHA = "sha256:e18f0eca09a69e44badb3716d91fedcf56e3be9cecb8eff9a555c5ffc0a02d95";
const OLD_POINTER_SHA = "sha256:3ae093539a70fdb064ba58802ca5d18765ac3aeec5c44a0bcdfd6d9ecbc0d3a6", OLD_MODULE_SHA = "sha256:3e55f29b08691fe516459a5c31c78b1c31dd7c0fc873648fea5657bfe079565e";
const AT = "2026-08-18T22:45:00.000Z", POLICY = "1.0.0";
const STATEMENT = `EQUIPMENT_OWNER_001 olarak
v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18 release candidate’ının
Equipment Evidence active pointer’ına alınmasını onaylıyorum. Release
checksum’ı
sha256:bc0c9208aba80da7f683bf7b439f2715797755e782f98a50f06b7e16e23ec468,
beklenen pointer checksum’ı
sha256:aec85d8f92c51ef3e5126a9f0dcf7db19bad3b9cb31a8851b58c2ef833950765
ve beklenen generated module checksum’ı
sha256:e18f0eca09a69e44badb3716d91fedcf56e3be9cecb8eff9a555c5ffc0a02d95
olarak doğrulanmıştır. Aktivasyonun SHADOW_AND_EXPLANATION_DISABLED
yetkisiyle yapılmasını; Equipment verisinin filtreleme, sıralama, soru
üretme veya kullanıcı açıklamasında kullanılmamasını kabul ediyorum.
Rollback hedefinin v1.2.2-catalog-v0.55.2-2026-08-18 olmasını onaylıyorum.
`;
const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8")) as T;

async function main() {
  const oldPointer = await readFile(POINTER), oldModule = await readFile(MODULE);
  if (sha(oldPointer) !== OLD_POINTER_SHA || sha(oldModule) !== OLD_MODULE_SHA) throw new Error("PREACTIVATION_ACTIVE_STATE_MISMATCH");
  const actor = (await readJson<{ actors: EquipmentOwnerActorRecord[] }>(path.join(ROOT, "data/production/equipment-evidence/governance/actor-registry.json"))).actors.find((item) => item.actorId === "EQUIPMENT_OWNER_001");
  if (!actor || actor.status !== "ACTIVE" || actor.scope !== "EQUIPMENT_EVIDENCE_ONLY") throw new Error("OWNER_ACTOR_INVALID");
  const authorization = await readFile(path.join(ROOT, "data/production/equipment-evidence/governance/attestations/EQUIPMENT_OWNER_001-v1.txt"), "utf8");
  if (authorizationStatementHash(authorization) !== actor.authorizationStatementHash) throw new Error("OWNER_AUTHORIZATION_INVALID");
  const approvalManifest = await readJson<EquipmentApprovalManifest>(path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001/owner-governance/EE-OWNER-APPROVAL-MANIFEST-001/approval-manifest.json"));
  const { manifestChecksum, ...approvalPayload } = approvalManifest;
  if (manifestChecksum !== "sha256:f35e41f2882afc35a3d31eb0e9b918135c4c4ca82b4c9b6515f8447379f118bc" || approvalManifestChecksum(approvalPayload) !== manifestChecksum) throw new Error("OWNER_APPROVAL_MANIFEST_INVALID");
  const [events, assertions, links] = await Promise.all([readJson<unknown[]>(path.join(CANDIDATE, "owner-approval-events.json")), readJson<unknown[]>(path.join(CANDIDATE, "verified-assertion-materializations.json")), readJson<unknown[]>(path.join(CANDIDATE, "verified-trim-link-materializations.json"))]);
  if (events.length !== 49 || assertions.length !== 47 || links.length !== 2) throw new Error("APPROVAL_OR_MATERIALIZATION_COUNT_INVALID");
  const candidateRaw = await readFile(path.join(CANDIDATE, "equipment-evidence-release-candidate.json"));
  const candidate = JSON.parse(candidateRaw.toString("utf8")) as { releaseCandidateId: string; compatibleCatalogRelease: string; compatibleCatalogFingerprint: string; decisionAuthority: string; featureDefinitions: unknown[]; intentAliases: unknown[]; projections: unknown[]; coverage: { coveredExactVariantCount: number; uncoveredExactVariantCount: number } };
  if (sha(candidateRaw) !== RELEASE_SHA || fingerprint(candidate) !== RELEASE_SHA || candidate.releaseCandidateId !== RELEASE || candidate.compatibleCatalogRelease !== "v0.55.2" || candidate.compatibleCatalogFingerprint !== "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f" || candidate.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED" || candidate.coverage.coveredExactVariantCount !== 2 || candidate.coverage.uncoveredExactVariantCount !== 564) throw new Error("RELEASE_CANDIDATE_INVALID");
  const current = JSON.parse(oldPointer.toString("utf8")) as { activeEquipmentEvidenceRelease: string }; if (current.activeEquipmentEvidenceRelease !== "v1.2.2-catalog-v0.55.2-2026-08-18") throw new Error("ROLLBACK_RELEASE_NOT_ACTIVE");
  const statementChecksum = authorizationStatementHash(STATEMENT), activationApprovalId = `EE-ACT-${fingerprint({ actorId: actor.actorId, release: RELEASE, releaseChecksum: RELEASE_SHA, statementChecksum }).slice(7, 27).toUpperCase()}`;
  const attestation = { activationApprovalId, ownerActorId: actor.actorId, normalizedApprovalStatement: STATEMENT, approvalStatementChecksum: statementChecksum, releaseId: RELEASE, releaseChecksum: RELEASE_SHA, expectedPointerChecksum: POINTER_SHA, expectedGeneratedModuleChecksum: MODULE_SHA, rollbackReleaseId: current.activeEquipmentEvidenceRelease, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", recordedAt: AT, governancePolicyVersion: POLICY, authorityBoundary: "EQUIPMENT_ACTIVE_SELECTION_ONLY_NO_DECISION_ENGINE_AUTHORITY" };
  const activationDir = path.join(GOVERNANCE, activationApprovalId); await mkdir(activationDir, { recursive: true });
  await writeFile(path.join(activationDir, "activation-approval-statement.txt"), STATEMENT); await writeFile(path.join(activationDir, "activation-attestation.json"), canonicalJson(attestation));
  const productionManifest = { releaseVersion: RELEASE, schemaVersion: "1.2.1", compatibleCatalogRelease: "v0.55.2", compatibleCatalogFingerprint: candidate.compatibleCatalogFingerprint, payloadSha256: RELEASE_SHA, vocabularyVersion: "1.1.0", cohortPolicyVersion: "1.0.0", collectionProtocolVersion: "1.0.1", canonicalIdentityPolicyVersion: "1.0.0", featureCount: candidate.featureDefinitions.length, aliasCount: candidate.intentAliases.length, assertionCount: assertions.length, packageLinkCount: 0, trimLinkCount: links.length, researchLedgerCount: 0, reviewEventCount: events.length, projectionCount: candidate.projections.length, variantCoverageCount: candidate.coverage.coveredExactVariantCount, validationStatus: "VALIDATED", generatedAt: AT, declaredLimitations: ["pilot-verified-data", "decision-authority-shadow-and-explanation-disabled", `activation-approval:${activationApprovalId}`, `rollback-release:${current.activeEquipmentEvidenceRelease}`] };
  const tempRelease = await mkdtemp(path.join(RELEASES, ".activation-"));
  try {
    await writeFile(path.join(tempRelease, "equipment-evidence.json"), candidateRaw); await writeFile(path.join(tempRelease, "manifest.json"), canonicalJson(productionManifest));
    for (const name of ["owner-approval-events.json", "verified-assertion-materializations.json", "verified-trim-link-materializations.json", "approval-attestation.json", "historical-audit-integrity.json", "coverage-report.json", "rollback-plan.json"]) await writeFile(path.join(tempRelease, name), await readFile(path.join(CANDIDATE, name)));
    await writeFile(path.join(tempRelease, "activation-attestation.json"), canonicalJson(attestation));
    if (sha(await readFile(path.join(tempRelease, "equipment-evidence.json"))) !== RELEASE_SHA) throw new Error("PRODUCTION_PAYLOAD_MISMATCH");
    try { const existing = await readFile(path.join(PRODUCTION, "equipment-evidence.json")); if (sha(existing) !== RELEASE_SHA) throw new Error("PRODUCTION_RELEASE_COLLISION"); await rm(tempRelease, { recursive: true }); }
    catch (error) { if (error instanceof Error && error.message === "PRODUCTION_RELEASE_COLLISION") throw error; await rename(tempRelease, PRODUCTION); }
  } catch (error) { await rm(tempRelease, { recursive: true, force: true }); throw error; }
  const pointerRaw = canonicalJson({ state: "ACTIVE", activeEquipmentEvidenceRelease: RELEASE, compatibleCatalogRelease: candidate.compatibleCatalogRelease, compatibleCatalogFingerprint: candidate.compatibleCatalogFingerprint, payloadSha256: RELEASE_SHA, schemaVersion: "1.0.0-rc" });
  const moduleRaw = `// Generated. Do not edit.\nexport { default as activeEquipmentEvidencePayload } from "./releases/${RELEASE}/equipment-evidence.json";\nexport { default as activeEquipmentEvidenceManifest } from "./releases/${RELEASE}/manifest.json";\nexport const activeEquipmentEvidenceRelease = "${RELEASE}";\n`;
  if (sha(pointerRaw) !== POINTER_SHA || sha(moduleRaw) !== MODULE_SHA) throw new Error("PROPOSED_ACTIVE_ARTIFACT_CHECKSUM_MISMATCH");
  const pointerTemp = `${POINTER}.activation-tmp`, moduleTemp = `${MODULE}.activation-tmp`;
  await writeFile(pointerTemp, pointerRaw); await writeFile(moduleTemp, moduleRaw);
  try {
    await rename(pointerTemp, POINTER); await rename(moduleTemp, MODULE);
    if (sha(await readFile(POINTER)) !== POINTER_SHA || sha(await readFile(MODULE)) !== MODULE_SHA) throw new Error("POST_ACTIVATION_CHECKSUM_MISMATCH");
  } catch (error) {
    await writeFile(POINTER, oldPointer); await writeFile(MODULE, oldModule); await rm(pointerTemp, { force: true }); await rm(moduleTemp, { force: true });
    await writeFile(path.join(activationDir, "activation-result.json"), canonicalJson({ status: "FAILED_ROLLED_BACK", errorClass: error instanceof Error ? error.message.split(":")[0] : "UNKNOWN", activePointerRestored: true, generatedModuleRestored: true, releaseRetained: true, recordedAt: AT })); throw error;
  }
  const result = { status: "ACTIVATED", activationApprovalId, releaseId: RELEASE, releaseChecksum: RELEASE_SHA, activePointerChecksum: POINTER_SHA, generatedModuleChecksum: MODULE_SHA, catalogCompatibility: "READY", verifiedAssertionCount: 47, verifiedTrimLinkCount: 2, coveredExactVariantCount: 2, uncoveredExactVariantCount: 564, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", rollbackReleaseId: current.activeEquipmentEvidenceRelease, activatedAt: AT };
  await writeFile(path.join(activationDir, "activation-result.json"), canonicalJson(result)); console.log(canonicalJson(result));
}

void main();
