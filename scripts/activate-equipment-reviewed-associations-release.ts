import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, fingerprint } from "../features/vehicle-data/equipmentVerificationMaterialization";

const ROOT = process.cwd();
const RELEASE = "v1.4.0-reviewed-associations-catalog-v0.55.2-2026-08-18";
const ROLLBACK = "v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18";
const CANDIDATE = path.join(ROOT, "data/production/equipment-evidence/release-candidates", RELEASE);
const PRODUCTION = path.join(ROOT, "data/production/equipment-evidence/releases", RELEASE);
const ACTIVE = path.join(ROOT, "data/production/equipment-evidence/active.json");
const MODULE = path.join(ROOT, "data/production/equipment-evidence/activeEquipmentEvidence.generated.ts");
const EXPECTED_PAYLOAD = "sha256:56728c36d4faf08a1ba00a9e2f94d715be35d4c7053cd6995828d6813bb95032";
const EXPECTED_POINTER = "sha256:4ba2ec5ee76a09906092c19446a2b4846015ac5fd8d08708056b413a721ec8ed";
const EXPECTED_MODULE = "sha256:9c5971b14716bc503a649f99790655bdddc02f8513a6e13b6f198749f0166fea";
const EXPECTED_OLD_POINTER = "sha256:aec85d8f92c51ef3e5126a9f0dcf7db19bad3b9cb31a8851b58c2ef833950765";
const EXPECTED_OLD_MODULE = "sha256:e18f0eca09a69e44badb3716d91fedcf56e3be9cecb8eff9a555c5ffc0a02d95";
const RECORDED_AT = "2026-08-18T21:00:00.000Z";
const STATEMENT = `EQUIPMENT_OWNER_001 olarak
v1.4.0-reviewed-associations-catalog-v0.55.2-2026-08-18 release candidate’ının
Equipment Evidence active pointer’ına alınmasını onaylıyorum. Payload checksum’ı
sha256:56728c36d4faf08a1ba00a9e2f94d715be35d4c7053cd6995828d6813bb95032,
beklenen pointer checksum’ı
sha256:4ba2ec5ee76a09906092c19446a2b4846015ac5fd8d08708056b413a721ec8ed
ve beklenen generated module checksum’ı
sha256:9c5971b14716bc503a649f99790655bdddc02f8513a6e13b6f198749f0166fea
olarak doğrulanmıştır. Aktivasyonun SHADOW_AND_EXPLANATION_DISABLED yetkisiyle
yapılmasını kabul ediyorum. Tonale için eklenen 49 reviewed association
kaydının STANDARD, OPTIONAL, PACKAGE_DEPENDENT veya NOT_AVAILABLE kanıtı
olmadığını; filtreleme, sıralama, soru üretme veya confirmed kullanıcı
açıklaması yetkisi vermediğini kabul ediyorum. Rollback hedefinin
v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18 olmasını onaylıyorum.`;

const sha = (input: string | Buffer): `sha256:${string}` => `sha256:${createHash("sha256").update(input).digest("hex")}`;
const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8")) as T;
const writeJson = async (file: string, value: unknown) => writeFile(file, canonicalJson(value));

async function main() {
  const oldPointerRaw = await readFile(ACTIVE, "utf8"), oldModuleRaw = await readFile(MODULE, "utf8");
  if (sha(oldPointerRaw) !== EXPECTED_OLD_POINTER || sha(oldModuleRaw) !== EXPECTED_OLD_MODULE) throw new Error("PRE_ACTIVATION_ACTIVE_STATE_MISMATCH");
  const actors = await readJson<{ actors: Array<{ actorId: string; scope: string; status: string }> }>(path.join(ROOT, "data/production/equipment-evidence/governance/actor-registry.json"));
  if (!actors.actors.some((item) => item.actorId === "EQUIPMENT_OWNER_001" && item.scope === "EQUIPMENT_EVIDENCE_ONLY" && item.status === "ACTIVE")) throw new Error("OWNER_ACTOR_INVALID");
  const candidateRaw = await readFile(path.join(CANDIDATE, "equipment-evidence-release-candidate.json"), "utf8");
  const candidate = JSON.parse(candidateRaw) as { decisionAuthority: string; compatibleCatalogRelease: string; compatibleCatalogFingerprint: string; verifiedAssertions: unknown[]; reviewedAssociations: unknown[]; verifiedTrimLinks: unknown[]; projections: Array<{ exactVariantId: string }> };
  const result = await readJson<Record<string, unknown>>(path.join(CANDIDATE, "materialization-result.json"));
  const approvals = await readJson<unknown[]>(path.join(CANDIDATE, "owner-approval-events.json"));
  const associations = await readJson<unknown[]>(path.join(CANDIDATE, "reviewed-association-materializations.json"));
  const newTrims = await readJson<unknown[]>(path.join(CANDIDATE, "verified-trim-link-materializations.json"));
  if (sha(candidateRaw) !== EXPECTED_PAYLOAD || result.approvalAttestationId !== "EE-OAA-8DECD3638D2DB7DC5957" || result.approvalAttestationChecksum !== "sha256:5abc99dae776017672b4d723ef0c5ddc11ebf2c03b2e22488199fe8b4ed27ca5") throw new Error("CANDIDATE_OR_ATTESTATION_MISMATCH");
  if (approvals.length !== 51 || associations.length !== 49 || newTrims.length !== 2 || candidate.verifiedAssertions.length !== 47 || candidate.verifiedTrimLinks.length !== 4 || candidate.projections.length !== 47 || candidate.projections.some((item) => ["54bbe431-a3c2-56d0-8177-cefdf0330bcb", "f12f742b-111c-54de-a006-61361fb1ae04"].includes(item.exactVariantId))) throw new Error("CANDIDATE_COUNTS_OR_TONALE_PROJECTION_INVALID");
  if (candidate.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED" || candidate.compatibleCatalogRelease !== "v0.55.2" || candidate.compatibleCatalogFingerprint !== "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f") throw new Error("CANDIDATE_AUTHORITY_OR_CATALOG_MISMATCH");
  const pointerRaw = await readFile(path.join(CANDIDATE, "proposed-active-pointer.json"), "utf8"), moduleRaw = await readFile(path.join(CANDIDATE, "proposed-activeEquipmentEvidence.generated.ts.txt"), "utf8");
  if (sha(pointerRaw) !== EXPECTED_POINTER || sha(moduleRaw) !== EXPECTED_MODULE) throw new Error("PROPOSED_ACTIVE_ARTIFACT_MISMATCH");

  const activationApprovalId = `EE-ACT-${fingerprint({ release: RELEASE, statement: STATEMENT }).slice(7, 27).toUpperCase()}`;
  const attestation = { activationApprovalId, ownerActorId: "EQUIPMENT_OWNER_001", normalizedApprovalStatement: STATEMENT,
    approvalStatementChecksum: sha(STATEMENT), releaseId: RELEASE, payloadChecksum: EXPECTED_PAYLOAD, expectedPointerChecksum: EXPECTED_POINTER,
    expectedGeneratedModuleChecksum: EXPECTED_MODULE, rollbackReleaseId: ROLLBACK, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED",
    recordedAt: RECORDED_AT, governancePolicyVersion: "1.0.0" };
  await mkdir(PRODUCTION, { recursive: true });
  const copies: Array<[string, string]> = [
    ["equipment-evidence-release-candidate.json", "equipment-evidence.json"], ["manifest.json", "manifest.json"], ["coverage-report.json", "coverage-report.json"],
    ["owner-approval-events.json", "owner-approval-events.json"], ["reviewed-association-materializations.json", "reviewed-association-materializations.json"],
    ["verified-trim-link-materializations.json", "verified-trim-link-materializations.json"], ["provenance-appendix.json", "provenance-appendix.json"],
    ["decision-neutrality-dry-run.json", "decision-neutrality-dry-run.json"], ["rollback-plan.json", "rollback-plan.json"], ["approval-attestation.json", "owner-approval-attestation.json"],
  ];
  for (const [source, target] of copies) await writeFile(path.join(PRODUCTION, target), await readFile(path.join(CANDIDATE, source)));
  await writeFile(path.join(PRODUCTION, "activation-approval-statement.txt"), `${STATEMENT}\n`);
  await writeJson(path.join(PRODUCTION, "activation-attestation.json"), attestation);
  if (sha(await readFile(path.join(PRODUCTION, "equipment-evidence.json"))) !== EXPECTED_PAYLOAD) throw new Error("PRODUCTION_PAYLOAD_MISMATCH");

  const pointerTmp = `${ACTIVE}.activation-tmp`, moduleTmp = `${MODULE}.activation-tmp`;
  try {
    await writeFile(pointerTmp, pointerRaw); await writeFile(moduleTmp, moduleRaw);
    if (sha(await readFile(pointerTmp)) !== EXPECTED_POINTER || sha(await readFile(moduleTmp)) !== EXPECTED_MODULE) throw new Error("ATOMIC_STAGING_HASH_MISMATCH");
    await rename(pointerTmp, ACTIVE); await rename(moduleTmp, MODULE);
    if (sha(await readFile(ACTIVE)) !== EXPECTED_POINTER || sha(await readFile(MODULE)) !== EXPECTED_MODULE) throw new Error("POST_ACTIVATION_HASH_MISMATCH");
  } catch (error) {
    await writeFile(ACTIVE, oldPointerRaw); await writeFile(MODULE, oldModuleRaw);
    await writeJson(path.join(PRODUCTION, "activation-failure.json"), { status: "FAILED_ROLLED_BACK", errorCode: error instanceof Error ? error.message : "UNKNOWN", rollbackReleaseId: ROLLBACK, sanitized: true, occurredAt: RECORDED_AT });
    throw error;
  }
  const activationResult = { status: "ACTIVATED", activationApprovalId, activationApprovalChecksum: fingerprint(attestation), releaseId: RELEASE,
    payloadChecksum: EXPECTED_PAYLOAD, activePointerChecksum: EXPECTED_POINTER, generatedModuleChecksum: EXPECTED_MODULE,
    rollbackReleaseId: ROLLBACK, rollbackPointerChecksum: EXPECTED_OLD_POINTER, rollbackGeneratedModuleChecksum: EXPECTED_OLD_MODULE,
    evidenceTiers: { verifiedAssertions: 47, reviewedAssociations: 49, verifiedTrimLinks: 4, availabilityProjections: 47, tonaleAvailabilityProjections: 0 },
    coverageTiers: { verifiedAssertionCoveredVariants: 2, associationOnlyCoveredVariants: 2, uncoveredVariants: 562, totalCatalogVariants: 566 },
    decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", decisionImpact: "ZERO", activatedAt: RECORDED_AT };
  await writeJson(path.join(PRODUCTION, "activation-result.json"), activationResult);
  console.log(JSON.stringify(activationResult, null, 2));
}

void main();
